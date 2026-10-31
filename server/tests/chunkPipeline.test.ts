import { execFile } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import type { Job } from "bullmq";
import sharp from "sharp";
import { db, closeDb } from "../src/db/index";
import { users, captures, chunks, memories, media, objects } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";
import { CHUNK_QUEUE, type ChunkJobData } from "../src/lib/queue";
import { keepFrames, capFrames } from "../src/services/ffmpeg";
import { startChunkWorker, stopChunkWorker } from "../src/worker";
import { captureDir, chunkDir, chunkPath, ensureChunkDir, frameDir } from "../src/lib/storage";
import { describeChunk, transcribe } from "../src/lib/meta";
import { embed } from "../src/lib/embed";

vi.mock("../src/lib/meta", () => ({
    chat: vi.fn(),
    intentPlan: vi.fn(),
    transcribe: vi.fn(),
    vision: vi.fn(),
    segment: vi.fn(async () => []),
    describeChunk: vi.fn(),
    summarizeCapture: vi.fn(),
}));
vi.mock("../src/lib/embed", () => ({
    embed: vi.fn(async () => new Array(384).fill(0.1)),
}));
vi.mock("../src/lib/queue", () => ({
    chunkQueue: { remove: vi.fn() },
    chunkJobId: (captureId: string, idx: number) => `${captureId}#${idx}`,
    enqueueChunk: vi.fn(),
    enqueueSummary: vi.fn(async () => {}),
    CHUNK_QUEUE: "chunks",
    SUMMARY_QUEUE: "summary",
}));
vi.mock("../src/lib/redis", () => ({ redis: {} }));

type ChunkProcessor = (job: Job<ChunkJobData>, token?: string) => Promise<unknown>;
let chunkProcessor: ChunkProcessor | null = null;

vi.mock("bullmq", () => ({
    Worker: class {
        constructor(_queue: string, fn: unknown) {
            if (_queue === CHUNK_QUEUE) chunkProcessor = fn as ChunkProcessor;
        }
        on() { return this; }
    },
    Queue: class {},
    DelayedError: class DelayedError extends Error {
        name = "DelayedError";
    },
}));

const execFileAsync = promisify(execFile);
const describeMock = vi.mocked(describeChunk);
const transcribeMock = vi.mocked(transcribe);
const embedMock = vi.mocked(embed);

const CHUNK_DURATION = 30;
const t0 = Date.UTC(2026, 9, 31, 12, 0, 0);

const BASE_UNDERSTANDING = {
    note: "saw a tall red wall",
    tags: ["red", "wall"],
    objects: ["Blue Sedan"],
    commitments: [],
    face_boxes: [],
};

type FakeJob = {
    id: string;
    data: ChunkJobData;
    opts: { attempts: number };
    attemptsMade: number;
};

function fakeJob(captureId: string, chunkIdx: number, attempts = 1): Job<ChunkJobData> {
    return {
        id: `${captureId}#${chunkIdx}`,
        data: { captureId, chunkIdx },
        opts: { attempts },
        attemptsMade: 0,
    } as unknown as Job<ChunkJobData>;
}

async function newCapture(userId: string): Promise<string> {
    const [capture] = await db
        .insert(captures)
        .values({ userId, status: "recording" })
        .returning({ id: captures.id });
    return capture.id;
}

async function seedChunk(
    captureId: string,
    idx: number,
    values: Partial<{ durationS: number; lat: number; lng: number; transcript: string }> = {},
): Promise<string> {
    const [row] = await db
        .insert(chunks)
        .values({
            captureId,
            idx,
            startedAt: new Date(t0),
            durationS: values.durationS ?? CHUNK_DURATION,
            lat: values.lat,
            lng: values.lng,
            transcript: values.transcript,
        })
        .returning({ id: chunks.id });
    return row.id;
}

async function makeChunkVideo(captureId: string, idx: number, seconds: number, src: string, withAudio = false) {
    const target = chunkPath(captureId, idx);
    await ensureChunkDir(captureId, idx);
    const inputs = ["-f", "lavfi", "-i", src];
    if (withAudio) inputs.push("-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}`);
    await execFileAsync(
        "ffmpeg",
        [
            "-v", "error", "-y",
            ...inputs,
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
            ...(withAudio ? ["-c:a", "aac"] : []),
            target,
        ],
        { timeout: 60_000 },
    );
}

const colorSrc = (color: string, seconds: number) => `color=c=${color}:s=64x48:d=${seconds}:r=8`;
const testSrc = (seconds: number) => `testsrc2=s=64x48:d=${seconds}:r=8`;

async function run(job: Job<ChunkJobData>) {
    let thrown: unknown = null;
    try {
        await chunkProcessor!(job);
    } catch (err) {
        thrown = err;
    }
    return thrown;
}

const chunkRow = async (captureId: string, idx: number) =>
    db
        .select()
        .from(chunks)
        .where(and(eq(chunks.captureId, captureId), eq(chunks.idx, idx)))
        .limit(1)
        .then((rows) => rows[0]);

const memoryOf = async (captureId: string, idx: number) => {
    const row = await chunkRow(captureId, idx);
    return db.query.memories.findFirst({
        where: { chunkId: row!.id },
        with: {
            media: { columns: { kind: true, offsetMs: true, storageKey: true } },
        },
    });
};

const KEY = `pipe2-key-${crypto.randomUUID()}`;
let userId = "";
let captureId = "";

beforeAll(async () => {
    const [user] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY) })
        .returning({ id: users.id });
    userId = user.id;
    captureId = await newCapture(userId);
    describeMock.mockImplementation(async () => JSON.stringify(BASE_UNDERSTANDING));
    await startChunkWorker();
    expect(chunkProcessor).not.toBeNull();
});

