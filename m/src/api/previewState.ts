import { useSyncExternalStore } from "react";
import type { PreviewState } from "@/types/session";
const configured = process.env.EXPO_PUBLIC_MOCK_STATE;
let state: PreviewState = configured === "offline" || configured === "empty" || configured === "error" || configured === "denied" ? configured : "normal";
let offline = false;
const listeners = new Set<() => void>();
export function setPreviewState(next: PreviewState) { state = next; listeners.forEach(fn => fn()); }
export function setNetworkOffline(value: boolean) { if (offline !== value) { offline = value; listeners.forEach(fn => fn()); } }
export const getPreviewState = (): PreviewState => offline ? "offline" : state;
export function usePreviewState() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, getPreviewState, getPreviewState);
}
export async function mockDelay() {
  await new Promise(resolve => setTimeout(resolve, 400));
  const current = getPreviewState();
  if (current === "offline" || current === "error") throw new Error(current);
}
