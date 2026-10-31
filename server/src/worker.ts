import { DelayedError, Worker, type Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { rm } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  chunkRowSchema,
  FRAME_EVERY_S,
  ORDER_RECHECK_S,
  ORDER_WAIT_S,
  type ChunkRow,
  type ChunkStatus,
} from "@repo/types";
import { db } from "./db/index";
import { chunks } from "./db/schema";
import { redis } from "./lib/redis";
import { CHUNK_QUEUE, enqueueChunk, type ChunkJobData } from "./lib/queue";
import { audioPath, chunkPath, ensureDir, frameDir } from "./lib/storage";
import {
  convertMono,
  extractFrame,
  extractFrames,
  getMediaInfo,
  keepFrames,
} from "./services/ffmpeg";

const TERMINAL = new Set<ChunkStatus>(["processed", "skipped", "failed"]);

const frameOffsetS = (framePath: string) =>
  (parseInt(basename(framePath), 10) - 1) * FRAME_EVERY_S;

export type UnderstandInput = {
  chunk: ChunkRow;
  frames: { path: string; offsetS: number }[];
  audioPath: string | null;
};

async function understandChunk(_input: UnderstandInput): Promise<void> {
  // TODO
}

async function cleanupRaw(captureId: string, idx: number) {
  await rm(chunkPath(captureId, idx), { force: true });
  await rm(audioPath(captureId, idx), { force: true });
  await db
    .update(chunks)
    .set({ rawDeletedAt: new Date() })
    .where(and(eq(chunks.captureId, captureId), eq(chunks.idx, idx)));
}

/** The capture was deleted (or is mid-delete): never recreate files for it. */
async function captureOpen(captureId: string): Promise<boolean> {
  const capture = await db.query.captures.findFirst({
    where: { id: captureId },
    columns: { status: true },
  });
  return !!capture && capture.status !== "deleting";
}

async function runPipeline(row: ChunkRow): Promise<number> {
  const { captureId, idx } = row;
  const raw = chunkPath(captureId, idx);

  const info = await getMediaInfo(raw);
  console.log(
    `[worker] chunk ${captureId}#${idx} probe: kind=${info.kind}, has_audio=${info.has_audio}, duration=${Math.round(info.duration)}s`,
  );

  // The probe is the truth about this video's duration — correct the row
  // in case the phone's counter was off (clock drift, early close).
  await db
    .update(chunks)
    .set({ durationS: Math.round(info.duration * 100) / 100 })
    .where(eq(chunks.id, row.id));

  if (info.kind !== "video") throw new Error("only video chunks are supported");

  // Start clean so a retry never mixes in frames from a previous attempt.
  const framesOut = frameDir(captureId, idx);
  await rm(framesOut, { recursive: true, force: true });
  await ensureDir(framesOut);

  let extracted = await extractFrames(raw, framesOut);
  if (extracted.length === 0) {
    // Short chunk (closed early, under FRAME_EVERY_S): grab the first frame.
    extracted = [await extractFrame(raw, join(framesOut, "1.jpg"))];
  }
  const kept = await keepFrames(extracted);

  // Extract the audio track and convert it to 16 kHz mono WAV, when it has audio.
  let wav: string | null = null;
  if (info.has_audio) {
    wav = await convertMono(raw, audioPath(captureId, idx));
    console.log(
      `[worker] chunk ${captureId}#${idx} audio extracted -> audio.wav`,
    );
  } else {
    console.warn(
      `[worker] chunk ${captureId}#${idx} has no audio stream — skipping WAV (frames only)`,
    );
  }

  await understandChunk({
    chunk: row,
    frames: kept.map((path) => ({ path, offsetS: frameOffsetS(path) })),
    audioPath: wav,
  });

  return kept.length;
}

async function processor(job: Job<ChunkJobData>, token?: string) {
  const { captureId, chunkIdx } = job.data;

  const [selected] = await db
    .select()
    .from(chunks)
    .where(and(eq(chunks.captureId, captureId), eq(chunks.idx, chunkIdx)))
    .limit(1);

  if (!selected) return { skipped: true };

  // Zod boundary: the DB row is validated before any processing (Rule 5).
  const parsed = chunkRowSchema.safeParse(selected);
  if (!parsed.success || TERMINAL.has(parsed.data.status)) {
    return { skipped: true };
  }
  const row = parsed.data;

  // Re-check: a capture deleted (or mid-delete) while its job sat in the
  // queue must not be processed or recreated.
  if (!(await captureOpen(captureId))) return { skipped: true };

  if (chunkIdx > 0) {
    const [prev] = await db
      .select({ status: chunks.status })
      .from(chunks)
      .where(and(eq(chunks.captureId, captureId), eq(chunks.idx, chunkIdx - 1)))
      .limit(1);

    const prevDone = !!prev && TERMINAL.has(prev.status as ChunkStatus);
    const waitedS = (Date.now() - row.createdAt.getTime()) / 1000;
    if (!prevDone && waitedS < ORDER_WAIT_S) {
      await job.moveToDelayed(Date.now() + ORDER_RECHECK_S * 1000, token);
      throw new DelayedError();
    }
  }

  await db
    .update(chunks)
    .set({ status: "processing" })
    .where(eq(chunks.id, row.id));

  try {
    const framesKept = await runPipeline(row);
    await db
      .update(chunks)
      .set({
        status: "processed",
        framesKept,
        error: null,
        processedAt: new Date(),
      })
      .where(eq(chunks.id, row.id));
    // await cleanupRaw(captureId, chunkIdx); TODO:META API CALLS AND THEN CLEANUP RAW
    return { framesKept };
  } catch (err) {
    // Deleted mid-processing: the cascade removed the row; skip quietly,
    // never mark the chunk failed or touch its storage again.
    if (!(await captureOpen(captureId))) return { skipped: true };

    const message = err instanceof Error ? err.message : String(err);
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    if (isLastAttempt) {
      await db
        .update(chunks)
        .set({
          status: "failed",
          error: message.slice(0, 2000),
          processedAt: new Date(),
        })
        .where(eq(chunks.id, row.id));
      await rm(frameDir(captureId, chunkIdx), { recursive: true, force: true });
      await cleanupRaw(captureId, chunkIdx);
    } else {
      await db
        .update(chunks)
        .set({ status: "uploaded", error: message.slice(0, 2000) })
        .where(eq(chunks.id, row.id));
    }
    throw err;
  }
}

export async function requeueOpenChunks() {
  await db
    .update(chunks)
    .set({ status: "uploaded" })
    .where(eq(chunks.status, "processing"));

  const open = await db
    .select({ captureId: chunks.captureId, idx: chunks.idx })
    .from(chunks)
    .where(eq(chunks.status, "uploaded"));

  await Promise.all(open.map((c) => enqueueChunk(c.captureId, c.idx)));
  if (open.length) console.warn(`[worker] requeued ${open.length} chunk(s)`);
}

let worker: Worker<ChunkJobData> | null = null;

export async function startChunkWorker() {
  if (worker) return worker;

  await requeueOpenChunks();

  worker = new Worker<ChunkJobData>(CHUNK_QUEUE, processor, {
    connection: redis,
    concurrency: 1,
  });

  worker.on("completed", (job) => console.log(`[worker] ${job.id} done`));
  worker.on("failed", (job, err) =>
    console.error(`[worker] ${job?.id} failed: ${err.message}`),
  );
  worker.on("error", (err) => console.error("[worker] error", err));

  return worker;
}

export async function stopChunkWorker() {
  await worker?.close();
  worker = null;
}
