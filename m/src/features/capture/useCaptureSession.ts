import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraView } from "expo-camera";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { CAPTURE_MAX_MINUTES, CHUNK_DURATION_S, MIN_CHUNK_DURATION_S, type Capture, type CaptureStatus, type CreateChunkSchema, } from "@repo/types";
import { createCapture, endCapture, pauseCapture, resumeCapture } from "@/api/capture";
import { uploadChunk } from "@/api/chunk";
import { insertLocalChunk, markChunkStatus } from "@/lib/chunkDb";
type QueuedChunk = CreateChunkSchema & {
    id: string;
    capture_id: Capture["id"];
    uri: string;
};
type SessionPhase = "idle" | "starting" | Extract<CaptureStatus, "recording" | "paused"> | "stopping";
function clock(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
export function useCaptureSession(cameraRef: React.RefObject<CameraView | null>) {
    const [phase, setPhase] = useState<SessionPhase>("idle");
    const [capture, setCapture] = useState<Capture | null>(null);
    const [elapsedSec, setElapsedSec] = useState(0);
    const [chunksUploaded, setChunksUploaded] = useState(0);
    const [chunksPending, setChunksPending] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const phaseRef = useRef<SessionPhase>("idle");
    const captureRef = useRef<Capture | null>(null);
    const indexRef = useRef(0);
    const startedAtRef = useRef(0);
    const loopGen = useRef(0);
    const queueRef = useRef<QueuedChunk[]>([]);
    const pumping = useRef(false);
    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);
    useEffect(() => {
        if (phase !== "recording")
            return;
        const timer = setInterval(() => {
            setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 250);
        return () => clearInterval(timer);
    }, [phase]);
    const pumpUploads = useCallback(async () => {
        if (pumping.current)
            return;
        pumping.current = true;
        try {
            while (queueRef.current.length) {
                const job = queueRef.current[0];
                if (!job)
                    break;
                setChunksPending(queueRef.current.length);
                try {
                    await markChunkStatus(job.id, "uploading");
                    await uploadChunk(job.capture_id, {
                        uri: job.uri,
                        idx: job.idx,
                        started_at: job.started_at,
                        duration_s: job.duration_s,
                        lat: job.lat,
                        lng: job.lng,
                        accuracy_m: job.accuracy_m,
                        mime: "video/mp4",
                        name: `${job.idx}.mp4`,
                    });
                    await markChunkStatus(job.id, "uploaded");
                    queueRef.current.shift();
                    setChunksUploaded((n) => n + 1);
                    setChunksPending(queueRef.current.length);
                    setError(null);
                }
                catch (err) {
                    await markChunkStatus(job.id, "failed", err instanceof Error ? err.message : "upload failed");
                    setError(err instanceof Error ? err.message : "Upload failed");
                    break;
                }
            }
        }
        finally {
            pumping.current = false;
            setChunksPending(queueRef.current.length);
        }
    }, []);
    const enqueue = useCallback(async (job: QueuedChunk) => {
        queueRef.current.push(job);
        setChunksPending(queueRef.current.length);
        const started_at = job.started_at instanceof Date
            ? job.started_at.toISOString()
            : String(job.started_at);
        await insertLocalChunk({
            id: job.id,
            capture_id: job.capture_id,
            idx: job.idx,
            started_at,
            duration_s: job.duration_s ?? CHUNK_DURATION_S,
            path: job.uri,
            status: "pending",
            size: 0,
        }).catch(() => { });
        void pumpUploads();
    }, [pumpUploads]);
    const recordLoop = useCallback(async (active: Capture, generation: number) => {
        while (loopGen.current === generation &&
            phaseRef.current === "recording" &&
            captureRef.current?.id === active.id) {
            const cam = cameraRef.current;
            if (!cam)
                break;
            const remaining = CAPTURE_MAX_MINUTES * 60 -
                Math.floor((Date.now() - startedAtRef.current) / 1000);
            if (remaining < MIN_CHUNK_DURATION_S)
                break;
            const maxDuration = Math.min(CHUNK_DURATION_S, remaining);
            const chunkStarted = new Date();
            const idx = indexRef.current++;
            try {
                const stopTimer = setTimeout(() => {
                    void cam.stopRecording();
                }, maxDuration * 1000);
                const result = await cam.recordAsync({ maxDuration });
                clearTimeout(stopTimer);
                if (!result?.uri)
                    continue;
                if (loopGen.current !== generation)
                    break;
                const duration_s = Math.min(CHUNK_DURATION_S, Math.max(0, (Date.now() - chunkStarted.getTime()) / 1000));
                if (duration_s < MIN_CHUNK_DURATION_S)
                    continue;
                await enqueue({
                    id: `${active.id}-${idx}`,
                    capture_id: active.id,
                    uri: result.uri,
                    idx,
                    started_at: chunkStarted,
                    duration_s,
                });
            }
            catch {
                if (loopGen.current !== generation ||
                    phaseRef.current !== "recording") {
                    break;
                }
                setError("Recording hiccup — retrying");
                await new Promise((r) => setTimeout(r, 400));
            }
        }
    }, [cameraRef, enqueue]);
    const start = useCallback(async () => {
        if (phaseRef.current !== "idle" || !cameraRef.current)
            return;
        setPhase("starting");
        setError(null);
        setChunksUploaded(0);
        setChunksPending(0);
        setElapsedSec(0);
        indexRef.current = 0;
        queueRef.current = [];
        try {
            const created = await createCapture({ source: "phone" });
            captureRef.current = created;
            setCapture(created);
            startedAtRef.current = Date.now();
            const generation = ++loopGen.current;
            setPhase("recording");
            await activateKeepAwakeAsync("capture-session");
            void recordLoop(created, generation);
        }
        catch (err) {
            captureRef.current = null;
            setCapture(null);
            setPhase("idle");
            setError(err instanceof Error ? err.message : "Could not start capture");
        }
    }, [cameraRef, recordLoop]);
    const pause = useCallback(async () => {
        if (phaseRef.current !== "recording") {
            return;
        }
        loopGen.current += 1;
        try {
            cameraRef.current?.stopRecording();
        }
        catch {
        }
        setPhase("paused");
        const id = captureRef.current?.id;
        if (!id) {
            return;
        }
        try {
            const pausedCapture = await pauseCapture(id);
            setCapture(pausedCapture);
            captureRef.current = pausedCapture;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Could not pause capture");
        }
    }, [cameraRef]);
    const resume = useCallback(async () => {
        if (phaseRef.current !== "paused" || !captureRef.current) {
            return;
        }
        const active = captureRef.current;
        try {
            const resumed = await resumeCapture(active.id);
            setCapture(resumed);
            captureRef.current = resumed;
            const generation = ++loopGen.current;
            setPhase("recording");
            await activateKeepAwakeAsync("capture-session");
            void recordLoop(resumed, generation);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Could not resume capture");
        }
    }, [recordLoop]);
    const stop = useCallback(async () => {
        if (phaseRef.current !== "recording" && phaseRef.current !== "starting" && phaseRef.current !== "paused") {
            return;
        }
        setPhase("stopping");
        loopGen.current += 1;
        try {
            cameraRef.current?.stopRecording();
        }
        catch {
        }
        await deactivateKeepAwake("capture-session");
        const id = captureRef.current?.id;
        try {
            if (id) {
                const ended = await endCapture(id);
                setCapture(ended);
            }
            await pumpUploads();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Could not end capture");
        }
        finally {
            captureRef.current = null;
            setCapture(null);
            setPhase("idle");
        }
    }, [cameraRef, pumpUploads]);
    const toggle = useCallback(() => {
        if (phase === "idle")
            void start();
        else if (phase === "recording")
            void stop();
        else if (phase === "paused")
            void resume();
    }, [phase, start, stop, resume]);
    return {
        phase,
        capture,
        captureId: capture?.id ?? null,
        elapsedSec,
        elapsedLabel: clock(elapsedSec),
        chunksUploaded,
        chunksPending,
        error,
        clearError: () => setError(null),
        start,
        stop,
        pause,
        resume,
        toggle,
        recording: phase === "recording",
        paused: phase === "paused",
        busy: phase === "starting" || phase === "stopping",
    };
}
