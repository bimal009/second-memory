import type { CaptureStatus, ChunkLength } from "@/types/run";
export type CaptureClock = { status: CaptureStatus; elapsedMs: number; lastTick: number; chunkLength: ChunkLength; emittedSeconds: number };
export const initialClock = (now: number, chunkLength: ChunkLength): CaptureClock => ({ status: "capturing", elapsedMs: 0, lastTick: now, chunkLength, emittedSeconds: 0 });
export function tickClock(state: CaptureClock, now: number) {
  if (state.status !== "capturing") return state;
  return { ...state, elapsedMs: Math.min(3_600_000, state.elapsedMs + Math.max(0, now - state.lastTick)), lastTick: now };
}
export function pauseClock(state: CaptureClock, now: number, background = false): CaptureClock {
  return { ...tickClock(state, now), status: background ? "background_paused" : "paused" };
}
export function resumeClock(state: CaptureClock, now: number): CaptureClock { return { ...state, status: "capturing", lastTick: now }; }
export function completedDurations(state: CaptureClock, flush = false) {
  const seconds = Math.floor(state.elapsedMs / 1000); const durations: number[] = []; let cursor = state.emittedSeconds;
  while (seconds - cursor >= state.chunkLength) { durations.push(state.chunkLength); cursor += state.chunkLength; }
  if (flush && seconds > cursor) { durations.push(seconds - cursor); cursor = seconds; }
  return { durations, emittedSeconds: cursor };
}
