import { Hono } from "hono";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { Job } from "bullmq";
import { auth } from "../src/middleware/auth";
import { captureRouter } from "../src/routes/capture";
import { db, closeDb } from "../src/db/index";
import { users, captures, chunks, memories, objects } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";
import { CHUNK_QUEUE, type ChunkJobData } from "../src/lib/queue";
import { startChunkWorker, stopChunkWorker } from "../src/worker";
import { captureDir, chunkDir, chunkPath, frameDir } from "../src/lib/storage";

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

function fakeJob(captureId: string, chunkIdx: number): Job<ChunkJobData> {
    return {
        id: `${captureId}#${chunkIdx}`,
        data: { captureId, chunkIdx },
        opts: { attempts: 1 },
        attemptsMade: 0,
    } as unknown as Job<ChunkJobData>;
}

function app() {
    const root = new Hono<{ Variables: { userId: string } }>();
    root.use("*", auth);
    root.route("/captures", captureRouter);
    return root;
}

const KEY = `delete-key-${crypto.randomUUID()}`;
let userId = "";

async function post(path: string, body: unknown = {}) {
    return app().request(path, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
    });
}

const del = (path: string) => app().request(path, { method: "DELETE", headers: { "X-API-Key": KEY } });

async function fakeCapture(userId: string, status: string): Promise<string> {
    const [capture] = await db
        .insert(captures)
        .values({ userId, status })
        .returning({ id: captures.id });
    return capture.id;
}

async function makeNoise(captureId: string, idx: number): Promise<void> {
    await mkdir(join(chunkDir(captureId, idx), "frames", "thumbs"), { recursive: true });
    await writeFile(chunkPath(captureId, idx), Buffer.from("fake mp4 bytes"));
    await writeFile(join(frameDir(captureId, idx), "1.jpg"), Buffer.from("fake jpg bytes"));
    await db
        .insert(chunks)
        .values({ captureId, idx, startedAt: new Date(), durationS: 30 });
}

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

const exists = async (path: string): Promise<boolean> => {
    try {
        await readdir(path);
        return true;
    } catch {
        return false;
    }
};

describe("capture delete", () => {
    it("deletes a single capture with rows and storage folder", async () => {
        const res = await post("/captures");
        expect(res.status).toBe(201);
        const { id } = (await res.json()).data;
        await makeNoise(id, 0);

        const delRes = await del(`/captures/${id}`);
        expect(delRes.status).toBe(200);

        expect(await db.query.captures.findFirst({ where: { id } })).toBeUndefined();
        expect(await db.query.chunks.findMany({ where: { captureId: id } })).toEqual([]);
        expect(await exists(captureDir(id))).toBe(false);
    });

    it("deletes every capture for the user, folders included", async () => {
        const a = await fakeCapture(userId, "recording");
        const b = await fakeCapture(userId, "ready");
        await makeNoise(a, 0);
        await makeNoise(b, 1);

        const delRes = await del("/captures/");
        expect(delRes.status).toBe(200);

        const rows = await db.query.captures.findMany({ where: { userId } });
        expect(rows).toEqual([]);
        for (const id of [a, b]) {
            await expect(readdir(captureDir(id))).rejects.toThrow();
        }
    });

    it("rejects deleting a non-uuid capture id", async () => {
        const res = await del("/captures/abc");
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe("INVALID_PARAM");
    });

    it("the chunk worker never touches storage of a capture marked deleting", async () => {
        const captureId = await fakeCapture(userId, "deleting");
        await makeNoise(captureId, 0);
        const before = await readdir(chunkDir(captureId, 0));

        expect(await chunkProcessor!(fakeJob(captureId, 0))).toEqual({ skipped: true });

        const [row] = await db
            .select({ status: chunks.status })
            .from(chunks)
            .where(eq(chunks.captureId, captureId));
        expect(row!.status).toBe("uploaded");
        expect(await readdir(chunkDir(captureId, 0))).toEqual(before);
    });
});
