import { retryDelay } from "./policy";
import type { MediaRepository, RecordingApi, UploadJob } from "./types";

/** Durable, single-consumer queue. Acknowledgement is persisted before deleting raw media. */
export class UploadQueue {
  private pumping = false;
  private stopped = true;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  online = true;
  wifi = false;
  error: string | null = null;
  constructor(private repository: MediaRepository, private api: RecordingApi) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit() { this.listeners.forEach(listener => listener()); }
  start() { this.stopped = false; this.kick(); }
  stop() { this.stopped = true; if (this.timer) clearTimeout(this.timer); }
  async add(jobs: UploadJob[]) {
    for (const job of jobs) if (!this.repository.data.queue.some(item => item.id === job.id)) this.repository.data.queue.push(job);
    await this.repository.save(); this.emit(); this.kick();
  }
  setNetwork(online: boolean, wifi: boolean) {
    this.online = online; this.wifi = wifi;
    if (!online && this.repository.data.queue.length) this.error = "Can't reach the server. Files stay on this phone until upload succeeds.";
    this.kick(); this.emit();
  }
  notify() { this.emit(); }
  retry() { this.repository.data.queue.forEach(job => { job.nextAttemptAt = 0; }); this.kick(); }
  kick() {
    if (this.stopped || this.pumping) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.pump(); }, 0);
  }
  private schedule(ms: number) {
    if (!this.stopped) this.timer = setTimeout(() => { void this.pump(); }, ms);
  }
  private async pump() {
    if (this.stopped || this.pumping) return;
    const job = this.repository.data.queue.find(item => item.acknowledged || (this.online && (!item.wifiOnly || this.wifi)));
    if (!job) return;
    if (job.nextAttemptAt > Date.now()) { this.schedule(job.nextAttemptAt - Date.now()); return; }
    this.pumping = true;
    try {
      if (!job.acknowledged) {
        const response = await this.api.upload(job);
        if (!response.accepted) throw new Error("The upload was not accepted.");
        job.acknowledged = true;
      }
      // Re-persist on cleanup retries too: never remove an unacknowledged file.
      await this.repository.save();
      this.repository.remove(job.uri);
      this.repository.data.queue = this.repository.data.queue.filter(item => item.id !== job.id);
      const session = this.repository.data.session;
      if (job.kind === "session" && session?.id === job.groupId) session.uploaded += 1;
      await this.repository.save();
      this.error = null;
    } catch (error) {
      job.attempts += 1;
      job.nextAttemptAt = Date.now() + retryDelay(job.attempts);
      this.error = error instanceof Error ? error.message : "Upload failed. Your file is still on this phone.";
      await this.repository.save().catch(() => {});
    } finally {
      this.pumping = false; this.emit(); this.kick();
    }
  }
  waitForGroup(groupId: string): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (!this.repository.data.queue.some(job => job.groupId === groupId)) { unsubscribe(); resolve(); }
      };
      const unsubscribe = this.subscribe(check);
      check();
    });
  }
}
