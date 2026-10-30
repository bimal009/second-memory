import type { RunClient } from "./runClient";
import { captureSeed } from "@/mocks/data";
import { store, newId } from "./mockStore";
import { mockDelay, getPreviewState } from "./previewState";
import { mockAsk } from "./mockSearch";
import { captureCopy as c } from "@/constants/strings";
// These methods simulate metadata only: no video, microphone, upload, or deletion of real files.
export const mockRunClient: RunClient = {
  async listRuns() { await mockDelay(); return getPreviewState() === "empty" ? [] : structuredClone(store.runs); },
  async getRun(id) { await mockDelay(); return structuredClone(store.runs.find(r => r.id === id) ?? null); },
  async beginRun(chunkLength, _keepLocal) {
    // Local lifecycle remains usable offline; finished chunks wait in the simulated queue.
    const run = { id: newId("run"), title: captureSeed.title, summary: captureSeed.summary, createdAt: new Date().toISOString(), durationSec: 0, chunkLength, frameSeed: 47, actionItems: [], bookmarks: [], chunks: [], ended: false };
    store.runs.unshift(run); store.receipts.unshift({ runId: run.id, title: run.title, chunks: [] }); return structuredClone(run);
  },
  async finishRun(id, seconds) { const run = store.runs.find(r => r.id === id); if (!run) throw new Error(c.runMissing); run.durationSec = seconds; run.ended = true; return structuredClone(run); },
  async uploadChunk(chunk) {
    await mockDelay(); const run = store.runs.find(r => r.id === chunk.runId); if (!run) return;
    if (run.chunks.some(c => c.id === chunk.id)) return; // Idempotent retry.
    const memoryId = chunk.id + "-memory"; const createdAt = new Date(new Date(run.createdAt).getTime() + chunk.seconds * 1000).toISOString();
    store.memories.unshift({ id: memoryId, kind: "chunk", runId: run.id, title: captureSeed.note, summary: captureSeed.note, transcript: captureSeed.note, createdAt, startedAtLabel: new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), frameSeed: 47 + chunk.index, tags: [], location: chunk.location });
    run.chunks.push({ ...chunk, memoryId, text: captureSeed.note, frameSeed: 47 + chunk.index, uploaded: true });
    store.receipts.find(r => r.runId === run.id)?.chunks.push({ id: chunk.id, files: 1, sizeMb: +(chunk.durationSec * 0.04).toFixed(2), audioSec: chunk.durationSec, frames: 3, rawDeleted: true });
  },
  async bookmarkRun(id, seconds, note, location) {
    const run = store.runs.find(r => r.id === id); if (!run) throw new Error(c.runMissing);
    const memory = { id: newId("bookmark"), kind: "bookmark" as const, runId: id, title: note, summary: note, transcript: note, createdAt: new Date().toISOString(), startedAtLabel: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), frameSeed: 71, tags: ["bookmark"], location };
    store.memories.unshift(memory); run.bookmarks.push({ seconds, label: note, memoryId: memory.id }); return structuredClone(memory);
  },
  async deleteRun(id) { await mockDelay(); store.runs = store.runs.filter(r => r.id !== id); store.memories = store.memories.filter(m => m.runId !== id); store.receipts = store.receipts.filter(r => r.runId !== id); },
  async getRunReceipts() { await mockDelay(); return getPreviewState() === "empty" ? [] : structuredClone(store.receipts); },
  async getQuestionHistory() { await mockDelay(); return structuredClone(store.history); },
  async getCommandExamples() { return [...c.commandExamples]; },
  async interpretCommand(command) {
    const q = command.toLowerCase().trim();
    // Local controls work even offline; assistant search and reminders require a connection.
    if (/^(pause|stop|resume)\b/.test(q)) return { intent: "control", action: q.startsWith("pause") ? "pause" : q.startsWith("stop") ? "stop" : "resume" };
    await mockDelay();
    if (/remind|reminder/.test(q)) return { intent: "reminder", text: command.replace(/^remind me to\s*/i, ""), due: /friday/i.test(q) ? c.friday : c.laterToday };
    if (/^(where|what|when|why|how)|\?/.test(q)) {
      const result = getPreviewState() === "empty" ? { kind: "not-found" as const, suggestions: [...c.commandExamples].slice(0, 1) } : mockAsk(command, store.memories);
      store.history.unshift({ id: newId("question"), question: command, createdAt: new Date().toISOString() }); store.history = store.history.slice(0, 10);
      return { intent: "ask", question: command, result };
    }
    return { intent: "bookmark", note: command || c.rememberThis };
  },
};
