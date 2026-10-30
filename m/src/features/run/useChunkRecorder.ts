import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { useRefreshMemories } from "@/api/useMemoryQuery";
import type { ChunkLength, CaptureStatus, Run } from "@/types/run";
import type { MemoryLocation } from "@/types";
import { captureCopy as c } from "@/constants/strings";
import { completedDurations, initialClock, pauseClock, resumeClock, tickClock, type CaptureClock } from "./captureMachine";
import { useUploadQueue } from "./useUploadQueue";
/** TODO(recorder): one continuous camera stream, short chunks, no rolling buffer. This hook produces only mock metadata. */
export function useChunkRecorder(chunkLength: ChunkLength, keepLocal: boolean, location?: MemoryLocation) {
  const clock = useRef<CaptureClock>({ ...initialClock(0, chunkLength), status: "idle" });
  const run = useRef<Run | null>(null); const index = useRef(0); const busyRef = useRef(false); const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<CaptureClock>({ ...initialClock(0, chunkLength), status: "idle" }); const [error, setError] = useState(false); const [finished, setFinished] = useState<Run | null>(null);
  const queue = useUploadQueue(); const refresh = useRefreshMemories(); const locationRef = useRef(location); useEffect(() => { locationRef.current = location; }, [location]);
  const [runId, setRunId] = useState<string>(); const [now, setNow] = useState(0); const { enqueue } = queue;
  const publish = useCallback(() => setSnapshot({ ...clock.current }), []);
  const flush = useCallback((partial = false) => {
    const active = run.current; if (!active) return; const result = completedDurations(clock.current, partial); let seconds = clock.current.emittedSeconds;
    enqueue(result.durations.map(durationSec => { const item = { id: active.id + "-chunk-" + ++index.current, runId: active.id, index: index.current, seconds, durationSec, location: locationRef.current }; seconds += durationSec; return item; }));
    clock.current = { ...clock.current, emittedSeconds: result.emittedSeconds };
  }, [enqueue]);
  const stop = useCallback(async (showDetail = true) => {
    if (!run.current || busyRef.current || clock.current.status === "idle") return; busyRef.current = true; setBusy(true);
    clock.current = tickClock(clock.current, Date.now()); flush(true); clock.current = { ...clock.current, status: "idle" }; publish();
    try { const saved = await api.finishRun(run.current.id, Math.floor(clock.current.elapsedMs / 1000)); if (showDetail) setFinished(saved); setError(false); refresh(); }
    catch { clock.current = { ...clock.current, status: "error" }; publish(); setError(true); }
    finally { busyRef.current = false; setBusy(false); }
  }, [flush, publish, refresh]);
  useEffect(() => { const timer = setInterval(() => { setNow(Date.now()); if (clock.current.status !== "capturing") return; clock.current = tickClock(clock.current, Date.now()); flush(); publish(); if (clock.current.elapsedMs >= 3_600_000) void stop(); }, 500); return () => clearInterval(timer); }, [flush, publish, stop]);
  const start = async () => {
    if (clock.current.status !== "idle" || busyRef.current) return; busyRef.current = true; setBusy(true); setFinished(null);
    try { run.current = await api.beginRun(chunkLength, keepLocal); setRunId(run.current.id); index.current = 0; clock.current = initialClock(Date.now(), chunkLength); setError(false); publish(); refresh(); }
    catch { setError(true); } finally { busyRef.current = false; setBusy(false); }
  };
  const pause = useCallback((background = false) => { if (clock.current.status !== "capturing") return; clock.current = pauseClock(clock.current, Date.now(), background); flush(true); publish(); }, [flush, publish]);
  const resume = () => { if (!run.current || busyRef.current || clock.current.status === "idle") return; if (clock.current.elapsedMs >= 3_600_000) { void stop(); return; } clock.current = resumeClock(clock.current, Date.now()); setError(false); publish(); };
  const fail = useCallback(() => { if (clock.current.status !== "capturing") return; pause(); clock.current = { ...clock.current, status: "error" }; setError(true); publish(); }, [pause, publish]);
  const bookmark = async (note: string = c.rememberThis) => { if (!run.current || clock.current.status === "idle") return; const memory = await api.bookmarkRun(run.current.id, Math.floor(tickClock(clock.current, Date.now()).elapsedMs / 1000), note, locationRef.current); refresh(); return memory; };
  const elapsed = Math.floor(snapshot.elapsedMs / 1000);
  return { status: snapshot.status as CaptureStatus, elapsed, chunkLength: snapshot.status === "idle" ? chunkLength : snapshot.chunkLength, chunksUploaded: runId ? queue.uploaded[runId] ?? 0 : 0, chunksWaiting: queue.waiting, lastChunkAgo: runId && queue.lastSaved[runId] ? Math.max(0, Math.floor((now - queue.lastSaved[runId]) / 1000)) : null, warning: elapsed >= 2700, limit: elapsed >= 3600, busy, error, uploadError: queue.error, finished, clearFinished: () => setFinished(null), runId, start, pause, resume, stop, bookmark, fail };
}
