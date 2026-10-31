import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, closeDb } from "../src/db/index";
import { users, captures, chunks, memories, objects } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";
import { enqueueChunk, enqueueSummary } from "../src/lib/queue";
import { sweepOnce } from "../src/worker";

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

const enqueueChunkMock = vi.mocked(enqueueChunk);
const enqueueSummaryMock = vi.mocked(enqueueSummary);

const KEY = `sweep-key-${crypto.randomUUID()}`;
let userId = "";

async function seedCapture(status: string, backdateS = 0): Promise<string> {
    const [capture] = await db
        .insert(captures)
        .values({ userId, status, createdAt: new Date(Date.now() - backdateS * 1000) })
        .returning({ id: captures.id });
    return capture.id;
}

async function seedChunk(captureId: string, idx: number, status: string, backdateS = 0): Promise<string> {
    const [chunk] = await db
        .insert(chunks)
        .values({
            captureId,
            idx,
            startedAt: new Date(Date.now() - 120_000),
            durationS: 30,
            status,
            createdAt: new Date(Date.now() - backdateS * 1000),
        })
        .returning({ id: chunks.id });
    return chunk.id;
}

const captureOf = (id: string) => db.select().from(captures).where(eq(captures.id, id)).then((rows) => rows[0]);
const chunkOf = (id: string) => db.select().from(chunks).where(eq(chunks.id, id)).then((rows) => rows[0]);

beforeAll(async () => {
    const [user] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY) })
        .returning({ id: users.id });
    userId = user.id;
});

afterEach(async () => {
    await db.delete(memories).where(eq(memories.userId, userId));
    await db.delete(captures).where(eq(captures.userId, userId));
    enqueueChunkMock.mockClear();
    enqueueSummaryMock.mockClear();
});

afterAll(async () => {
    await db.delete(objects).where(eq(objects.userId, userId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
    await closeDb();
});

describe("idle capture sweep", () => {
    it("auto-ends recording captures idle past the threshold and queues their summary", async () => {
        const idleEmpty = await seedCapture("recording", 1200);
        const idleWithChunks = await seedCapture("recording", 1200);
        await seedChunk(idleWithChunks, 0, "uploaded", 1500);
        const fresh = await seedCapture("recording");
        const pausedIdle = await seedCapture("paused", 1200);

        await sweepOnce();

        const endedEmpty = await captureOf(idleEmpty);
        expect(endedEmpty!.status).toBe("ending");
        expect(endedEmpty!.endedAt).not.toBeNull();
        const endedChunks = await captureOf(idleWithChunks);
        expect(endedChunks!.status).toBe("ending");
        expect(endedChunks!.endedAt).not.toBeNull();
        const untouchedFresh = await captureOf(fresh);
        expect(untouchedFresh!.status).toBe("recording");
        expect(untouchedFresh!.endedAt).toBeNull();
        const untouchedPaused = await captureOf(pausedIdle);
        expect(untouchedPaused!.status).toBe("paused");

        expect(enqueueSummaryMock.mock.calls.map((c) => c[0]).sort()).toEqual(
            [idleEmpty, idleWithChunks].sort(),
        );
        expect(enqueueChunkMock).not.toHaveBeenCalled();
    });
});

describe("stuck processing sweep", () => {
    it("requeues chunks stuck in processing and leaves fresh ones alone", async () => {
        const captureId = await seedCapture("recording");
        const stuckId = await seedChunk(captureId, 0, "processing", 400);
        const freshId = await seedChunk(captureId, 1, "processing", 5);
        const endedId = await seedChunk(captureId, 2, "processed", 400);

        await sweepOnce();

        const stuck = await chunkOf(stuckId);
        expect(stuck!.status).toBe("uploaded");
        expect(stuck!.error).toBe("sweep: processing timed out");
        expect(enqueueChunkMock.mock.calls.map((c) => `${c[0]}#${c[1]}`)).toEqual([`${captureId}#0`]);

        const fresh = await chunkOf(freshId);
        expect(fresh!.status).toBe("processing");
        expect(fresh!.error).toBeNull();
        const untouchedEnded = await chunkOf(endedId);
        expect(untouchedEnded!.status).toBe("processed");
        const capture = await captureOf(captureId);
        expect(capture!.status).toBe("recording");
    });

    it("does not sweep a freshly uploaded chunk back into the queue", async () => {
        const captureId = await seedCapture("recording");
        await seedChunk(captureId, 0, "uploaded", 2);
        await sweepOnce();
        expect(enqueueChunkMock).not.toHaveBeenCalled();
        const [row] = await db
            .select({ status: chunks.status, error: chunks.error })
            .from(chunks)
            .where(and(eq(chunks.captureId, captureId), eq(chunks.idx, 0)));
        expect(row!.status).toBe("uploaded");
        expect(row!.error).toBeNull();
    });
});
