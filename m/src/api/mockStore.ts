import { mockMemories, mockRuns, mockReminders, mockRecap } from "@/mocks/data";
import type { Memory, Reminder, DayRecap } from "@/types";
import type { Run, RunReceipt, QuestionHistory } from "@/types/run";
export const store: { memories: Memory[]; runs: Run[]; reminders: Reminder[]; recap: DayRecap | null; receipts: RunReceipt[]; history: QuestionHistory[] } = {
  memories: structuredClone(mockMemories), runs: structuredClone(mockRuns), reminders: structuredClone(mockReminders), recap: structuredClone(mockRecap), history: [],
  receipts: mockRuns.map(run => ({ runId: run.id, title: run.title, chunks: run.chunks.map(chunk => ({ id: chunk.id, files: 1, sizeMb: 1.2, audioSec: chunk.durationSec, frames: 3, rawDeleted: true })) })),
};
export function isToday(iso: string) { return new Date(iso).toDateString() === new Date().toDateString(); }
let sequence = 0;
export const newId = (prefix: string) => prefix + "-" + Date.now() + "-" + ++sequence;
