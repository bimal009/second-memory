import { AudioModule, RecordingPresets, setAudioModeAsync, type AudioRecorder } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import type { CameraView } from "expo-camera";
import { Platform } from "react-native";
import type { CaptureMode, MediaFile, MediaPort, Take } from "./types";

export type CameraBridge = {
  mount(): Promise<void>; release(): Promise<void>; get(): CameraView | null;
};
// The native constructor exists in NativeAudioModule's types; eslint's JS export resolver cannot see it.
// eslint-disable-next-line import/namespace
const { AudioRecorder: Recorder } = AudioModule;
export class NativeMedia implements MediaPort {
  private audio: AudioRecorder | null = null;
  constructor(private camera: CameraBridge) {}
  mountCamera() { return this.camera.mount(); }
  releaseCamera() { return this.camera.release(); }
  keepAwake(active: boolean) {
    return active ? activateKeepAwakeAsync("second-memory-session") : deactivateKeepAwake("second-memory-session");
  }
  async begin(mode: CaptureMode, maxSeconds: number): Promise<Take> {
    if (mode === "video") {
      if (this.audio) throw new Error("The microphone is still being released.");
      const camera = this.camera.get();
      if (!camera) throw new Error("Camera is not ready.");
      const startedAt = Date.now();
      let stoppedAt = Infinity;
      // SDK 58 sets quality on CameraView; recordAsync only accepts duration/file limits.
      const done = camera.recordAsync({ maxDuration: maxSeconds }).then(result => {
        if (!result?.uri) throw new Error("Video recording did not produce a file.");
        return { uri: result.uri, startedAt, endedAt: Math.min(Date.now(), startedAt + maxSeconds * 1000, stoppedAt), mode };
      });
      let stopping: Promise<void> | null = null;
      return { startedAt, done, stop: () => { stopping ??= (async () => { stoppedAt = Date.now(); camera.stopRecording(); await done; })(); return stopping; } };
    }
    if (this.camera.get()) throw new Error("Release the camera before recording audio.");
    if (this.audio) throw new Error("A recorder already owns the microphone.");
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: false });
    // Construct lazily. useAudioRecorder auto-prepares on mount and would contend with the buffer.
    const preset = RecordingPresets.HIGH_QUALITY;
    const recorder = new Recorder({ ...preset, ...(Platform.OS === "ios" ? preset.ios : preset.android), directory: "document", isMeteringEnabled: true });
    this.audio = recorder;
    try { await recorder.prepareToRecordAsync(); } catch (error) {
      recorder.release(); this.audio = null;
      await setAudioModeAsync({ allowsRecording: false });
      throw error;
    }
    let resolve!: (file: MediaFile) => void;
    let reject!: (error: Error) => void;
    const done = new Promise<MediaFile>((yes, no) => { resolve = yes; reject = no; });
    let settled = false;
    const startedAt = Date.now();
    let stoppedAt = Infinity;
    const finish = async (uri: string | null, error?: string) => {
      if (settled) return;
      settled = true;
      const endedAt = Math.min(Date.now(), startedAt + maxSeconds * 1000, stoppedAt);
      subscription.remove();
      recorder.release();
      this.audio = null;
      try {
        await setAudioModeAsync({ allowsRecording: false });
        if (error || !uri) reject(new Error(error || "Audio recording did not produce a file."));
        else resolve({ uri, startedAt, endedAt, mode });
      } catch (failure) { reject(failure instanceof Error ? failure : new Error("Could not release microphone.")); }
    };
    const subscription = recorder.addListener("recordingStatusUpdate", status => {
      if (status.isFinished || status.hasError) void finish(status.url || recorder.uri, status.hasError ? status.error || "Audio recording failed." : undefined);
    });
    try { recorder.record({ forDuration: maxSeconds }); } catch (error) {
      await finish(recorder.uri, error instanceof Error ? error.message : "Recording failed.");
    }
    let stopping: Promise<void> | null = null;
    return {
      startedAt, uri: settled ? undefined : recorder.uri ?? undefined, done,
      stop: () => {
        stopping ??= (async () => {
          if (!settled) { stoppedAt = Date.now(); await recorder.stop(); if (!settled) await finish(recorder.uri); }
          await done;
        })();
        return stopping;
      },
      level: () => { try { return recorder.getStatus().metering ?? -160; } catch { return -160; } },
    };
  }
}
