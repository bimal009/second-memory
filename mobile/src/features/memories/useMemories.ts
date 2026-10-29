import { useCallback, useEffect, useState } from "react";
import type { Memory, MemoryFilterKey } from "@/types";
import { api } from "@/api";

export type MemoryGroup = {
  label: string;
  memories: Memory[];
};

/** List + search + filter for the Memories tab. Handles loading & error. */
export function useMemories() {
  const [filter, setFilter] = useState<MemoryFilterKey>("all");
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [groups, setGroups] = useState<MemoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    // Event-handler-driven reload: allowed to set state synchronously.
    setLoading(true);
    setError(false);
    try {
      const list = await api.listMemories({ query, filter });
      setMemories(list);
      setGroups(groupByDay(list));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filter, query]);

  // Load whenever filter/query change. All setState happens after the
  // awaited fetch, never synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await api.listMemories({ query, filter });
        if (cancelled) return;
        setMemories(list);
        setGroups(groupByDay(list));
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [filter, query]);

  const remove = useCallback(async (id: string) => {
    await api.deleteMemory(id);
    void refresh();
  }, [refresh]);

  return { filter, setFilter, query, setQuery, groups, memories, loading, error, refresh, remove };
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function groupByDay(list: Memory[]): MemoryGroup[] {
  const map = new Map<string, Memory[]>();
  for (const m of list) {
    const key = dayKey(m.createdAt);
    map.set(key, [...(map.get(key) ?? []), m]);
  }
  return [...map.entries()].map(([key, items]) => ({
    label: groupLabel(key, items[0]!.createdAt),
    memories: items,
  }));
}

function groupLabel(_key: string, iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
