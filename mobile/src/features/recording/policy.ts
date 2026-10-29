import type { CaptureMode, MediaFile } from "./types";

export const BUFFER_SECONDS = 120;
export const BUFFER_FILES = 12;
export const BUFFER_SEGMENT_SECONDS = 10;
export const COMMAND_SECONDS = 30;
export const SESSION_CHUNK_SECONDS = 30;
export const POST_ROLL_MS = 3000;
export const RETRY_DELAYS = [2000, 5000, 15000] as const;
export const retryDelay = (attempt: number) => RETRY_DELAYS[Math.min(Math.max(0, attempt - 1), 2)];
export const sessionLimit = (mode: CaptureMode) => mode === "video" ? 600 : 1800;
export function selectWindow(files: MediaFile[], start: number, end: number) {
  return files.filter(file => file.endedAt > start && file.startedAt < end).sort((a, b) => a.startedAt - b.startedAt);
}
export function retainWindow(files: MediaFile[], now: number) {
  return selectWindow(files, now - BUFFER_SECONDS * 1000, now + 1).slice(-BUFFER_FILES);
}
export function bufferedSeconds(files: MediaFile[], now: number) {
  return Math.min(BUFFER_SECONDS, files.reduce((sum, file) => sum + Math.max(0, Math.min(file.endedAt, now) - Math.max(file.startedAt, now - BUFFER_SECONDS * 1000)), 0) / 1000);
}
