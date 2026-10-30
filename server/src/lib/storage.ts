import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export const STORAGE_ROOT = resolve(process.env.STORAGE_ROOT ?? "storage");
export const CAPTURE_STORAGE_PATH = join(STORAGE_ROOT, "capture");

export const ensureDir = async (path: string) => {
  await mkdir(path, { recursive: true });
};

// Capture root — created when the capture is created:
// storage/capture/<captureId>/
export const captureDir = (captureId: string) =>
  join(CAPTURE_STORAGE_PATH, captureId);

export const ensureCaptureDir = (captureId: string) =>
  ensureDir(captureDir(captureId));

// Everything belonging to one chunk lives in the same folder:
// storage/capture/<captureId>/<chunkIdx>/video.mp4 + audio.wav + frames/
export const chunkDir = (captureId: string, idx: number) =>
  join(captureDir(captureId), String(idx));

export const ensureChunkDir = (captureId: string, idx: number) =>
  ensureDir(chunkDir(captureId, idx));

// Raw uploaded video (deleted after processing)
export const chunkPath = (captureId: string, idx: number) =>
  join(chunkDir(captureId, idx), "video.mp4");

// 16 kHz mono WAV extracted from the video's audio track (deleted after processing)
export const audioPath = (captureId: string, idx: number) =>
  join(chunkDir(captureId, idx), "audio.wav");

// Kept frames (stored)
export const frameDir = (captureId: string, idx: number) =>
  join(chunkDir(captureId, idx), "frames");

export const framePath = (captureId: string, idx: number, frameNo: number) =>
  join(frameDir(captureId, idx), `${frameNo}.jpg`);
