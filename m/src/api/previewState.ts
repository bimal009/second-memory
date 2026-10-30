import { useSyncExternalStore } from "react";
import type { PreviewState } from "@/types/session";
let state: PreviewState = "normal";
const listeners = new Set<() => void>();
export function setPreviewState(next: PreviewState) { state = next; listeners.forEach(fn => fn()); }
export const getPreviewState = () => state;
export function usePreviewState() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, getPreviewState, getPreviewState);
}
export async function mockDelay() {
  await new Promise(resolve => setTimeout(resolve, 400));
  if (state === "offline" || state === "error") throw new Error(state);
}
