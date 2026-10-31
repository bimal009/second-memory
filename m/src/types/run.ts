import type { MemoryLocation } from "./index";
export type ChunkLength = 20 | 30 | 45 | 60;
export type CaptureStatus = "idle" | "capturing" | "paused" | "background_paused" | "error";
export type Chunk = {
    id: string;
    runId: string;
    index: number;
    seconds: number;
    durationSec: number;
    text: string;
    frameSeed: number;
    memoryId: string;
    uploaded: boolean;
};
export type Run = {
    id: string;
    title: string;
    summary: string;
    createdAt: string;
    durationSec: number;
    frameSeed: number;
    chunkLength: ChunkLength;
    actionItems: string[];
    bookmarks: {
        seconds: number;
        label: string;
        memoryId: string;
    }[];
    chunks: Chunk[];
    localCopyUri?: string;
    ended: boolean;
};
export type PendingChunk = {
    id: string;
    runId: string;
    index: number;
    seconds: number;
    durationSec: number;
    location?: MemoryLocation;
    uri?: string;
    startedAt?: string;
};
export type RunReceipt = {
    runId: string;
    title: string;
    chunks: {
        id: string;
        files: number;
        sizeMb: number;
        audioSec: number;
        frames: number;
        rawDeleted: boolean;
    }[];
};
export type QuestionHistory = {
    id: string;
    question: string;
    createdAt: string;
};
