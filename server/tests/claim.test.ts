import { Hono } from "hono";
import { rm } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import type { Job } from "bullmq";
import { DelayedError } from "bullmq";
import { auth } from "../src/middleware/auth";
import { captureRouter } from "../src/routes/capture";
import { db, closeDb } from "../src/db/index";
import { users, captures, chunks, memories, objects } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";
import { CHUNK_QUEUE, type ChunkJobData } from "../src/lib/queue";
import { startChunkWorker, stopChunkWorker } from "../src/worker";
import { captureDir } from "../src/lib/storage";

vi.mock("../src/lib/meta", () => ({
    chat: vi.fn(),
    intentPlan: vi.fn(),
    transcribe: vi.fn(),
    vision: vi.fn(),
    segment: vi.fn(async () => []),
    describeChunk: vi.fn(),
    summarizeCapture: vi.fn(),
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

const app = () => {
    const root = new Hono<{ Variables: { userId: string } }>();
    root.use("*", auth);
    root.route("/captures", captureRouter);
    return root;
};

const KEY = `claim-key-${crypto.randomUUID()}`;
const uuid = () => crypto.randomUUID();
let userId = "";

type FakeJob = {
    id: string;
    data: ChunkJobData;
    opts: { attempts: number };
    attemptsMade: number;
    moveToDelayed: ReturnType<typeof vi.fn>;
};

function fakeJob(captureId: string, chunkIdx: number, attempts = 1): Job<ChunkJobData> {
    return {
        id: `${captureId}#${chunkIdx}`,
        data: { captureId, chunkIdx },
        opts: { attempts },
        attemptsMade: 0,
        moveToDelayed: vi.fn(async () => {}),
    } as unknown as Job<ChunkJobData>;
}

async function newCapture(): Promise<string> {
    const res = await app().request("/captures", {
        method: "POST",
        headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    return body.data.id;
}

async function seedChunk(captureId: string, idx: number, status: string, backdateS = 0) {
    const [row] = await db
        .insert(chunks)
        .values({ captureId, idx, startedAt: new Date(), durationS: 30 })
        .returning({ id: chunks.id });
    await db.update(chunks).set({ status }).where(eq(chunks.id, row!.id));
    if (backdateS > 0) {
        await db
            .update(chunks)
            .set({ createdAt: new Date(Date.now() - backdateS * 1000) })
            .where(eq(chunks.id, row!.id));
    }
    return row!.id;
}

const rowOf = (captureId: string, idx: number) =>
    db
        .select({ status: chunks.status, error: chunks.error })
        .from(chunks)
        .where(and(eq(chunks.captureId, captureId), eq(chunks.idx, idx)))
        .limit(1)
        .then((rows) => rows[0]);

const run = async (job: Job<ChunkJobData>) => {
    const moveToDelayed = (job as unknown as FakeJob).moveToDelayed;
    let thrown: unknown = null;
    try {
        await chunkProcessor!(job);
    } catch (err) {
        thrown = err;
    }
    return { thrown, calls: moveToDelayed.mock.calls };
};

beforeAll(async () => {
    const [user] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY) })
        .returning({ id: users.id });
    userId = user.id;
    await startChunkWorker();
    expect(chunkProcessor).not.toBeNull();
});

afterEach(async () => {
    await db.delete(memories).where(eq(memories.userId, userId));
    const rows = await db.query.captures.findMany({ where: { userId }, columns: { id: true } });
    for (const capture of rows) {
        await rm(captureDir(capture.id), { recursive: true, force: true });
    }
    await db.delete(captures).where(eq(captures.userId, userId));
});

afterAll(async () => {
    await stopChunkWorker();
    await db.delete(objects).where(eq(objects.userId, userId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
    await closeDb();
});

describe("ordered chunk claim", () => {
    it("delays the next chunk while the previous one is still open", async () => {
        const captureId = await newCapture();
        await seedChunk(captureId, 0, "uploaded");
        await seedChunk(captureId, 1, "uploaded");
        const { thrown, calls } = await run(fakeJob(captureId, 1));

        expect(thrown).toBeInstanceOf(DelayedError);
        expect(calls.length).toBe(1);
        const [delay] = calls[0] as [number];
        expect(delay).toBeGreaterThan(Date.now() + 1000);
        expect(delay).toBeLessThan(Date.now() + 20_000);
        const row = await rowOf(captureId, 1);
        expect(row!.status).toBe("uploaded");
        expect(row!.error).toBeNull();
    });

    it("skips jobs whose chunk row is missing or already terminal", async () => {
        const captureId = await newCapture();
        expect(await chunkProcessor!(fakeJob(captureId, 7))).toEqual({ skipped: true });
        await seedChunk(captureId, 0, "processed");
        expect(await chunkProcessor!(fakeJob(captureId, 0))).toEqual({ skipped: true });
        const row = await rowOf(captureId, 0);
        expect(row!.status).toBe("processed");
    });

    it("proceeds once the earlier chunk finished", async () => {
        const captureId = await newCapture();
        await seedChunk(captureId, 0, "processed");
        await seedChunk(captureId, 1, "uploaded");
        const { thrown, calls } = await run(fakeJob(captureId, 1));

        expect(thrown).not.toBeInstanceOf(DelayedError);
        expect(calls.length).toBe(0);
        const row = await rowOf(captureId, 1);
        expect(row!.status).toBe("failed");
        expect(row!.error).not.toBeNull();
    });

    it("proceeds past the wait window even with an earlier open chunk", async () => {
        const captureId = await newCapture();
        await seedChunk(captureId, 0, "uploaded");
        await seedChunk(captureId, 1, "uploaded", 200);
        const { thrown, calls } = await run(fakeJob(captureId, 1));

        expect(thrown).not.toBeInstanceOf(DelayedError);
        expect(calls.length).toBe(0);
        const row = await rowOf(captureId, 1);
        expect(row!.status).toBe("failed");
        expect(row!.error).not.toBeNull();
    });
});
