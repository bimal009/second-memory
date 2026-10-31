import { DelayedError, Worker, type Job } from "bullmq";
import { and, eq, lt } from "drizzle-orm";
import { readdir, rm } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import sharp from "sharp";
import phash from "sharp-phash";
import distance from "sharp-phash/distance";
import {
  chunkUnderstandingSchema,
  chunkRowSchema,
  captureSummarySchema,
  FRAME_EVERY_S,
  ORDER_RECHECK_S,
  ORDER_WAIT_S,
  PHASH_MIN_DISTANCE,
  RUN_IDLE_END_S,
  STUCK_PROCESSING_S,
  SWEEP_INTERVAL_S,
  THUMB_WIDTH,
  type ChunkRow,
  type ChunkStatus,
  type ChunkUnderstanding,
  type CaptureSummary,
} from "@repo/types";
import { db } from "./db/index";
import {
  captures,
  chunks,
  dailyRecaps,
  memories,
  media,
  objects,
  reminders,
  sightings,
} from "./db/schema";
import { redis } from "./lib/redis";
import { describeChunk, summarizeCapture, transcribe } from "./lib/meta";
import { embed } from "./lib/embed";
import {
  CHUNK_QUEUE,
  enqueueChunk,
  enqueueSummary,
  SUMMARY_QUEUE,
  type ChunkJobData,
  type SummaryJobData,
} from "./lib/queue";
import {
  audioPath,
  chunkPath,
  ensureDir,
  frameDir,
  STORAGE_ROOT,
} from "./lib/storage";
import {
  convertMono,
  extractFrame,
  extractFrames,
  getMediaInfo,
  keepFrames,
} from "./services/ffmpeg";

const TERMINAL = new Set<ChunkStatus>(["processed", "skipped", "failed"]);
const OPEN = new Set<ChunkStatus>(["uploaded", "processing"]);

const frameOffsetS = (framePath: string) =>
  (parseInt(basename(framePath), 10) - 1) * FRAME_EVERY_S;

/** Absolute frame path -> storage key relative to STORAGE_ROOT ("capture/<id>/<idx>/frames/1.jpg"). */
const relKey = (absPath: string) =>
  relative(STORAGE_ROOT, absPath).replace(/\\/g, "/");

export type UnderstandInput = {
  chunk: ChunkRow;
  userId: string;
  frames: { path: string; offsetS: number }[];
  audioPath: string | null;
};

/** Strip code fences / stray prose around a model's JSON and Zod-parse it. */
function parseModelJson<T>(text: string, schema: { parse: (v: unknown) => T }): T {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return schema.parse(JSON.parse(stripped));
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

/**
 * First frame that survived keepFrames in the PREVIOUS chunk — its phash
 * decides whether this chunk's view actually changed.
 */
async function previousFirstFrameHash(
  captureId: string,
  idx: number,
): Promise<string | null> {
  if (idx === 0) return null;
  try {
    const files = (await readdir(frameDir(captureId, idx - 1)))
      .filter((f) => /^\d+\.jpg$/.test(f))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (files.length === 0) return null;
    return await phash(join(frameDir(captureId, idx - 1), files[0]));
  } catch {
    return null; // unreadable/absent previous frames -> don't skip
  }
}

/** Strict prompt + zod, one retry with the error text, thrown on double failure. */
async function understandWithRetry(
  transcript: string,
  frames: { path: string; offsetS: number }[],
): Promise<ChunkUnderstanding> {
  let retryHint = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await describeChunk(
      retryHint
        ? `${transcript}\n\nThat was not valid JSON (${retryHint}). Return ONLY the JSON object.`
        : transcript,
      frames.map((f) => f.path),
    );
    try {
      return parseModelJson(raw, chunkUnderstandingSchema);
    } catch (err) {
      retryHint = (err instanceof Error ? err.message : String(err)).slice(0, 300);
    }
  }
  throw new Error(retryHint);
}

