import type { SecondMemoryClient } from "./domainClient";
import { store, isToday, newId } from "./mockStore";
import { mockRunClient } from "./mockRunClient";
import { mockAsk } from "./mockSearch";
import { mockDelay, getPreviewState } from "./previewState";
import { getPreferences, updatePreferences } from "@/lib/preferences";
import { exampleQuestions, captureSeed } from "@/mocks/data";
import { captureCopy as c } from "@/constants/strings";
export const mockClient: SecondMemoryClient = {
  ...mockRunClient,
  async listMemories(params) {
    await mockDelay(); let list = getPreviewState() === "empty" ? [] : [...store.memories];
    if (params?.filter === "today") list = list.filter(m => isToday(m.createdAt));
    if (params?.filter === "places") list = list.filter(m => !!m.location);
    if (params?.filter === "bookmarks") list = list.filter(m => m.kind === "bookmark");
    const q = params?.query?.trim().toLowerCase(); if (q) list = list.filter(m => [m.title, m.summary, m.transcript, ...m.tags].join(" ").toLowerCase().includes(q));
    return structuredClone(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async getMemory(id) { await mockDelay(); return structuredClone(store.memories.find(m => m.id === id) ?? null); },
  async deleteMemory(id) { await mockDelay(); store.memories = store.memories.filter(m => m.id !== id); store.runs.forEach(r => { r.bookmarks = r.bookmarks.filter(b => b.memoryId !== id); r.chunks = r.chunks.filter(c => c.memoryId !== id); }); },
  async deleteAllMemories() { await mockDelay(); store.memories = []; store.runs = []; store.reminders = []; store.recap = null; store.receipts = []; store.history = []; },
  async ask(question) { await mockDelay(); store.history.unshift({ id: newId("question"), question, createdAt: new Date().toISOString() }); store.history = store.history.slice(0, 10); return getPreviewState() === "empty" ? { kind: "not-found", suggestions: [...exampleQuestions] } : mockAsk(question, store.memories); },
  async getToday() { await mockDelay(); return getPreviewState() === "empty" ? { recap: null, reminders: [] } : structuredClone({ recap: store.recap, reminders: store.reminders }); },
  async setReminderDone(id, done) { await mockDelay(); store.reminders = store.reminders.map(r => r.id === id ? { ...r, done } : r); },
  async createReminder(text, due = c.laterToday) { await mockDelay(); store.reminders.unshift({ id: newId("reminder"), text, timeLabel: due, done: false }); },
  async getSettings() { return { ...getPreferences(), chunkLength: getPreferences().chunkLength ?? 30, keepLocalRecording: getPreferences().keepLocalRecording ?? false }; },
  async updateSettings(patch) { await updatePreferences(patch); return this.getSettings(); },
  async getExamples() { await mockDelay(); return [...exampleQuestions]; },
  async getLocation() { return structuredClone(captureSeed.location); },
  async getSightings(id) { await mockDelay(); const source = store.memories.find(m => m.id === id); return store.memories.filter(m => m.kind !== "bookmark" && (m.id === id || (source?.tags.includes("passport") && m.tags.includes("passport")))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(m => ({ id: m.id, frameSeed: m.frameSeed, timeLabel: (isToday(m.createdAt) ? c.today : c.yesterday) + " ? " + m.startedAtLabel, location: m.location })); },
  // Compatibility adapters for retired prototype components, not used by the pager.
  async listSessions() { return this.listRuns(); }, async getSession(id) { return this.getRun(id); },
  async deleteSession(id) { return this.deleteRun(id); }, async confirmChunk() { await mockDelay(); },
  async saveSession(seconds) { const run = await this.beginRun(30, false); return this.finishRun(run.id, seconds); },
  async sendSessionCommand(command) { return { note: command, plan: { clip: false, includeLocation: false, note: command } }; },
  async sendCaptureCommand({ command }) { const run = await this.beginRun(30, false); const savedMemory = await this.bookmarkRun(run.id, 0, command); await this.finishRun(run.id, 0); return { plan: { clip: false, includeLocation: false, note: command }, savedMemory }; },
  async getReceipts() { return (await this.getRunReceipts()).flatMap(r => r.chunks.map(chunk => ({ ...chunk, title: r.title, rawDeleted: true as const }))); },
};
