import type {
  AppSettings,
  AskResult,
  CapturePlan,
  Memory,
  MemoryFilterKey,
  TodayPayload,
} from "@/types";

/**
 * The only data seam the UI knows about. Swap `src/api/mockClient.ts` for an
 * HTTP-backed implementation later — no screen or component changes required.
 */
export interface SecondMemoryClient {
  listMemories(params?: {
    query?: string;
    filter?: MemoryFilterKey;
  }): Promise<Memory[]>;

  getMemory(id: string): Promise<Memory | null>;

  deleteMemory(id: string): Promise<void>;

  deleteAllMemories(): Promise<void>;

  /** Voice or typed question → cited answer or suggestions for "not found". */
  ask(question: string, assistantName: string): Promise<AskResult>;

  getToday(): Promise<TodayPayload>;

  setReminderDone(id: string, done: boolean): Promise<void>;

  getSettings(): Promise<AppSettings>;

  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>;

  /**
   * A recognized voice command on the Capture screen.
   * Returns the parsed capture plan + the memory that was saved.
   */
  sendCaptureCommand(params: {
    command: string;
    assistantName: string;
  }): Promise<{ plan: CapturePlan; savedMemory: Memory }>;
}
