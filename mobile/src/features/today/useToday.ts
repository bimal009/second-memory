import { useCallback, useEffect, useState } from "react";
import type { TodayPayload } from "@/types";
import { api } from "@/api";
import { strings } from "@/constants/strings";

/** Today tab data with loading + error state. */
export function useToday() {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
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

  useEffect(() => {
    void load();
  }, [load]);

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