async function understandChunk(
  input: UnderstandInput,
): Promise<"skipped" | "ok"> {
  const { chunk, userId, frames, audioPath: wav } = input;

  // 1. Skip rule: no speech AND view unchanged (first frame phash vs previous
  //    chunk's first kept frame) -> no model calls, no memory rows.
  const transcript = wav ? (await transcribe(wav)).trim() : "";
  if (transcript.length === 0 && frames.length > 0) {
    const prevHash = await previousFirstFrameHash(chunk.captureId, chunk.idx);
    if (prevHash) {
      const hash = await phash(frames[0].path);
      if (distance(hash, prevHash) < PHASH_MIN_DISTANCE) return "skipped";
    }
  }

  // 2. Describe (one vision call). Frames-only chunks (no audio stream) are
  //    still described — silence says nothing about what was seen.
  let understanding: ChunkUnderstanding;
  try {
    understanding =
      frames.length > 0
        ? await understandWithRetry(transcript, frames)
        : {
            note: transcript || "A segment with no extractable frames.",
            tags: [],
            objects: [],
            commitments: [],
          };
  } catch {
    // Describe failed twice -> transcript-only fallback, never lost data.
    understanding = {
      note: transcript || "Unlabeled segment.",
      tags: [],
      objects: [],
      commitments: [],
    };
  }

  // 3. Embed the note (local 384-dim, MiniLM).
  const embedding = await embed(understanding.note);

  // 4. 320px thumbnails next to the kept frames (frames/<n>.jpg + thumbs/<n>.jpg).
  await ensureDir(join(frameDir(chunk.captureId, chunk.idx), "thumbs"));
  const thumbs = await Promise.all(

    frames.map((f) => {
      const thumb = join(frameDir(chunk.captureId, chunk.idx), "thumbs", basename(f.path));
      return sharp(f.path)
        .resize({ width: THUMB_WIDTH })
        .jpeg({ quality: 80 })
        .toFile(thumb)
        .then(() => thumb);
    }),
  );

  // 5. ONE transaction: memory + frame/thumbnail media + sightings + reminders.
  await db.transaction(async (tx) => {
    const startedAt = chunk.startedAt;
    const windowEnd = new Date(startedAt.getTime() + chunk.durationS * 1000);

    const [memory] = await tx
      .insert(memories)
      .values({
        userId,
        captureId: chunk.captureId,
        chunkId: chunk.id,
        kind: "session_chunk",
        status: "ready",
        windowStart: startedAt,
        windowEnd,
        note: understanding.note,
        transcript: transcript || null,
        tags: understanding.tags,
        lat: chunk.lat,
        lng: chunk.lng,
        embedding,
        occurredAt: startedAt,
      })
      .returning({ id: memories.id });

    const frameRows = await tx
      .insert(media)
      .values(
        frames.map((f) => ({
          memoryId: memory.id,
          kind: "frame",
          storageKey: relKey(f.path),
          offsetMs: f.offsetS * 1000,
        })),
      )
      .returning({ id: media.id });

    if (thumbs.length > 0) {
      await tx.insert(media).values(
        thumbs.map((t, i) => ({
          memoryId: memory.id,
          parentId: frameRows[i].id,
          kind: "thumbnail",
          storageKey: relKey(t),
          offsetMs: frames[i].offsetS * 1000,
        })),
      );
    }

    // Sightings: one per distinct object label, anchored to the first frame.
    const uniqueLabels = [
      ...new Set(understanding.objects.map((l) => l.trim().toLowerCase())),
    ].filter((l) => l.length > 0 && l.length <= 80);
    for (const label of uniqueLabels) {
      const [inserted] = await tx
        .insert(objects)
        .values({ userId, label })
        .onConflictDoNothing()
        .returning({ id: objects.id });
      const objectId =
        inserted?.id ??
        (
          await tx
            .select({ id: objects.id })
            .from(objects)
            .where(and(eq(objects.userId, userId), eq(objects.label, label)))
            .limit(1)
        )[0]?.id;
      if (!objectId) continue;

      await tx.insert(sightings).values({
        objectId,
        memoryId: memory.id,
        frameId: frameRows[0]?.id ?? null,
        seenAt: startedAt,
      });
    }

    // Commitments with a stated time become reminders, deduped on
    // (user, text, due time).
    for (const commitment of understanding.commitments) {
      if (!commitment.due_at) continue;
      const due = new Date(commitment.due_at);
      const existing = await tx
        .select({ id: reminders.id })
        .from(reminders)
        .where(
          and(
            eq(reminders.userId, userId),
            eq(reminders.text, commitment.text),
            eq(reminders.dueAt, due),
          ),
        )
        .limit(1);
      if (existing.length > 0) continue;

      await tx.insert(reminders).values({
        userId,
        memoryId: memory.id,
        source: "commitment",
        text: commitment.text,
        dueAt: due,
      });
    }
  });

  return "ok";
}

async function runPipeline(row: ChunkRow): Promise<"skipped" | "ok"> {
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
    console.log(`[worker] chunk ${captureId}#${idx} audio extracted -> audio.wav`);
  } else {
    console.warn(
      `[worker] chunk ${captureId}#${idx} has no audio stream — skipping WAV (frames only)`,
    );
  }

  const userId = await captureUserId(captureId);
  if (!userId) throw new Error("capture deleted mid-processing");

  return understandChunk({
    chunk: row,
    userId,
    frames: kept.map((path) => ({ path, offsetS: frameOffsetS(path) })),
    audioPath: wav,
  });
}

