import type { ChunkLength, Run, PendingChunk, RunReceipt, QuestionHistory } from "@/types/run";
import type { AssistantCommand } from "@/types/command";
import type { Memory, MemoryLocation } from "@/types";
export interface RunClient {
  listRuns(): Promise<Run[]>;
  getRun(id: string): Promise<Run | null>;
  beginRun(chunkLength: ChunkLength, keepLocal: boolean): Promise<Run>;
  finishRun(id: string, seconds: number): Promise<Run>;
  uploadChunk(chunk: PendingChunk): Promise<void>;
  bookmarkRun(id: string, seconds: number, note: string, location?: MemoryLocation): Promise<Memory>;
  deleteRun(id: string): Promise<void>;
  getRunReceipts(): Promise<RunReceipt[]>;
  getQuestionHistory(): Promise<QuestionHistory[]>;
  interpretCommand(command: string, assistantName: string): Promise<AssistantCommand>;
  getCommandExamples(): Promise<string[]>;
}
