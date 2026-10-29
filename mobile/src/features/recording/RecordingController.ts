import { bufferedSeconds, BUFFER_SEGMENT_SECONDS, COMMAND_SECONDS, POST_ROLL_MS, retainWindow, selectWindow, sessionLimit } from "./policy";
import { UploadQueue } from "./UploadQueue";
import type { CaptureMode, MediaFile, MediaPort, MediaRepository, RecordingApi, RecordingSnapshot, Take, UploadJob } from "./types";

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const message = (error: unknown) => error instanceof Error ? error.message : "Recording failed. Please try again.";

/** The only microphone owner. All recorder handoffs are serialized and awaited. */
export class RecordingController {
  private listeners = new Set<() => void>();
  private operations = Promise.resolve();
  private bufferLoop: Promise<void> | null = null;
  private bufferCommit: Promise<void> = Promise.resolve();
  private bufferGeneration = 0;
  private sessionLoop: Promise<void> | null = null;
  private sessionGeneration = 0;
  private take: Take | null = null;
  private commandReleased = false;
  private commandCancelled = false;
  private commandContext: MediaFile[] = [];
  private commandGroup = "";
  private commandWindow = 30;
  private commandWindowStart = 0;
  private commandRestore = true;
  private commandFinalizing = false;
  private sessionFinalizing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pendingPlan = false;
  readonly queue: UploadQueue;
  private snapshot: RecordingSnapshot = {
    ready: false, enabled: false, foreground: true, cameraGranted: false, microphoneGranted: false,
    bufferWanted: true, bufferRecording: false, bufferSeconds: 0, bufferMessage: "Buffer off",
    cameraMounted: false, owner: "none", commandPhase: "idle", commandMode: "video", commandSeconds: 0,
    gettingReady: false, plan: null, session: null, sessionSeconds: 0, pendingUploads: 0,
    pendingSessionUploads: 0, waitingForWifi: false, level: -160, warning: null, error: null,
  };
  constructor(readonly repository: MediaRepository, private media: MediaPort, private api: RecordingApi) {
    this.queue = new UploadQueue(repository, api);
    this.queue.subscribe(() => this.publish());
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private publish(patch: Partial<RecordingSnapshot> = {}) {
    const state = { ...this.snapshot, ...patch };
    const session = this.repository.data.session;
    const liveMs = this.take && state.owner === "session" ? Math.max(0, Date.now() - this.take.startedAt) : 0;
    state.session = session ? { ...session } : null;
    state.sessionSeconds = Math.min(session ? sessionLimit(session.mode) : 0, ((session?.elapsedMs ?? 0) + liveMs) / 1000);
    state.pendingUploads = this.repository.data.queue.length;
    state.pendingSessionUploads = this.repository.data.queue.filter(job => job.kind === "session" && job.groupId === session?.id).length;
    state.waitingForWifi = this.repository.data.queue.some(job => job.wifiOnly && !job.acknowledged) && !this.queue.wifi;
    state.bufferRecording = state.owner === "buffer" && !!this.take;
    if (state.owner === "command" && state.commandPhase === "recording" && this.take) state.commandSeconds = Math.min(30, (Date.now() - this.take.startedAt) / 1000);
    const permitted = state.cameraGranted && state.microphoneGranted;
    state.bufferSeconds = permitted ? Math.min(120, bufferedSeconds(this.repository.data.segments, Date.now()) + (state.bufferRecording && this.take ? Math.min(10, (Date.now() - this.take.startedAt) / 1000) : 0)) : 0;
    state.bufferMessage = !permitted ? "Buffer off" : !state.foreground ? "Buffer paused (app in background)" : ["preparing", "recording"].includes(state.commandPhase) ? "Buffer paused while you talk" : session && !["idle", "result"].includes(session.phase) ? "Session on, buffer paused" : state.bufferRecording ? "Buffer on" : state.bufferWanted ? "Starting buffer..." : "Paused";
    state.level = this.take?.level?.() ?? -160;
    this.snapshot = state;
    this.listeners.forEach(listener => listener());
  }
  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.operations.catch(() => {}).then(work);
    this.operations = operation.then(() => {}, error => { this.publish({ error: message(error) }); });
    return operation;
  }
  async initialize() {
    try {
      await this.repository.load();
      await this.pruneBuffer();
      this.queue.start();
      this.timer = setInterval(() => {
        this.publish();
        const session = this.repository.data.session;
        if (session?.phase === "recording") {
          const limit = sessionLimit(session.mode);
          if (this.snapshot.sessionSeconds >= limit - 60) this.publish({ warning: `${session.mode === "video" ? "Video" : "Audio"} session stops at ${limit / 60}:00. One minute remaining.` });
          if (this.snapshot.sessionSeconds >= limit) void this.stopSession().catch(() => {});
        }
      }, 200);
      this.publish({ ready: true, bufferWanted: this.repository.data.bufferWanted ?? true });
      if (["uploading", "summarizing"].includes(this.repository.data.session?.phase ?? "")) void this.finalizeSession();
    } catch (error) { this.publish({ error: message(error) }); }
  }
  async setEnabled(enabled: boolean) {
    return this.exclusive(async () => {
      this.publish({ enabled });
      if (enabled) await this.maybeStartBuffer(); else {
        await this.stopBuffer(true);
        if (this.repository.data.session?.phase === "recording") await this.pauseSessionInternal(false);
      }
    });
  }
  async setPermissions(cameraGranted: boolean, microphoneGranted: boolean) {
    return this.exclusive(async () => {
      this.publish({ cameraGranted, microphoneGranted });
      const session = this.repository.data.session;
      if (session?.phase === "recording" && (!microphoneGranted || (session.mode === "video" && !cameraGranted))) await this.pauseSessionInternal(false);
      if (this.snapshot.commandPhase === "recording" && (!microphoneGranted || (this.snapshot.commandMode === "video" && !cameraGranted))) {
        this.commandCancelled = true; await this.take?.stop();
      }
      if (!cameraGranted || !microphoneGranted) await this.stopBuffer(true);
      await this.maybeStartBuffer();
    });
  }
  async setForeground(foreground: boolean) {
    // Stop native recording immediately, before queued asynchronous work.
    this.publish({ foreground });
    if (!foreground) {
      this.bufferGeneration++; this.sessionGeneration++;
      if (this.snapshot.commandPhase === "preparing" || this.snapshot.commandPhase === "recording") { this.commandCancelled = true; this.commandReleased = true; }
      void this.take?.stop().catch(error => this.publish({ error: message(error) }));
    }
    return this.exclusive(async () => {
      if (!foreground) {
        if (this.repository.data.session?.phase === "recording") await this.pauseSessionInternal(true);
        await this.stopBuffer(true);
      } else {
        const session = this.repository.data.session;
        if (session?.phase === "paused" && session.resumeOnForeground && this.snapshot.enabled) await this.resumeSessionInternal();
        else await this.maybeStartBuffer();
        this.queue.kick();
      }
    });
  }
  async toggleBuffer() {
    return this.exclusive(async () => {
      this.publish({ bufferWanted: !this.snapshot.bufferWanted, error: null });
      this.repository.data.bufferWanted = this.snapshot.bufferWanted;
      await this.repository.save();
      if (this.snapshot.bufferWanted) await this.maybeStartBuffer(); else await this.stopBuffer(true);
    });
  }
  private async mountCamera() { await this.media.mountCamera(); this.publish({ cameraMounted: true }); }
  private async releaseCamera() { await this.media.releaseCamera(); this.publish({ cameraMounted: false }); }
  private currentTake() { return this.take; }
  private async pruneBuffer() {
    const kept = retainWindow(this.repository.data.segments, Date.now());
    for (const file of this.repository.data.segments) if (!kept.includes(file)) this.repository.remove(file.uri);
    this.repository.data.segments = kept;
    await this.repository.save();
  }
  private async maybeStartBuffer() {
    const state = this.snapshot;
    const session = this.repository.data.session;
    if (!state.ready || !state.enabled || !state.foreground || !state.bufferWanted || !state.cameraGranted || !state.microphoneGranted || this.bufferLoop || state.owner === "command" || (session && !["idle", "result"].includes(session.phase))) return;
    const generation = ++this.bufferGeneration;
    this.publish({ owner: "buffer" });
    await this.mountCamera();
    if (generation !== this.bufferGeneration || !this.snapshot.foreground) { await this.releaseCamera(); this.publish({ owner: "none" }); return; }
    this.bufferLoop = (async () => {
      while (generation === this.bufferGeneration && this.snapshot.foreground && this.snapshot.bufferWanted) {
        try {
          const take = await this.media.begin("video", BUFFER_SEGMENT_SECONDS);
          this.take = take; this.publish();
          if (generation !== this.bufferGeneration || !this.snapshot.foreground) void take.stop().catch(() => {});
          this.bufferCommit = take.done.then(async file => {
            if (file.endedAt - file.startedAt < 150) { this.repository.remove(file.uri); return; }
            const retained = this.repository.retain(file, `buffer-${file.startedAt}`);
            this.repository.data.segments.push(retained);
            await this.pruneBuffer();
          });
          await this.bufferCommit;
        } catch (error) {
          this.publish({ error: message(error) });
          if (generation === this.bufferGeneration) await sleep(1000);
        } finally { this.take = null; this.publish(); }
      }
    })().finally(() => { this.bufferLoop = null; });
  }
  private async stopBuffer(release: boolean) {
    this.bufferGeneration++;
    if (this.snapshot.owner === "buffer") await this.take?.stop().catch(() => {});
    await this.bufferLoop;
    if (this.snapshot.owner === "buffer") this.publish({ owner: "none" });
    if (release && this.snapshot.cameraMounted) await this.releaseCamera();
  }
  async startCommand(requestedMode: CaptureMode, windowSeconds: number) {
    this.commandReleased = false; this.commandCancelled = false;
    return this.exclusive(async () => {
      if (!this.snapshot.microphoneGranted) throw new Error("Microphone is needed to record a command.");
      if (this.repository.data.session && !["idle", "result"].includes(this.repository.data.session.phase)) throw new Error("Stop the Session before recording a command.");
      if (!["idle", "plan"].includes(this.snapshot.commandPhase)) return;
      const mode = requestedMode === "video" && this.snapshot.cameraGranted ? "video" : "audio";
      this.commandRestore = this.snapshot.bufferWanted;
      this.commandWindow = [15, 30, 60].includes(windowSeconds) ? windowSeconds : 30;
      this.commandGroup = `command-${Date.now()}`;
      this.commandWindowStart = Date.now() - this.commandWindow * 1000;
      this.publish({ commandPhase: "preparing", commandMode: mode, commandSeconds: 0, error: null, plan: null });
      const readiness = setTimeout(() => this.publish({ gettingReady: true }), 300);
      try {
        await this.stopBuffer(mode === "audio");
        this.publish({ owner: "command" });
        this.commandContext = [];
        for (const [index, file] of selectWindow(this.repository.data.segments, this.commandWindowStart, Date.now()).entries()) this.commandContext.push(this.repository.retain(file, `${this.commandGroup}-before-${index}`, true));
        if (this.commandReleased || !this.snapshot.foreground) { await this.cancelCommandFiles(); return; }
        if (mode === "video") await this.mountCamera();
        if (this.commandReleased || !this.snapshot.foreground) { await this.cancelCommandFiles(); return; }
        const take = await this.media.begin(mode, COMMAND_SECONDS);
        this.take = take;
        this.repository.data.active = { uri: take.uri, startedAt: take.startedAt, mode, kind: "command" };
        await this.repository.save();
        this.publish({ commandPhase: "recording", gettingReady: false });
        if (this.commandReleased) void take.stop().catch(() => {});
        void take.done.then(file => this.finishCommandFile(file), error => this.commandFailure(error));
      } catch (error) {
        const current = this.currentTake();
        await current?.stop().catch(() => {});
        const file = await current?.done.catch(() => undefined);
        await this.cancelCommandFiles(file);
        throw error;
      }
      finally { clearTimeout(readiness); this.publish({ gettingReady: false }); }
    });
  }
  async endCommand(cancel: boolean) {
    this.commandReleased = true; this.commandCancelled = cancel;
    if (this.snapshot.commandPhase === "recording") await this.take?.stop();
  }
  private async cancelCommandFiles(file?: MediaFile) {
    if (file) this.repository.remove(file.uri);
    this.commandContext.forEach(item => this.repository.remove(item.uri)); this.commandContext = [];
    if (this.repository.data.active?.kind === "command") {
      if (this.repository.data.active.uri) this.repository.remove(this.repository.data.active.uri);
      delete this.repository.data.active;
      await this.repository.save();
    }
    this.take = null;
    if (this.snapshot.cameraMounted) await this.releaseCamera();
    this.publish({ commandPhase: "idle", owner: "none", commandSeconds: 0, gettingReady: false });
    if (this.commandRestore) await this.maybeStartBuffer();
  }
  private commandFailure(error: unknown) {
    void this.exclusive(async () => { await this.cancelCommandFiles(); this.publish({ error: message(error) }); }).catch(() => {});
  }
  private finishCommandFile(file: MediaFile) {
    if (!this.commandGroup) { this.repository.remove(file.uri); return; }
    if (this.commandFinalizing) return;
    this.commandFinalizing = true;
    void this.exclusive(async () => {
      this.take = null;
      this.publish({ commandSeconds: Math.min(30, (file.endedAt - file.startedAt) / 1000) });
      if (this.commandCancelled || this.commandReleased && file.endedAt - file.startedAt < 150) { await this.cancelCommandFiles(file); return; }
      const command = this.repository.retain(file, this.commandGroup);
      await this.releaseCamera();
      this.publish({ commandPhase: "processing", owner: "none" });
      if (this.commandRestore) await this.maybeStartBuffer();
      // Buffer restarts immediately. Its first partial segment supplies post-roll.
      await sleep(POST_ROLL_MS);
      const postRoll = this.currentTake();
      if (this.snapshot.owner === "buffer" && postRoll) {
        await postRoll.stop().catch(() => {}); await this.bufferCommit.catch(() => {});
      }
      const after = selectWindow(this.repository.data.segments, file.endedAt, Date.now() + 1).map((item, index) => this.repository.retain(item, `${this.commandGroup}-after-${index}`, true));
      const files = [...this.commandContext, command, ...after].sort((a, b) => a.startedAt - b.startedAt);
      const jobs = files.map((item, index): UploadJob => ({ ...item, id: `${this.commandGroup}-${index}`, groupId: this.commandGroup, kind: item.uri === command.uri ? "command" : "buffer", index, attempts: 0, nextAttemptAt: 0, wifiOnly: false, windowStart: this.commandWindowStart, windowEnd: file.endedAt + POST_ROLL_MS }));
      this.commandContext = [];
      delete this.repository.data.active;
      this.pendingPlan = true;
      try { await this.queue.add(jobs); }
      finally {
        // Do not hold the recorder mutex while waiting on the network, including disk-write retries.
        void this.queue.waitForGroup(this.commandGroup).then(() => this.fetchPlan()).catch(error => this.publish({ error: message(error) }));
      }
    }).catch(error => this.publish({ error: message(error) })).finally(() => { this.commandFinalizing = false; });
  }
  private async fetchPlan() {
    if (!this.pendingPlan) return;
    try {
      const plan = await this.api.prepareCapture(this.snapshot.commandMode, this.commandWindow);
      this.pendingPlan = false;
      this.publish({ plan, commandPhase: "plan", error: null });
    } catch (error) { this.publish({ error: message(error) }); }
  }
  dismissPlan() { this.publish({ plan: null, commandPhase: "idle" }); }
  async startSession(mode: CaptureMode) {
    return this.exclusive(async () => {
      if (!this.snapshot.microphoneGranted) throw new Error("Microphone is needed for Session");
      if (mode === "video" && !this.snapshot.cameraGranted) throw new Error("Camera is needed for video Session");
      if (this.snapshot.commandPhase !== "idle" && this.snapshot.commandPhase !== "plan") throw new Error("Finish the command first.");
      const existing = this.repository.data.session;
      if (existing && !["idle", "result"].includes(existing.phase)) return;
      const bufferWasOn = this.snapshot.bufferWanted;
      await this.stopBuffer(true);
      this.publish({ owner: "session", error: null, warning: null });
      try {
        const response = await this.api.startSession(mode);
        this.repository.data.session = { id: response.id, mode, phase: "recording", elapsedMs: 0, nextIndex: 0, uploaded: 0, bufferWasOn, resumeOnForeground: false };
        await this.repository.save();
        await this.media.keepAwake(true);
        await this.startSessionLoop();
      } catch (error) { this.publish({ owner: "none" }); await this.maybeStartBuffer(); throw error; }
    });
  }
  private async startSessionLoop() {
    const session = this.repository.data.session;
    if (!session || !this.snapshot.foreground) return;
    this.publish({ owner: "session" });
    if (session.mode === "video") await this.mountCamera(); else await this.releaseCamera();
    const generation = ++this.sessionGeneration;
    this.sessionLoop = (async () => {
      while (session.phase === "recording" && generation === this.sessionGeneration && this.snapshot.foreground) {
        const remaining = sessionLimit(session.mode) - session.elapsedMs / 1000;
        if (remaining <= 0) { void this.stopSession().catch(() => {}); break; }
        try {
          const take = await this.media.begin(session.mode, Math.min(30, remaining));
          this.take = take; this.publish();
          this.repository.data.active = { uri: take.uri, startedAt: take.startedAt, mode: session.mode, kind: "session", index: session.nextIndex, sessionId: session.id };
          await this.repository.save();
          if (generation !== this.sessionGeneration || !this.snapshot.foreground || session.phase !== "recording") void take.stop().catch(() => {});
          const file = await take.done;
          this.take = null;
          const index = session.nextIndex++;
          delete this.repository.data.active;
          session.elapsedMs += Math.max(0, file.endedAt - file.startedAt);
          if (file.endedAt - file.startedAt >= 150) {
            const retained = this.repository.retain(file, `${session.id}-${index}`);
            await this.queue.add([{ ...retained, id: `${session.id}-${index}`, groupId: session.id, kind: "session", index, attempts: 0, nextAttemptAt: 0, wifiOnly: session.mode === "video" }]);
          } else this.repository.remove(file.uri);
          await this.repository.save(); this.publish();
          // The next recorder starts without waiting for any upload.
        } catch (error) {
          session.phase = "paused"; session.resumeOnForeground = false;
          await this.currentTake()?.stop().catch(() => {});
          if (this.repository.data.active?.uri) this.repository.remove(this.repository.data.active.uri);
          delete this.repository.data.active;
          await this.releaseCamera();
          this.publish({ error: message(error) }); await this.repository.save();
          break;
        }
      }
    })().finally(() => { this.take = null; this.sessionLoop = null; this.publish(); });
    this.publish();
  }
  private async pauseSessionInternal(background: boolean) {
    const session = this.repository.data.session;
    if (!session || session.phase !== "recording") return;
    session.phase = "paused"; session.resumeOnForeground = background; this.sessionGeneration++;
    await this.take?.stop().catch(() => {}); await this.sessionLoop;
    await this.releaseCamera();
    await this.repository.save(); this.publish({ owner: "none" });
  }
  pauseSession() { return this.exclusive(() => this.pauseSessionInternal(false)); }
  private async resumeSessionInternal() {
    const session = this.repository.data.session;
    if (!session || session.phase !== "paused" || !this.snapshot.foreground) return;
    if (!this.snapshot.microphoneGranted || session.mode === "video" && !this.snapshot.cameraGranted) return;
    if (session.elapsedMs / 1000 >= sessionLimit(session.mode)) { void this.stopSession().catch(() => {}); return; }
    session.phase = "recording"; session.resumeOnForeground = false;
    await this.repository.save(); await this.startSessionLoop();
  }
  resumeSession() { return this.exclusive(() => this.resumeSessionInternal()); }
  stopSession() {
    return this.exclusive(async () => {
      const session = this.repository.data.session;
      if (!session || ["idle", "result", "uploading", "summarizing"].includes(session.phase)) return;
      await this.pauseSessionInternal(false);
      session.phase = "uploading";
      await this.repository.save(); this.publish({ owner: "none" });
      void this.finalizeSession();
    });
  }
  private async finalizeSession() {
    if (this.sessionFinalizing) return;
    const session = this.repository.data.session;
    if (!session) return;
    this.sessionFinalizing = true;
    try {
      await this.queue.waitForGroup(session.id);
      if (this.repository.data.session !== session) return;
      await this.api.stopSession(session.id);
      session.phase = "summarizing"; await this.repository.save(); this.publish();
      session.result = await this.api.getSessionResult(session.id, session.mode);
      if (this.repository.data.session !== session) return;
      session.phase = "result"; await this.repository.save();
      await this.media.keepAwake(false);
      this.publish({ bufferWanted: session.bufferWasOn, error: null, warning: null });
      await this.exclusive(() => this.maybeStartBuffer());
    } catch (error) { session.phase = "uploading"; this.publish({ error: message(error) }); await this.repository.save().catch(() => {}); }
    finally { this.sessionFinalizing = false; this.publish(); }
  }
  retry() {
    this.publish({ error: null }); this.queue.retry();
    if (!this.snapshot.ready) { void this.initialize(); return; }
    if (this.pendingPlan && !this.repository.data.queue.some(job => job.groupId === this.commandGroup)) void this.fetchPlan();
    if (this.repository.data.session?.phase === "uploading") void this.finalizeSession();
    void this.exclusive(async () => {
      if (this.repository.data.session?.phase === "recording" && !this.sessionLoop) {
        await this.releaseCamera(); await this.startSessionLoop();
      } else {
        if (!this.bufferLoop && this.snapshot.owner === "buffer") await this.releaseCamera();
        await this.maybeStartBuffer();
      }
    }).catch(() => {});
  }
  clearSessionResult() {
    if (this.repository.data.session?.phase === "result") {
      this.repository.data.session = null;
      void this.repository.save().catch(error => this.publish({ error: message(error) }));
      this.publish();
    }
  }
  async resetLocal() {
    return this.exclusive(async () => {
      this.queue.stop(); this.commandCancelled = true; this.commandReleased = true;
      this.publish({ enabled: false, bufferWanted: false });
      this.bufferGeneration++; this.sessionGeneration++;
      const active = this.currentTake();
      await active?.stop().catch(() => {});
      await this.bufferLoop; await this.sessionLoop;
      await this.releaseCamera(); await this.media.keepAwake(false);
      for (const file of [...this.repository.data.segments, ...this.repository.data.queue, ...this.commandContext]) this.repository.remove(file.uri);
      if (this.repository.data.active?.uri) this.repository.remove(this.repository.data.active.uri);
      this.repository.data = { version: 1, segments: [], queue: [], session: null, bufferWanted: false };
      this.commandContext = []; this.commandGroup = ""; this.pendingPlan = false; this.take = null;
      await this.repository.save(); this.queue.notify();
      this.publish({ owner: "none", plan: null, commandPhase: "idle", commandSeconds: 0, error: null, warning: null });
    });
  }
  async dispose() {
    if (this.timer) clearInterval(this.timer);
    this.queue.stop(); this.bufferGeneration++; this.sessionGeneration++;
    await this.take?.stop().catch(() => {});
    await this.bufferLoop; await this.sessionLoop;
    await this.releaseCamera(); await this.media.keepAwake(false);
  }
}