async function keptFrameCount(captureId: string, idx: number): Promise<number> {
  try {
    const files = await readdir(frameDir(captureId, idx));
    return files.filter((f) => /^\d+\.jpg$/.test(f)).length;
  } catch {
    return 0;
  }
}

async function captureUserId(captureId: string): Promise<string | null> {
  const capture = await db.query.captures.findFirst({
    where: { id: captureId },
    columns: { userId: true },
  });
  return capture?.userId ?? null;
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
    const outcome = await runPipeline(row);
    await db
      .update(chunks)
      .set({
        status: outcome === "skipped" ? "skipped" : "processed",
        framesKept: await keptFrameCount(captureId, chunkIdx),
        error: null,
        processedAt: new Date(),
      })
      .where(eq(chunks.id, row.id));
    await cleanupRaw(captureId, chunkIdx); // raw video + WAV deleted; frames stay
    return { outcome };
  } catch (err) {
    // Deleted mid-processing: the row is gone; skip quietly, never mark the
    // chunk failed or touch its storage again.
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

// ---------------------------------------------------------------------------
// Capture summary (runs on /captures/:id/end once every chunk is terminal)
// ---------------------------------------------------------------------------

/** Session end -> local calendar day (YYYY-MM-DD) in the user's timezone. */
const localDay = (when: Date, timezone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(when);

async function summarizeProcessor(job: Job<SummaryJobData>, token?: string) {
  const { captureId } = job.data;

  const capture = await db.query.captures.findFirst({
    where: { id: captureId },
    with: {
      chunks: { columns: { status: true, startedAt: true } },
    },
  });
  if (!capture || capture.status !== "ending") return;

  // Tail chunks may still be uploading/processing after /end -> re-check later.
  const open = capture.chunks.filter((c) => OPEN.has(c.status as ChunkStatus));
  if (open.length > 0) {
    await job.moveToDelayed(Date.now() + 10_000, token);
    throw new DelayedError();
  }

  const user = await db.query.users.findFirst({
    where: { id: capture.userId },
    columns: { timezone: true },
  });
  const timezone = user?.timezone ?? "UTC";
  const now = new Date();
  const endedAt = capture.endedAt ?? now;

  const chunkRows = await db.query.chunks.findMany({
    where: { captureId },
    orderBy: { idx: "asc" },
    with: {
      memories: {
        columns: { note: true, occurredAt: true },
        where: { kind: "session_chunk" },
      },
    },
  });
  const notes = chunkRows.flatMap((c) =>
    c.memories.map((m) => ({ at: m.occurredAt, note: m.note })),
  );

  let summary: CaptureSummary;
  if (notes.length === 0) {
    summary = { summary: "No memorable moments were captured.", highlights: [], action_items: [] };
  } else {
    const content = [
      `Session: ${capture.createdAt.toISOString()} -> ${endedAt.toISOString()} (${timezone}).`,
      "Chunks, in order:",
      ...notes.map(
        (n) => `- ${n.at.toISOString()}: ${n.note}`,
      ),
    ].join("\n");

    let summary: CaptureSummary = {
      summary: "",
      highlights: [],
      action_items: [],
    };
    let retryHint = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await summarizeCapture(
        retryHint
          ? `${content}\n\nThat was not valid JSON (${retryHint}). Return ONLY the JSON object.`
          : content,
      );
      try {
        summary = parseModelJson(raw, captureSummarySchema);
        retryHint = "";
        break;
      } catch (err) {
        retryHint = (err instanceof Error ? err.message : String(err)).slice(0, 300);
      }
    }
    if (retryHint) {
      summary = {
        summary: notes.map((n) => n.note).join(" "),
        highlights: [],
        action_items: [],
      };
    }
  }

  await db.transaction(async (tx) => {
    const startedAt = capture.createdAt;

    const [memory] = await tx
      .insert(memories)
      .values({
        userId: capture.userId,
        captureId,
        kind: "session_summary",
        status: "ready",
        windowStart: startedAt,
        windowEnd: endedAt,
        note: summary.summary,
        tags: ["summary"],
        occurredAt: endedAt,
      })
      .returning({ id: memories.id });

    // Summary action items -> reminders, only when a time is stated.
    for (const item of summary.action_items) {
      if (!item.due_at) continue;
      const due = new Date(item.due_at);
      const existing = await tx
        .select({ id: reminders.id })
        .from(reminders)
        .where(
          and(
            eq(reminders.userId, capture.userId),
            eq(reminders.text, item.text),
            eq(reminders.dueAt, due),
          ),
        )
        .limit(1);
      if (existing.length > 0) continue;

      await tx.insert(reminders).values({
        userId: capture.userId,
        memoryId: memory.id,
        source: "summary",
        text: item.text,
        dueAt: due,
      });
    }

    // Upsert the day's recap (one capture may span midnight; last summary wins).
    await tx
      .insert(dailyRecaps)
      .values({
        userId: capture.userId,
        day: localDay(startedAt, timezone),
        summary: summary.summary,
        highlights: summary.highlights,
      })
      .onConflictDoUpdate({
        target: [dailyRecaps.userId, dailyRecaps.day],
        set: { summary: summary.summary, highlights: summary.highlights },
      });
  });

  await db
    .update(captures)
    .set({ status: "ready", processedAt: new Date(), error: null })
    .where(and(eq(captures.id, captureId), eq(captures.status, "ending")));

  console.log(`[worker] capture ${captureId} summarized -> ready`);
}

// ---------------------------------------------------------------------------
// Sweeps (plain setInterval in the server process, per spec)
// ---------------------------------------------------------------------------

export async function sweepOnce() {
  // Stuck `processing` chunks (crash mid-job) -> back to uploaded, re-queued.
  const stuck = await db
    .update(chunks)
    .set({ status: "uploaded", error: "sweep: processing timed out" })
    .where(
      and(
        eq(chunks.status, "processing"),
        lt(chunks.createdAt, new Date(Date.now() - STUCK_PROCESSING_S * 1000)),
      ),
    )
    .returning({ captureId: chunks.captureId, idx: chunks.idx });
  for (const s of stuck) await enqueueChunk(s.captureId, s.idx);

  // Recording captures idle beyond RUN_IDLE_END_S -> auto-end + summarize.
  const idle = await db.query.captures.findMany({
    where: { status: "recording" },
    columns: { id: true, createdAt: true },
    with: { chunks: { columns: { createdAt: true } } },
  });
  const idleCutoff = Date.now() - RUN_IDLE_END_S * 1000;
  for (const capture of idle) {
    const newest =
      capture.chunks.length > 0
        ? Math.max(...capture.chunks.map((c) => c.createdAt.getTime()))
        : capture.createdAt.getTime();
    if (newest > idleCutoff) continue;

    await db
      .update(captures)
      .set({ status: "ending", endedAt: new Date() })
      .where(and(eq(captures.id, capture.id), eq(captures.status, "recording")));
    await enqueueSummary(capture.id);
    console.warn(`[worker] capture ${capture.id} idle -> auto-ended`);
  }
}

let sweepInterval: NodeJS.Timeout | null = null;

let chunkWorker: Worker<ChunkJobData> | null = null;
let summaryWorker: Worker<SummaryJobData> | null = null;

export async function startChunkWorker() {
  if (chunkWorker) return chunkWorker;

  await requeueOpenChunks();

  chunkWorker = new Worker<ChunkJobData>(CHUNK_QUEUE, processor, {
    connection: redis,
    concurrency: 1,
  });

  chunkWorker.on("completed", (job) =>
    console.log(`[worker] ${job.id} done: ${JSON.stringify(job.returnvalue ?? {})}`),
  );
  chunkWorker.on("failed", (job, err) =>
    console.error(`[worker] ${job?.id} failed: ${err.message}`),
  );
  chunkWorker.on("error", (err) => console.error("[worker] error", err));

  return chunkWorker;
}

export async function startSummaryWorker() {
  if (summaryWorker) return summaryWorker;

  summaryWorker = new Worker<SummaryJobData>(
    SUMMARY_QUEUE,
    (job, token) => summarizeProcessor(job, token),
    { connection: redis, concurrency: 1 },
  );
  summaryWorker.on("failed", (job, err) =>
    console.error(`[summary] ${job?.id ?? ""} failed: ${err.message}`),
  );
  summaryWorker.on("error", (err) => console.error("[summary] error", err));

  return summaryWorker;
}

export function startSweeps() {
  if (sweepInterval) return;
  sweepInterval = setInterval(() => {
    void sweepOnce().catch((err) => console.error("[sweep] error", err));
  }, SWEEP_INTERVAL_S * 1000);
  sweepInterval.unref?.();
}

export async function stopChunkWorker() {
  await chunkWorker?.close();
  chunkWorker = null;
}

export async function stopSummaryWorker() {
  await summaryWorker?.close();
  summaryWorker = null;
}

export function stopSweeps() {
  if (sweepInterval) clearInterval(sweepInterval);
  sweepInterval = null;
}