afterEach(async () => {
    await db.delete(sightingsTableCleanup());
    await db.delete(memories).where(eq(memories.userId, userId));
    await db.delete(objects).where(eq(objects.userId, userId));
    describeMock.mockImplementation(async () => JSON.stringify(BASE_UNDERSTANDING));
    embedMock.mockImplementation(async () => new Array(384).fill(0.1));
    transcribeMock.mockImplementation(async () => "hello from the mic");
});

afterAll(async () => {
    await stopChunkWorker();
    if (captureId) await rm(captureDir(captureId), { recursive: true, force: true });
    if (userId) await db.delete(users).where(eq(users.id, userId));
    await closeDb();
});

describe("chunk pipeline", () => {
    it("processes a full chunk and persists the understanding transaction", async () => {
        await makeChunkVideo(captureId, 0, CHUNK_DURATION, colorSrc("red", CHUNK_DURATION));
        const thrown = await run(fakeJob(captureId, 0, 2));
        expect(thrown).toBeNull();

        const row = await chunkRow(captureId, 0);
        expect(row!.status).toBe("processed");
        expect(row!.framesKept).toBeGreaterThan(0);
        expect(row!.rawDeletedAt).not.toBeNull();

        const memory = await memoryOf(captureId, 0);
        expect(memory!.kind).toBe("session_chunk");
        expect(memory!.status).toBe("ready");
        expect(memory!.note).toBe("saw a tall red wall");
        expect(memory!.tags).toEqual(["red", "wall"]);
        expect(memory!.lat).toBeNull();
        expect(memory!.windowStart!.getTime()).toBe(t0);
        expect(memory!.windowEnd!.getTime()).toBe(t0 + CHUNK_DURATION * 1000);
        const frames = memory!.media.filter((m) => m.kind === "frame");
        expect(frames.length).toBe(row!.framesKept);
        for (const frame of frames) {
            expect(frame.offsetMs! % 4000).toBe(0);
        }
        expect(memory!.media.filter((m) => m.kind === "thumbnail").length).toBe(frames.length);
        expect(frames.length).toBeLessThanOrEqual(8);

        const object = await db.query.objects.findFirst({
            where: { userId, label: "blue sedan" },
            with: { sightings: true },
        });
        expect(object).not.toBeNull();
        expect(object!.sightings.length).toBe(1);
        expect(object!.sightings[0].seenAt.getTime()).toBe(t0);
        expect(object!.sightings[0].frameId).not.toBeNull();
    });

    it("skips a near-duplicate continuation chunk and writes nothing", async () => {
        await makeChunkVideo(captureId, 1, CHUNK_DURATION, colorSrc("red", CHUNK_DURATION));
        const thrown = await run(fakeJob(captureId, 1, 2));
        expect(thrown).toBeNull();

        const row = await chunkRow(captureId, 1);
        expect(row!.status).toBe("skipped");
        const memory = await memoryOf(captureId, 1);
        expect(memory).toBeUndefined();
        const object = await db.query.objects.findFirst({ where: { userId, label: "blue sedan" } });
        expect(object).toBeNull();
    });

    it("keeps a visually distinct continuation chunk", async () => {
        await makeChunkVideo(captureId, 2, CHUNK_DURATION, testSrc(CHUNK_DURATION));
        const thrown = await run(fakeJob(captureId, 2, 2));
        expect(thrown).toBeNull();
        const row = await chunkRow(captureId, 2);
        expect(row!.status).toBe("processed");
        expect(await memoryOf(captureId, 2)).not.toBeUndefined();
    });

    it("samples at least one frame from a chunk shorter than the frame interval", async () => {
        await makeChunkVideo(captureId, 3, 2, colorSrc("blue", 2));
        const thrown = await run(fakeJob(captureId, 3, 2));
        expect(thrown).toBeNull();

        const row = await chunkRow(captureId, 3);
        expect(row!.status).toBe("processed");
        expect(row!.framesKept).toBe(1);
        const memory = await memoryOf(captureId, 3);
        expect(memory).not.toBeUndefined();
        expect(memory!.media.filter((m) => m.kind === "frame").length).toBe(1);
    });

    it("caps kept frames at the image cap and force-keeps the ends", async () => {
        const paths: string[] = [];
        for (let i = 0; i < 12; i++) {
            const path = join(frameDir(captureId, 90), `${i}.jpg`);
            const data = new Uint8Array(64 * 64 * 3);
            crypto.getRandomValues(data);
            await sharp(data.buffer, { raw: { width: 64, height: 64, channels: 3 } })
                .jpeg()
                .toFile(path);
            paths.push(path);
        }
        const kept = await keepFrames(paths);
        expect(kept.length).toBe(8);
        expect(kept[0]).toBe(paths[0]);
        expect(kept[kept.length - 1]).toBe(paths[11]);
        const dropped = paths.filter((p) => !kept.includes(p));
        expect(dropped.length).toBe(4);
        await expect(keepFrames([])).resolves.toEqual([]);

        const pick = capFrames(paths.map((_, i) => i));
        expect(pick.length).toBe(8);
        expect(pick[0]).toBe(0);
        expect(pick[pick.length - 1]).toBe(11);
        await rm(frameDir(captureId, 90), { recursive: true, force: true });
    });

    it("rolls back everything when the database transaction fails", async () => {
        await makeChunkVideo(captureId, 5, CHUNK_DURATION, colorSrc("red", CHUNK_DURATION));
        embedMock.mockImplementationOnce(async () => new Array(10).fill(0.2));
        const thrown = await run(fakeJob(captureId, 5));
        expect(thrown).not.toBeNull();

        const row = await chunkRow(captureId, 5);
        expect(row!.status).toBe("failed");
        expect(row!.error).not.toBeNull();
        expect(row!.rawDeletedAt).not.toBeNull();
        expect(await memoryOf(captureId, 5)).toBeUndefined();
        await expect(rm(frameDir(captureId, 5), { recursive: true, force: true })).resolves.toBeUndefined();
        const chunksBefore = await db
            .select({ id: chunks.id })
            .from(chunks)
            .where(eq(chunks.captureId, captureId));
        expect(chunksBefore.length).toBe(6);
    });

    it("retries without retranscribing when audio was already transcribed", async () => {
        await makeChunkVideo(captureId, 4, CHUNK_DURATION, colorSrc("red", CHUNK_DURATION), true);
        const chunkId = await seedChunk(captureId, 4);
        expect(chunkId).toBeTruthy();
        describeMock
            .mockRejectedValueOnce(new Error("describe exploded"))
            .mockImplementation(async () => JSON.stringify(BASE_UNDERSTANDING));

        expect(await run(fakeJob(captureId, 4, 2))).not.toBeNull();
        let row = await chunkRow(captureId, 4);
        expect(row!.status).toBe("uploaded");
        expect(row!.transcript).toBe("hello from the mic");
        expect(transcribeMock).toHaveBeenCalledTimes(1);

        const memory = await memoryOf(captureId, 4);
        expect(memory).not.toBeUndefined();
        expect(memory!.transcript).toBe("hello from the mic");
        row = await chunkRow(captureId, 4);
        expect(row!.status).toBe("processed");
        expect(transcribeMock).toHaveBeenCalledTimes(1);
        expect(describeMock).toHaveBeenCalledTimes(2);
        expect(describeMock.mock.calls[1][0]).toBe("hello from the mic");
    });

    it("uses a preseeded transcript and never calls transcribe", async () => {
        await makeChunkVideo(captureId, 6, CHUNK_DURATION, colorSrc("red", CHUNK_DURATION), true);
        await seedChunk(captureId, 6, { transcript: "pre written words" });
        transcribeMock.mockClear();

        const thrown = await run(fakeJob(captureId, 6, 2));
        expect(thrown).toBeNull();
        expect(transcribeMock).not.toHaveBeenCalled();
        const row = await chunkRow(captureId, 6);
        expect(row!.status).toBe("processed");
        const memory = await memoryOf(captureId, 6);
        expect(memory!.transcript).toBe("pre written words");
    });

    it("skips jobs with no chunk row, a terminal chunk, or a closed capture", async () => {
        expect(await chunkProcessor!(fakeJob(captureId, 99))).toEqual({ skipped: true });
        await makeChunkVideo(captureId, 7, CHUNK_DURATION, colorSrc("red", CHUNK_DURATION));
        await seedChunk(captureId, 7);
        await db.update(captures).set({ status: "deleting" }).where(eq(captures.id, captureId));
        expect(await chunkProcessor!(fakeJob(captureId, 7))).toEqual({ skipped: true });
        const row = await chunkRow(captureId, 7);
        expect(row!.status).toBe("uploaded");
        const files = await readdir(chunkDir(captureId, 7));
        expect(files.filter((f) => f !== "video.mp4")).toEqual([]);
    });
});
