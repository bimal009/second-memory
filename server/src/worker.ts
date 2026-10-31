import { DelayedError, Worker, type Job } from "bullmq";
import { and, desc, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { readdir, rename, rm } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import sharp from "sharp";
import phash from "sharp-phash";
import distance from "sharp-phash/distance";
import { CHUNK_DURATION_S, chunkUnderstandingSchema, chunkRowSchema, captureSummarySchema, FRAME_EVERY_S, NUDGE_COOLDOWN_S, NUDGE_MIN_AGE_S, NUDGE_RADIUS_M, ORDER_RECHECK_S, ORDER_WAIT_S, PHASH_MIN_DISTANCE, RUN_IDLE_END_S, STUCK_PROCESSING_S, SWEEP_INTERVAL_S, THUMB_WIDTH, type ChunkRow, type ChunkStatus, type ChunkUnderstanding, type CaptureSummary, } from "@repo/types";
import { db } from "./db/index";
import { captures, chunks, dailyRecaps, memories, media, objects, reminders, sightings, } from "./db/schema";
import { redis } from "./lib/redis";
import { describeChunk, summarizeCapture, transcribe } from "./lib/meta";
import { embed } from "./lib/embed";
import { sendPush } from "./lib/push";
import { CHUNK_QUEUE, enqueueChunk, enqueueSummary, SUMMARY_QUEUE, type ChunkJobData, type SummaryJobData, } from "./lib/queue";
import { audioPath, chunkPath, ensureDir, frameDir, STORAGE_ROOT, } from "./lib/storage";
import { convertMono, extractFrame, extractFrames, getMediaInfo, keepFrames, } from "./services/ffmpeg";
const TERMINAL = new Set<ChunkStatus>(["processed", "skipped", "failed"]);
const OPEN = new Set<ChunkStatus>(["uploaded", "processing"]);
const frameOffsetS = (framePath: string) => (parseInt(basename(framePath), 10) - 1) * FRAME_EVERY_S;
const relKey = (absPath: string) => relative(STORAGE_ROOT, absPath).replace(/\\/g, "/");
export type UnderstandInput = {
    chunk: ChunkRow;
    userId: string;
    frames: {
        path: string;
        offsetS: number;
    }[];
    audioPath: string | null;
};
function parseModelJson<T>(text: string, schema: {
    parse: (v: unknown) => T;
}): T {
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
async function captureOpen(captureId: string): Promise<boolean> {
    const capture = await db.query.captures.findFirst({
        where: { id: captureId },
        columns: { status: true },
    });
    return !!capture && capture.status !== "deleting";
}
async function previousFirstFrameHash(captureId: string, idx: number): Promise<string | null> {
    if (idx === 0)
        return null;
    try {
        const files = (await readdir(frameDir(captureId, idx - 1)))
            .filter((f) => /^\d+\.jpg$/.test(f))
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
        if (files.length === 0)
            return null;
        return await phash(join(frameDir(captureId, idx - 1), files[0]));
    }
    catch {
        return null;
    }
}
async function understandChunk(input: UnderstandInput): Promise<"skipped" | "ok"> {
    const { chunk, userId, frames, audioPath: wav } = input;
    const [saved] = await db
        .select({ transcript: chunks.transcript })
        .from(chunks)
        .where(eq(chunks.id, chunk.id));
    let transcript = saved?.transcript ?? "";
    if (wav && saved?.transcript === null) {
        transcript = (await transcribe(wav)).trim();
        await db
            .update(chunks)
            .set({ transcript })
            .where(eq(chunks.id, chunk.id));
    }
    if (transcript.length === 0 && frames.length > 0) {
        const prevHash = await previousFirstFrameHash(chunk.captureId, chunk.idx);
        if (prevHash) {
            const hash = await phash(frames[0].path);
            if (distance(hash, prevHash) < PHASH_MIN_DISTANCE)
                return "skipped";
        }
    }
    const understanding: ChunkUnderstanding = frames.length > 0
        ? parseModelJson(await describeChunk(transcript, frames.map((f) => f.path)), chunkUnderstandingSchema)
        : {
            note: transcript || "A segment with no extractable frames.",
            tags: [],
            objects: [],
            commitments: [],
        };
    const embedding = await embed(understanding.note);
    await ensureDir(join(frameDir(chunk.captureId, chunk.idx), "thumbs"));
    const blurred = new Set<number>();
    if (process.env.FACE_BLUR !== "0") {
        for (const box of understanding.face_boxes ?? []) {
            const frame = frames[box.i];
            if (!frame || blurred.has(box.i)) continue;
            blurred.add(box.i);
            try {
                const meta = await sharp(frame.path).metadata();
                const width = meta.width ?? 0;
                const height = meta.height ?? 0;
                const pad = 0.02;
                const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
                const left = clamp(Math.round((box.x - pad) * width), 0, Math.max(0, width - 2));
                const top = clamp(Math.round((box.y - pad) * height), 0, Math.max(0, height - 2));
                const w = clamp(Math.round((box.w + 2 * pad) * width), 2, width - left);
                const h = clamp(Math.round((box.h + 2 * pad) * height), 2, height - top);
                const overlay = await sharp(await sharp(frame.path).blur(24).toBuffer())
                    .extract({ left, top, width: w, height: h })
                    .toBuffer();
                await sharp(frame.path).composite([{ input: overlay, left, top }]).toFile(`${frame.path}.c`);
                await rename(`${frame.path}.c`, frame.path);
            }
            catch (err) {
                console.warn(`[worker] face blur failed on chunk ${chunk.id}: ${err instanceof Error ? err.message : err}`);
            }
        }
    }
    const thumbs = await Promise.all(frames.map((f) => {
        const thumb = join(frameDir(chunk.captureId, chunk.idx), "thumbs", basename(f.path));
        return sharp(f.path)
            .resize({ width: THUMB_WIDTH })
            .jpeg({ quality: 80 })
            .toFile(thumb)
            .then(() => thumb);
    }));
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
            .values(frames.map((f) => ({
            memoryId: memory.id,
            kind: "frame",
            storageKey: relKey(f.path),
            offsetMs: f.offsetS * 1000,
        })))
            .returning({ id: media.id });
        if (thumbs.length > 0) {
            await tx.insert(media).values(thumbs.map((t, i) => ({
                memoryId: memory.id,
                parentId: frameRows[i].id,
                kind: "thumbnail",
                storageKey: relKey(t),
                offsetMs: frames[i].offsetS * 1000,
            })));
        }
        const uniqueLabels = [
            ...new Set(understanding.objects.map((l) => l.trim().toLowerCase())),
        ].filter((l) => l.length > 0 && l.length <= 80);
        for (const label of uniqueLabels) {
            const [inserted] = await tx
                .insert(objects)
                .values({ userId, label })
                .onConflictDoNothing()
                .returning({ id: objects.id });
            const objectId = inserted?.id ??
                (await tx
                    .select({ id: objects.id })
                    .from(objects)
                    .where(and(eq(objects.userId, userId), eq(objects.label, label)))
                    .limit(1))[0]?.id;
            if (!objectId)
                continue;
            await tx.insert(sightings).values({
                objectId,
                memoryId: memory.id,
                frameId: frameRows[0]?.id ?? null,
                seenAt: startedAt,
            });
        }
        for (const commitment of understanding.commitments) {
            if (!commitment.due_at)
                continue;
            const due = new Date(commitment.due_at);
            const existing = await tx
                .select({ id: reminders.id })
                .from(reminders)
                .where(and(eq(reminders.userId, userId), eq(reminders.text, commitment.text), eq(reminders.dueAt, due)))
                .limit(1);
            if (existing.length > 0)
                continue;
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
export async function finalizeMoments(captureId: string, windowEndClamp: Date) {
    const moments = await db.query.memories.findMany({
        where: { captureId, kind: "moment", status: "pending" },
        columns: {
            id: true,
            windowStart: true,
            windowEnd: true,
            lat: true,
            lng: true,
        },
    });
    if (moments.length === 0)
        return;
    const chunkMedia = await db.query.memories.findMany({
        where: { captureId, kind: "session_chunk", status: "ready" },
        columns: { id: true, occurredAt: true, lat: true, lng: true },
        with: {
            media: {
                columns: { id: true, kind: true, storageKey: true, offsetMs: true },
            },
        },
    });
    for (const moment of moments) {
        if (!moment.windowStart || !moment.windowEnd)
            continue;
        if (moment.windowEnd.getTime() > windowEndClamp.getTime())
            continue;
        const frames = chunkMedia
            .filter((cm) => cm.occurredAt.getTime() <= moment.windowEnd!.getTime() &&
            cm.occurredAt.getTime() + CHUNK_DURATION_S * 1000 >
                moment.windowStart!.getTime())
            .flatMap((cm) => cm.media
            .filter((f) => f.kind === "frame" &&
            cm.occurredAt.getTime() + f.offsetMs! >=
                moment.windowStart!.getTime() &&
            cm.occurredAt.getTime() + f.offsetMs! <=
                moment.windowEnd!.getTime())
            .map((f) => ({ ...f, occurredAt: cm.occurredAt })));
        const earliest = frames.length > 0
            ? frames
            : [nearestEarlierFrame(chunkMedia, moment.windowStart)];
        const chosenFrames = earliest.filter((f): f is NonNullable<typeof f> => !!f);
        if (chosenFrames.length > 0) {
            const thumbRows = await db
                .select({
                id: media.id,
                parentId: media.parentId,
                storageKey: media.storageKey,
            })
                .from(media)
                .where(inArray(media.parentId, chosenFrames.map((f) => f.id)));
            const thumbByParent = new Map(thumbRows.map((t) => [t.parentId, t] as const));
            await db.insert(media).values(chosenFrames.map((f) => ({
                memoryId: moment.id,
                kind: "frame",
                storageKey: f.storageKey,
                offsetMs: f.offsetMs,
            })));
            const thumbList = chosenFrames
                .map((f) => thumbByParent.get(f.id))
                .filter((t): t is (typeof thumbRows)[number] => !!t);
            if (thumbList.length > 0) {
                await db.insert(media).values(thumbList.map((t) => ({
                    memoryId: moment.id,
                    parentId: t.parentId,
                    kind: "thumbnail",
                    storageKey: t.storageKey,
                })));
            }
        }
        const covering = chunkMedia.find((cm) => cm.lat !== null && cm.lng !== null);
        await db
            .update(memories)
            .set({
            status: "ready",
            lat: moment.lat ?? covering?.lat ?? null,
            lng: moment.lng ?? covering?.lng ?? null,
        })
            .where(and(eq(memories.id, moment.id), eq(memories.status, "pending")));
        console.log(`[worker] moment ${moment.id} finalized (${chosenFrames.length} frames)`);
    }
}
function nearestEarlierFrame(chunkMedia: {
    occurredAt: Date;
    media: {
        id: string;
        kind: string;
        storageKey: string;
        offsetMs: number | null;
    }[];
}[], when: Date): {
    id: string;
    kind: string;
    storageKey: string;
    offsetMs: number | null;
    occurredAt: Date;
} | null {
    let best: {
        id: string;
        kind: string;
        storageKey: string;
        offsetMs: number | null;
        occurredAt: Date;
    } | null = null;
    let bestAt = -Infinity;
    for (const cm of chunkMedia) {
        for (const f of cm.media) {
            if (f.kind !== "frame")
                continue;
            const at = cm.occurredAt.getTime() + (f.offsetMs ?? 0);
            if (at > when.getTime())
                continue;
            if (at > bestAt) {
                best = { ...f, occurredAt: cm.occurredAt };
                bestAt = at;
            }
        }
    }
    return best;
}
async function runPipeline(row: ChunkRow): Promise<"skipped" | "ok"> {
    const { captureId, idx } = row;
    const raw = chunkPath(captureId, idx);
    const info = await getMediaInfo(raw);
    console.log(`[worker] chunk ${captureId}#${idx} probe: kind=${info.kind}, has_audio=${info.has_audio}, duration=${Math.round(info.duration)}s`);
    await db
        .update(chunks)
        .set({ durationS: Math.round(info.duration * 100) / 100 })
        .where(eq(chunks.id, row.id));
    if (info.kind !== "video")
        throw new Error("only video chunks are supported");
    const framesOut = frameDir(captureId, idx);
    await rm(framesOut, { recursive: true, force: true });
    await ensureDir(framesOut);
    let extracted = await extractFrames(raw, framesOut);
    if (extracted.length === 0) {
        extracted = [await extractFrame(raw, join(framesOut, "1.jpg"))];
    }
    const kept = await keepFrames(extracted);
    let wav: string | null = null;
    if (info.has_audio) {
        wav = await convertMono(raw, audioPath(captureId, idx));
        console.log(`[worker] chunk ${captureId}#${idx} audio extracted -> audio.wav`);
    }
    else {
        console.warn(`[worker] chunk ${captureId}#${idx} has no audio stream — skipping WAV (frames only)`);
    }
    const userId = await captureUserId(captureId);
    if (!userId)
        throw new Error("capture deleted mid-processing");
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
    }
    catch {
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
    if (!selected)
        return { skipped: true };
    const parsed = chunkRowSchema.safeParse(selected);
    if (!parsed.success || TERMINAL.has(parsed.data.status)) {
        return { skipped: true };
    }
    const row = parsed.data;
    if (!(await captureOpen(captureId)))
        return { skipped: true };
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
        await finalizeMoments(captureId, new Date(row.startedAt.getTime() + row.durationS * 1000));
        await cleanupRaw(captureId, chunkIdx);
        return { outcome };
    }
    catch (err) {
        if (!(await captureOpen(captureId)))
            return { skipped: true };
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
        }
        else {
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
    if (open.length)
        console.warn(`[worker] requeued ${open.length} chunk(s)`);
}
const localDay = (when: Date, timezone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(when);
async function summarizeProcessor(job: Job<SummaryJobData>, token?: string) {
    const { captureId } = job.data;
    const capture = await db.query.captures.findFirst({
        where: { id: captureId },
        with: {
            chunks: { columns: { status: true, startedAt: true } },
        },
    });
    if (!capture || capture.status !== "ending")
        return;
    const open = capture.chunks.filter((c) => OPEN.has(c.status as ChunkStatus));
    if (open.length > 0) {
        await job.moveToDelayed(Date.now() + 10000, token);
        throw new DelayedError();
    }
    const user = await db.query.users.findFirst({
        where: { id: capture.userId },
        columns: { timezone: true },
    });
    const timezone = user?.timezone ?? "UTC";
    const now = new Date();
    const endedAt = capture.endedAt ?? now;
    await finalizeMoments(captureId, endedAt);
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
    const notes = chunkRows.flatMap((c) => c.memories.map((m) => ({ at: m.occurredAt, note: m.note })));
    let summary: CaptureSummary;
    if (notes.length === 0) {
        summary = {
            summary: "No memorable moments were captured.",
            highlights: [],
            action_items: [],
        };
    }
    else {
        const content = [
            `Session: ${capture.createdAt.toISOString()} -> ${endedAt.toISOString()} (${timezone}).`,
            "Chunks, in order:",
            ...notes.map((n) => `- ${n.at.toISOString()}: ${n.note}`),
        ].join("\n");
        summary = parseModelJson(await summarizeCapture(content), captureSummarySchema);
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
        for (const item of summary.action_items) {
            if (!item.due_at)
                continue;
            const due = new Date(item.due_at);
            const existing = await tx
                .select({ id: reminders.id })
                .from(reminders)
                .where(and(eq(reminders.userId, capture.userId), eq(reminders.text, item.text), eq(reminders.dueAt, due)))
                .limit(1);
            if (existing.length > 0)
                continue;
            await tx.insert(reminders).values({
                userId: capture.userId,
                memoryId: memory.id,
                source: "summary",
                text: item.text,
                dueAt: due,
            });
        }
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
    await sendPush(capture.userId, "Daily recap ready", summary.summary);
    await db
        .update(captures)
        .set({ status: "ready", processedAt: new Date(), error: null })
        .where(and(eq(captures.id, captureId), eq(captures.status, "ending")));
    console.log(`[worker] capture ${captureId} summarized -> ready`);
}
export async function sweepOnce() {
    const stuck = await db
        .update(chunks)
        .set({ status: "uploaded", error: "sweep: processing timed out" })
        .where(and(eq(chunks.status, "processing"), lt(chunks.createdAt, new Date(Date.now() - STUCK_PROCESSING_S * 1000))))
        .returning({ captureId: chunks.captureId, idx: chunks.idx });
    for (const s of stuck)
        await enqueueChunk(s.captureId, s.idx);
    const idle = await db.query.captures.findMany({
        where: { status: "recording" },
        columns: { id: true, createdAt: true },
        with: { chunks: { columns: { createdAt: true } } },
    });
    const idleCutoff = Date.now() - RUN_IDLE_END_S * 1000;
    for (const capture of idle) {
        const newest = capture.chunks.length > 0
            ? Math.max(...capture.chunks.map((c) => c.createdAt.getTime()))
            : capture.createdAt.getTime();
        if (newest > idleCutoff)
            continue;
        await db
            .update(captures)
            .set({ status: "ending", endedAt: new Date() })
            .where(and(eq(captures.id, capture.id), eq(captures.status, "recording")));
        await enqueueSummary(capture.id);
        console.warn(`[worker] capture ${capture.id} idle -> auto-ended`);
    }
}

function distanceM(la1: number, lo1: number, la2: number, lo2: number): number {
    const rad = Math.PI / 180;
    const dLat = (la2 - la1) * rad;
    const dLng = (lo2 - lo1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

export async function sweepNudges() {
    const tracked = await db.query.objects.findMany({
        where: { tracked: true },
        columns: { id: true, userId: true, label: true, lastNudgedAt: true },
        with: {
            sightings: {
                orderBy: { seenAt: "desc" },
                limit: 1,
                columns: { seenAt: true },
                with: { memory: { columns: { lat: true, lng: true, occurredAt: true } } },
            },
        },
    });
    for (const object of tracked) {
        if (object.lastNudgedAt && object.lastNudgedAt.getTime() > Date.now() - NUDGE_COOLDOWN_S * 1000)
            continue;
        const sighting = object.sightings[0];
        if (!sighting?.memory.lat || !sighting.memory.lng)
            continue;
        if (sighting.seenAt.getTime() > Date.now() - NUDGE_MIN_AGE_S * 1000)
            continue;
        const where = await db
            .select({ lat: memories.lat, lng: memories.lng })
            .from(memories)
            .where(and(eq(memories.userId, object.userId), eq(memories.status, "ready"), isNotNull(memories.lat)))
            .orderBy(desc(memories.occurredAt))
            .limit(1);
        const spot = where[0];
        if (!spot)
            continue;
        if (distanceM(sighting.memory.lat, sighting.memory.lng, spot.lat!, spot.lng!) <= NUDGE_RADIUS_M)
            continue;
        await db.insert(reminders).values({
            userId: object.userId,
            source: "nudge",
            text: `Looks like you left your ${object.label} behind.`,
            dueAt: new Date(),
        });
        await db
            .update(objects)
            .set({ lastNudgedAt: new Date() })
            .where(eq(objects.id, object.id));
        await sendPush(object.userId, "Second Memory", `Looks like you left your ${object.label} behind.`);
        console.log(`[worker] nudge: ${object.label} for user ${object.userId}`);
    }
}

export async function sweepReminders() {
    const due = await db
        .update(reminders)
        .set({ notifiedAt: new Date() })
        .where(and(
            eq(reminders.status, "pending"),
            isNull(reminders.notifiedAt),
            lt(reminders.dueAt, new Date()),
        ))
        .returning({ id: reminders.id, userId: reminders.userId, text: reminders.text });
    for (const reminder of due) {
        await sendPush(reminder.userId, "Reminder", reminder.text);
        console.log(`[worker] reminder ${reminder.id} pushed`);
    }
}
let sweepInterval: NodeJS.Timeout | null = null;
let chunkWorker: Worker<ChunkJobData> | null = null;
let summaryWorker: Worker<SummaryJobData> | null = null;
export async function startChunkWorker() {
    if (chunkWorker)
        return chunkWorker;
    await requeueOpenChunks();
    chunkWorker = new Worker<ChunkJobData>(CHUNK_QUEUE, processor, {
        connection: redis,
        concurrency: 1,
    });
    chunkWorker.on("completed", (job) => console.log(`[worker] ${job.id} done: ${JSON.stringify(job.returnvalue ?? {})}`));
    chunkWorker.on("failed", (job, err) => console.error(`[worker] ${job?.id} failed: ${err.message}`));
    chunkWorker.on("error", (err) => console.error("[worker] error", err));
    return chunkWorker;
}
export async function startSummaryWorker() {
    if (summaryWorker)
        return summaryWorker;
    summaryWorker = new Worker<SummaryJobData>(SUMMARY_QUEUE, (job, token) => summarizeProcessor(job, token), { connection: redis, concurrency: 1 });
    summaryWorker.on("failed", (job, err) => console.error(`[summary] ${job?.id ?? ""} failed: ${err.message}`));
    summaryWorker.on("error", (err) => console.error("[summary] error", err));
    return summaryWorker;
}
export function startSweeps() {
    if (sweepInterval)
        return;
    sweepInterval = setInterval(() => {
        void sweepOnce().catch((err) => console.error("[sweep] error", err));
        void sweepNudges().catch((err) => console.error("[nudge] error", err));
        void sweepReminders().catch((err) => console.error("[reminders] error", err));
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
    if (sweepInterval)
        clearInterval(sweepInterval);
    sweepInterval = null;
}
