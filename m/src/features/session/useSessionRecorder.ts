import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import type { Session } from "@/types/session";

/** TODO(native): one 480p low-bitrate video+audio recorder, 60s chunks.
 * TODO(upload): retry queue; delete each raw chunk ONLY after server acknowledgment.
 * UI-only clock/queue simulation: never requests a microphone, records, uploads or deletes files.
 */
export function useSessionRecorder(onReady: (session: Session) => void, keepLocal = false) {
  const [phase, setPhase] = useState<"idle" | "running" | "building" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [uploaded, setUploaded] = useState(0);
  const [waiting, setWaiting] = useState<number[]>([]);
  const [error, setError] = useState<unknown>();
  const startAt = useRef(0); const inFlight = useRef(false); const emitted = useRef(0);
  const secondsRef = useRef(0); const bookmarksRef = useRef<number[]>([]);
  const stop = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true; setPhase("building"); setError(undefined);
    try {
      const result = await api.saveSession(secondsRef.current, bookmarksRef.current, keepLocal);
      setPhase("idle"); onReady(result);
    } catch (e) { setError(e); setPhase("error"); }
    finally { inFlight.current = false; }
  }, [keepLocal, onReady]);
  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => {
      const elapsed = Math.min(3600, Math.floor((Date.now() - startAt.current) / 1000));
      secondsRef.current = elapsed; setSeconds(elapsed);
      const finished = Math.floor(elapsed / 60);
      if (finished > emitted.current) {
        const additions = Array.from({ length: finished - emitted.current }, (_, i) => emitted.current + i + 1);
        emitted.current = finished; setWaiting(q => [...q, ...additions]);
      }
      if (elapsed >= 3600) void stop();
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, stop]);
  useEffect(() => {
    if (!waiting.length) return;
    let alive = true;
    const timer = setTimeout(() => {
      void api.confirmChunk(waiting[0]).then(() => {
        if (!alive) return;
        setUploaded(n => n + 1); setWaiting(q => q.slice(1));
      }).catch(() => { if (alive) setWaiting(q => [...q]); });
    }, 1500);
    return () => { alive = false; clearTimeout(timer); };
  }, [waiting]);
  const start = () => {
    startAt.current = Date.now(); secondsRef.current = 0; emitted.current = 0; bookmarksRef.current = [];
    setSeconds(0); setBookmarks([]); setUploaded(0); setWaiting([]); setError(undefined); setPhase("running");
  };
  const bookmark = () => { bookmarksRef.current = [...bookmarksRef.current, secondsRef.current]; setBookmarks(bookmarksRef.current); };
  return { phase, seconds, bookmarks, uploaded, waiting: waiting.length, error, start, stop, bookmark, active: phase === "running", warning: seconds >= 2700 };
}
