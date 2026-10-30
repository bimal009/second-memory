import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { usePreviewState } from "./previewState";
import type { AppSettings } from "@/types";
import { useCallback } from "react";
export function useMemoryQuery<T>(key: readonly unknown[], queryFn: () => Promise<T>) {
  const state = usePreviewState();
  return useQuery({ queryKey: ["second-memory", state, ...key], queryFn, retry: false });
}
export function useSettings() {
  const query = useMemoryQuery(["settings"], () => api.getSettings());
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (patch: Partial<AppSettings>) => api.updateSettings(patch), onSuccess: () => { void client.invalidateQueries({ queryKey: ["second-memory"] }); } });
  return { ...query, update: mutation.mutate, updateAsync: mutation.mutateAsync, updateError: mutation.error };
}
export function useRefreshMemories() {
  const client = useQueryClient();
  return useCallback(() => { void client.invalidateQueries({ queryKey: ["second-memory"] }); }, [client]);
}
