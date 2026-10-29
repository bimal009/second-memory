import type { CaptureDraft, SessionResult } from "@/types/demo";

export type CaptureMode = "audio" | "video";
export type MediaFile = { uri: string; startedAt: number; endedAt: number; mode: CaptureMode };
export type UploadJob = MediaFile & {
  id: string; groupId: string; kind: "buffer" | "command" | "session";
  index: number; attempts: number; nextAttemptAt: number; acknowledged?: boolean;
  wifiOnly: boolean; windowStart?: number; windowEnd?: number;
};
export type SessionPhase = "idle" | "starting" | "recording" | "paused" | "uploading" | "summarizing" | "result";
export type SessionRecord = {
  id: string; mode: CaptureMode; phase: SessionPhase; elapsedMs: number;
  nextIndex: number; uploaded: number; bufferWasOn: boolean; resumeOnForeground: boolean;
  result?: SessionResult;
};
export type LocalIndex = {
  version: 1; segments: MediaFile[]; queue: UploadJob[]; session: SessionRecord | null;
  bufferWanted?: boolean;
  active?: { uri?: string; startedAt: number; mode: CaptureMode; kind: "command" | "session"; index?: number; sessionId?: string };
};
export type RecordingSnapshot = {
  ready: boolean; enabled: boolean; foreground: boolean; cameraGranted: boolean; microphoneGranted: boolean;
  bufferWanted: boolean; bufferRecording: boolean; bufferSeconds: number; bufferMessage: string;
  cameraMounted: boolean; owner: "none" | "buffer" | "command" | "session";
  commandPhase: "idle" | "preparing" | "recording" | "processing" | "plan";
  commandMode: CaptureMode; commandSeconds: number; gettingReady: boolean;
  plan: CaptureDraft | null; session: SessionRecord | null; sessionSeconds: number;
  pendingUploads: number; pendingSessionUploads: number; waitingForWifi: boolean;
  level: number; warning: string | null; error: string | null;
};
export type Take = { startedAt: number; uri?: string; done: Promise<MediaFile>; stop: () => Promise<void>; level?: () => number };
export interface MediaPort {
  mountCamera(): Promise<void>;
  releaseCamera(): Promise<void>;
  begin(mode: CaptureMode, maxSeconds: number): Promise<Take>;
  keepAwake(active: boolean): Promise<void>;
}
export interface MediaRepository {
  data: LocalIndex;
  load(): Promise<void>; save(): Promise<void>;
  retain(file: MediaFile, name: string, copy?: boolean): MediaFile;
  remove(uri: string): void;
}
export interface RecordingApi {
  upload(job: UploadJob): Promise<{ accepted: boolean }>;
  startSession(mode: CaptureMode): Promise<{ id: string }>;
  stopSession(id: string): Promise<unknown>;
  getSessionResult(id: string, mode: CaptureMode): Promise<SessionResult>;
  prepareCapture(mode: CaptureMode, windowSeconds: number): Promise<CaptureDraft>;
}
