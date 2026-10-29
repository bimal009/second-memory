import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import type { LocalIndex, MediaFile, MediaRepository } from "./types";

const INDEX_KEY = "second-memory-recording-index-v1";
export class LocalMediaRepository implements MediaRepository {
  data: LocalIndex = { version: 1, segments: [], queue: [], session: null };
  private writes = Promise.resolve();
  private directory = new Directory(Paths.document, "second-memory-recordings");
  async load() {
    this.directory.create({ idempotent: true, intermediates: true });
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalIndex;
      if (parsed.version !== 1 || !Array.isArray(parsed.segments) || !Array.isArray(parsed.queue)) throw new Error("The local recording index could not be read.");
      this.data = parsed;
      this.data.segments = parsed.segments.filter(file => new File(file.uri).exists);
      const active = this.data.active;
      if (active?.kind === "session" && this.data.session && active.sessionId === this.data.session.id && active.index !== undefined) {
        const moved = new File(this.directory, `${active.sessionId}-${active.index}.${active.mode === "audio" ? "m4a" : "mp4"}`);
        const raw = moved.exists ? moved : active.uri ? new File(active.uri) : null;
        if (raw?.exists && raw.size > 0) {
          const file = { uri: raw.uri, startedAt: active.startedAt, endedAt: Math.min(Date.now(), active.startedAt + 30000), mode: active.mode };
          const retained = moved.exists ? file : this.retain(file, `${active.sessionId}-${active.index}`);
          const id = `${active.sessionId}-${active.index}`;
          if (!this.data.queue.some(job => job.id === id)) this.data.queue.push({ ...retained, id, groupId: active.sessionId, kind: "session", index: active.index, attempts: 0, nextAttemptAt: 0, wifiOnly: active.mode === "video" });
          this.data.session.nextIndex = Math.max(this.data.session.nextIndex, active.index + 1);
          this.data.session.elapsedMs += Math.max(0, file.endedAt - file.startedAt);
        }
      } else if (active?.uri) this.remove(active.uri);
      delete this.data.active;
      // A process restart never silently turns the microphone back on.
      if (this.data.session && ["recording", "starting"].includes(this.data.session.phase)) {
        this.data.session.phase = "paused";
        this.data.session.resumeOnForeground = false;
      }
    }
    // Only this recorder's own directory is swept; uncommitted command/capture copies are disposable.
    const known = new Set([...this.data.segments, ...this.data.queue].map(file => file.uri));
    for (const file of this.directory.list()) if (file instanceof File && !known.has(file.uri)) file.delete();
  }
  save() {
    const snapshot = JSON.stringify(this.data);
    this.writes = this.writes.catch(() => {}).then(() => AsyncStorage.setItem(INDEX_KEY, snapshot));
    return this.writes;
  }
  retain(file: MediaFile, name: string, copy = false): MediaFile {
    const original = new File(file.uri);
    const extension = file.mode === "video" ? ".mp4" : ".m4a";
    const target = new File(this.directory, `${name}${extension}`);
    if (copy) original.copy(target); else original.move(target);
    return { ...file, uri: target.uri };
  }
  remove(uri: string) { const file = new File(uri); if (file.exists) file.delete(); }
}
