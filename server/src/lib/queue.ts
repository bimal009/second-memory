import { Queue } from "bullmq";
import { redis } from "./redis";

export const CHUNK_QUEUE = "chunk-tasks";

export type ChunkJobData = { captureId: string; chunkIdx: number };

export const chunkQueue = new Queue<ChunkJobData>(CHUNK_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: true,
    removeOnFail: true,
  },
});

export const chunkJobId = (captureId: string, idx: number) =>
  `${captureId}_${idx}`;

export const enqueueChunk = (captureId: string, idx: number) =>
  chunkQueue.add(
    "process-chunk",
    { captureId, chunkIdx: idx },
    { jobId: chunkJobId(captureId, idx) },
  );

export const SUMMARY_QUEUE = "summary-tasks";

export type SummaryJobData = { captureId: string };

export const summaryJobId = (captureId: string) => `summary_${captureId}`;

export const enqueueSummary = (captureId: string) =>
  summaryQueue.add(
    "summarize-capture",
    { captureId },
    { jobId: summaryJobId(captureId), delay: 5_000 },
  );

const summaryQueue = new Queue<SummaryJobData>(SUMMARY_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: true,
    removeOnFail: true,
  },
});
