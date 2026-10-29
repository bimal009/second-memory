import { useCallback, useEffect, useState } from "react";
import type { TodayPayload } from "@/types";
import { api } from "@/api";

/** Today tab data with loading + error state. */
export function useToday() {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    // Event-handler-driven reload: allowed to set state synchronously.
    setLoading(true);
    setError(false);
    try {
      setData(await api.getToday());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — setState only after the awaited fetch.
  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      try {
        const payload = await api.getToday();
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleReminder = useCallback(async (id: string, done: boolean) => {
    // Optimistic toggle; API is the seam to persist.
    setData((prev) =>
      prev
        ? {
            ...prev,
            reminders: prev.reminders.map((r) => (r.id === id ? { ...r, done } : r)),
          }
        : prev,
    );
    await api.setReminderDone(id, done);
  }, []);

  return { data, loading, error, reload: load, toggleReminder };
}
