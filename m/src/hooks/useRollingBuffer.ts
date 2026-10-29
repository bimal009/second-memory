import { useEffect, useMemo, useState } from "react";

/**
 * Mocks the always-on rolling video buffer that lives on-device.
 *
 * TODO(backend): real buffer management lives in the native recorder.
 * This hook only produces the numbers the UI represents:
 *  - `fullSec`          total buffer capacity (from settings.bufferMinutes)
 *  - `elapsedSec`       seconds since capture started
 *  - `keptSec`          seconds actually retained (capped at fullSec)
 */
export function useRollingBuffer(opts: {
  active: boolean;
  bufferMinutes: number;
  offsetSec?: number;
}) {
  const { active, bufferMinutes, offsetSec = 0 } = opts;
  const fullSec = useMemo(() => bufferMinutes * 60, [bufferMinutes]);
  const [sessionSec, setSessionSec] = useState(offsetSec);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(
      () => setSessionSec((s) => s + 1),
      1000,
    );
    return () => clearInterval(t);
  }, [active]);

  const elapsedSec = offsetSec + sessionSec;
  const keptSec = Math.min(elapsedSec, fullSec);
  const isFull = keptSec >= fullSec;

  return { fullSec, elapsedSec, keptSec, isFull };
}
