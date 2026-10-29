import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export type CaptureStatus = "idle" | "recording" | "paused";

type CaptureSessionValue = {
  status: CaptureStatus;
  elapsedSec: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

const CaptureCtx = createContext<CaptureSessionValue | null>(null);

/**
 * App-wide capture state. Drives the RecordingBanner on every screen.
 *
 * TODO(backend): replace with real capture/recording lifecycle
 * (wake-word detection, encoder start/stop). UI only for now.
 */
export function CaptureSessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (status !== "recording") return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const start = useCallback(() => {
    setElapsedSec(0);
    setStatus("recording");
  }, []);

  const pause = useCallback(() => setStatus("paused"), []);
  const resume = useCallback(() => setStatus("recording"), []);
  const stop = useCallback(() => {
    setStatus("idle");
    setElapsedSec(0);
  }, []);

  const value = useMemo<CaptureSessionValue>(
    () => ({ status, elapsedSec, start, pause, resume, stop }),
    [status, elapsedSec, start, pause, resume, stop],
  );

  return <CaptureCtx.Provider value={value}>{children}</CaptureCtx.Provider>;
}

export function useCaptureSession(): CaptureSessionValue {
  const ctx = useContext(CaptureCtx);
  if (!ctx) {
    throw new Error("useCaptureSession must be used inside <CaptureSessionProvider>");
  }
  return ctx;
}

export function formatClock(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
