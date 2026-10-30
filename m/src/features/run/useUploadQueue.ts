import { useCallback, useEffect, useRef, useState } from "react";
import { api, usePreviewState } from "@/api/client";
import { useRefreshMemories } from "@/api/useMemoryQuery";
import type { PendingChunk } from "@/types/run";
/** TODO(native-upload): persist queue, upload files idempotently, delete each raw file only after acknowledgment. No files exist in this UI stub. */
export function useUploadQueue() {
  const pending = useRef<PendingChunk[]>([]); const busy = useRef(false); const live = useRef(true);
  const [waiting, setWaiting] = useState(0); const [uploaded, setUploaded] = useState<Record<string, number>>({});
  const [lastSaved, setLastSaved] = useState<Record<string, number>>({}); const [error, setError] = useState(false);
  const refresh = useRefreshMemories(); const preview = usePreviewState();
  const enqueue = useCallback((items: PendingChunk[]) => { pending.current.push(...items); setWaiting(pending.current.length); }, []);
  const pump = useCallback(async () => {
    if (busy.current || !pending.current.length) return; busy.current = true; const chunk = pending.current[0];
    try { await api.uploadChunk(chunk); pending.current = pending.current.filter(c => c.id !== chunk.id); if (live.current) { setUploaded(v => ({ ...v, [chunk.runId]: (v[chunk.runId] ?? 0) + 1 })); setLastSaved(v => ({ ...v, [chunk.runId]: Date.now() })); setError(false); refresh(); } }
    catch { if (live.current) setError(true); } finally { busy.current = false; if (live.current) setWaiting(pending.current.length); }
  }, [refresh]);
  useEffect(() => { live.current = true; void pump(); const interval = setInterval(() => { void pump(); }, 2000); return () => { live.current = false; clearInterval(interval); }; }, [pump, preview]);
  return { enqueue, pump, uploaded, lastSaved, error, waiting };
}
