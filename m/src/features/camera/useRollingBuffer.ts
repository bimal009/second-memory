import { useEffect, useState } from "react";
/** TODO(native): replace clock with rolling-buffer lifecycle. Never start while inactive.
 * UI only: this hook creates no files and records no audio/video.
 */
export function useRollingBuffer(active: boolean, minutes: number) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now(); const timer = setInterval(() => setSeconds(Math.min(minutes * 60, Math.floor((Date.now() - started) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [active, minutes]);
  return { active, seconds: active ? seconds : 0, capacity: minutes * 60 };
}
