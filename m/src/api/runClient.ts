import type { ChunkLength, Run, PendingChunk } from "@/types/run";
export interface RunClient {
    listRuns(): Promise<Run[]>;
    getRun(id: string): Promise<Run | null>;
    beginRun(chunkLength: ChunkLength, keepLocal: boolean): Promise<Run>;
    finishRun(id: string, seconds: number): Promise<Run>;
    uploadChunk(chunk: PendingChunk): Promise<void>;
    deleteRun(id: string): Promise<void>;
}
