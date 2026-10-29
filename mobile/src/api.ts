import { useSyncExternalStore } from "react";
import * as mock from "./mock";
import type { BufferState, CaptureDraft, DemoMemory, SessionResult, Simulation } from "./types/demo";
import type { CaptureMode, UploadJob } from "./features/recording/types";

// Compatibility for existing screens, which will be migrated one at a time.
export { api } from "./api/index";
export type { BufferState, CaptureDraft, DemoMemory } from "./types/demo";

let simulation: Simulation = { offline: false, empty: false, error: false };
const listeners = new Set<() => void>();
export function setSimulation(patch: Partial<Simulation>) {
  simulation = { ...simulation, ...patch };
  listeners.forEach(listener => listener());
}
export function useSimulation() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => simulation, () => simulation);
}
export class ApiError extends Error {
  constructor(public code: "offline" | "server", message: string) { super(message); this.name = "ApiError"; }
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
async function delay() {
  await sleep(400 + Math.floor(Math.random() * 401));
  if (simulation.offline) throw new ApiError("offline", "Can't reach the server");
  if (simulation.error) throw new ApiError("server", "Something went wrong. Please try again.");
}
let bufferState = clone(mock.buffer);
let storedMemories = clone(mock.memories);
let storedReminders = clone(mock.reminders);
let activeSession: { id: string; startedAt: number; mode: CaptureMode } | null = null;
let previousRecording = true;
let uploadHistory = clone(mock.privacyReceipt.uploads);
let deletedRawFiles = mock.privacyReceipt.deletedRawFiles;
export async function getBuffer(): Promise<BufferState> {
  await delay(); return clone({ ...bufferState, capacity: 120, seconds: simulation.empty ? 0 : Math.min(120, bufferState.seconds) });
}
export async function setBufferRecording(recording: boolean) {
  await delay(); bufferState = { ...bufferState, recording }; return clone(bufferState);
}
export async function prepareCapture(source: "Voice" | "Buffer" = "Voice"): Promise<CaptureDraft> {
  await delay(); return { ...clone(mock.capturePlan), clip: { enabled: true, seconds: 30 }, source };
}
export async function getMemories(query = "") {
  await delay(); return simulation.empty ? [] : clone(storedMemories.filter(m => `${m.title} ${m.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())));
}
export async function getMemory(id: string) {
  await delay(); return simulation.empty ? null : clone(storedMemories.find(m => m.id === id) ?? null);
}
export async function ask(question: string) {
  await delay();
  const sightings = storedMemories.filter(m => m.tags.includes("passport"));
  const found = !simulation.empty && /^where[’']?s my passport\??$/i.test(question.trim()) && sightings.length > 0;
  const latest = sightings[0];
  const answer = found && latest ? latest.id === "1" ? mock.passportAnswer : `${latest.title}. Seen ${latest.dayLabel.toLowerCase()} at ${latest.timeLabel}.` : mock.noMemoryAnswer;
  return { answer, found, citations: found ? clone(sightings) : [], recentQuestions: simulation.empty ? [] : clone(mock.recentQuestions) };
}
export async function getReminders() {
  await delay(); return { reminders: simulation.empty ? [] : clone(storedReminders), recap: simulation.empty ? "Today: 0 memories, 0 reminders" : mock.dailyRecap };
}
export async function getPrivacyReceipt() {
  await delay(); return simulation.empty ? { uploads: [], deletedRawFiles: 0, storedMemories: 0, storedFrames: 0 } : { uploads: clone(uploadHistory), deletedRawFiles, storedMemories: storedMemories.length, storedFrames: storedMemories.reduce((sum, memory) => sum + memory.frames.length, 0) };
}
export async function startSession(mode: CaptureMode = "audio") {
  await delay(); previousRecording = bufferState.recording; activeSession = { id: `session-${Date.now()}`, startedAt: Date.now(), mode }; bufferState.recording = false; return clone(activeSession);
}
export async function stopSession(id?: string) {
  await delay(); const session = activeSession;
  if (id && session && id !== session.id) throw new Error("Session not found.");
  activeSession = null; if (session) bufferState.recording = previousRecording; return session;
}
export async function getSessionResult(_id?: string, mode: CaptureMode = "audio") {
  await delay(); await sleep(1400);
  return { ...clone(mock.sessionResult), keyFrames: mode === "video" ? ["00:05", "00:48", "01:12", "01:52"].map((timestamp, index) => ({ timestamp, uri: `https://picsum.photos/seed/session-${index}/600/400` })) : undefined };
}
export async function saveMemory(draft: CaptureDraft): Promise<DemoMemory> {
  await delay();
  const memory: DemoMemory = {
    ...clone(mock.memories[0]), id: `memory-${Date.now()}`, timestamp: new Date().toISOString(),
    title: draft.note.enabled && draft.note.text.trim() ? draft.note.text.trim() : "Saved moment",
    dayLabel: "Today", timeLabel: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    reminder: draft.reminder.enabled,
    source: draft.source, tags: draft.note.enabled ? draft.note.text.trim().split(/\s+/).filter(Boolean) : [],
    frames: draft.clip.enabled && draft.frames.enabled ? clone(mock.memories[0].frames) : [],
    place: draft.location.enabled ? mock.memories[0].place : "Location off",
  };
  if (!draft.clip.enabled || !draft.frames.enabled) delete memory.highlight;
  storedMemories.unshift(memory);
  if (draft.reminder.enabled) storedReminders.unshift({ id: `reminder-${Date.now()}`, text: memory.title, timeLabel: draft.reminder.time, source: draft.source, done: false });
  return clone(memory);
}
export async function deleteMemory(id: string) {
  await delay(); storedMemories = storedMemories.filter(m => m.id !== id);
}

export async function getRecentQuestions() { await delay(); return simulation.empty ? [] : clone(mock.recentQuestions); }
export async function addReminder(text: string, timeLabel: string, source: "Voice" | "Session" = "Voice") {
  await delay();
  if (!text.trim() || !timeLabel.trim()) throw new Error("Enter a reminder and time.");
  const reminder = { id: `reminder-${Date.now()}`, text: text.trim(), timeLabel, source, done: false };
  storedReminders.unshift(reminder); return clone(reminder);
}
export async function setReminderDone(id: string, done: boolean) {
  await delay(); storedReminders = storedReminders.map(r => r.id === id ? { ...r, done } : r);
}
export async function deleteReminder(id: string) {
  await delay(); storedReminders = storedReminders.filter(r => r.id !== id);
}
export async function deleteAllMemories() { await delay(); storedMemories = []; }
export async function deleteEverything() { await delay(); storedMemories = []; storedReminders = []; uploadHistory = []; deletedRawFiles = 0; }
export async function saveSession(mode: CaptureMode = "audio", result?: SessionResult) {
  await delay();
  const memory: DemoMemory = { ...clone(mock.memories[2]), id: `session-${Date.now()}`, title: result?.summary ?? mock.sessionResult.summary, timestamp: new Date().toISOString(), dayLabel: "Today", timeLabel: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), frames: mode === "video" ? result?.keyFrames?.map(frame => frame.uri) ?? [] : [] };
  storedMemories.unshift(memory); return clone(memory);
}

// Mock transport acknowledgements. No raw file is read or transmitted by these stubs.
const acceptedUploads = new Set<string>();
export async function uploadRecordedMedia(job: UploadJob): Promise<{ accepted: boolean }> {
  await delay();
  if (!job.uri || !Number.isFinite(job.startedAt) || job.endedAt < job.startedAt) throw new Error("Invalid recording metadata.");
  acceptedUploads.add(job.id); // Stable IDs make retries idempotent.
  return { accepted: acceptedUploads.has(job.id) };
}
export async function prepareRecordedCommand(mode: CaptureMode, windowSeconds: number): Promise<CaptureDraft> {
  await delay();
  return { ...clone(mock.capturePlan), clip: { enabled: true, seconds: windowSeconds }, frames: { enabled: mode === "video" }, source: "Voice" };
}
