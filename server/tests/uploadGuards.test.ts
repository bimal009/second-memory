import { Hono } from "hono";
import { readFile, rm } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { auth } from "../src/middleware/auth";
import { captureRouter } from "../src/routes/capture";
import { db, closeDb } from "../src/db/index";
import { users, captures, chunks, memories, objects } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";
import { enqueueChunk } from "../src/lib/queue";
import { captureDir, chunkPath } from "../src/lib/storage";

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

const enqueueChunkMock = vi.mocked(enqueueChunk);

function app() {
    const root = new Hono<{ Variables: { userId: string } }>();
    root.use("*", auth);
    root.route("/captures", captureRouter);
    return root;
}

const KEY = `upg-key-${crypto.randomUUID()}`;
let userId = "";
let recordingId = "";
let pausedId = "";
let endedId = "";

const STARTED_AT = "2026-10-31T10:00:00.000Z";

async function upload(captureId: string, idx: string, sizeBytes = 1024, extras: Record<string, string> = {}) {
    const form = new FormData();
    form.append("idx", idx);
    form.append("started_at", STARTED_AT);
    for (const [key, value] of Object.entries(extras)) form.append(key, value);
    form.append("file", new Blob([new Uint8Array(sizeBytes)], { type: "video/mp4" }), "chunk.mp4");
    return app().request(`/captures/${captureId}/chunks`, {
        method: "POST",
        body: form,
        headers: { "X-API-Key": KEY },
    });
}

const chunkRows = (captureId: string) =>
    db.select().from(chunks).where(eq(chunks.captureId, captureId)).then((rows) => rows);

beforeAll(async () => {
    const [user] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY) })
        .returning({ id: users.id });
    userId = user.id;
    const rows = await db
        .insert(captures)
        .values([
            { userId, status: "recording" },
            { userId, status: "paused" },
            { userId, status: "ready" },
        ])
        .returning({ id: captures.id, status: captures.status });
    recordingId = rows.find((r) => r.status === "recording")!.id;
    pausedId = rows.find((r) => r.status === "paused")!.id;
    endedId = rows.find((r) => r.status === "ready")!.id;
});

afterEach(async () => {
    await db.delete(memories).where(eq(memories.userId, userId));
    for (const id of [recordingId, pausedId, endedId]) {
        await rm(captureDir(id), { recursive: true, force: true });
        await db.delete(chunks).where(eq(chunks.captureId, id));
    }
    enqueueChunkMock.mockClear();
});

afterAll(async () => {
    await db.delete(objects).where(eq(objects.userId, userId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
    await closeDb();
});

describe("chunk upload guards", () => {
    it("accepts a first upload, stores the raw file, and enqueues processing", async () => {
        const res = await upload(recordingId, "0");
        const body = await res.json();
        expect(res.status).toBe(201);
        expect(body.data.status).toBe("uploaded");
        expect(body.data.started_at).toBe(STARTED_AT);
        expect(body.data.upload_bytes).toBe(1024);
        const rows = await chunkRows(recordingId);
        expect(rows.length).toBe(1);
        expect(rows[0].idx).toBe(0);
        expect(enqueueChunkMock).toHaveBeenCalledTimes(1);
        expect(enqueueChunkMock).toHaveBeenCalledWith(recordingId, 0);
        const stored = await readFile(chunkPath(recordingId, 0));
        expect(stored.length).toBe(1024);
    });

    it("returns the existing chunk for a repeat upload of the same index", async () => {
        const first = await upload(recordingId, "0");
        expect(first.status).toBe(201);
        const second = await upload(recordingId, "0");
        expect(second.status).toBe(200);
        const secondBody = await second.json();
        expect(secondBody.message).toBe("Chunk already uploaded");

        const rows = await chunkRows(recordingId);
        expect(rows.length).toBe(1);
        expect(secondBody.data.id).toBe(rows[0].id);
        expect(secondBody.data.status).toBe("uploaded");
        expect(enqueueChunkMock).toHaveBeenCalledTimes(2);
    });

    it("rejects a zero-byte file", async () => {
        const res = await upload(recordingId, "1", 0);
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe("FILE_REQUIRED");
        expect(await chunkRows(recordingId)).toEqual([]);
        expect(enqueueChunkMock).not.toHaveBeenCalled();
    });

    it("rejects a negative chunk index", async () => {
        const res = await upload(recordingId, "-1");
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe("INVALID_BODY");
        expect(await chunkRows(recordingId)).toEqual([]);
    });

    it("rejects a lat or lng sent alone", async () => {
        const res = await upload(recordingId, "1", 1024, { lat: "27.7" });
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe("INVALID_BODY");
        expect(await chunkRows(recordingId)).toEqual([]);

        const good = await upload(recordingId, "1", 1024, { lat: "27.7", lng: "85.3" });
        expect(good.status).toBe(201);
    });

    it("returns 409 for an upload to a paused capture", async () => {
        const res = await upload(pausedId, "0");
        const body = await res.json();
        expect(res.status).toBe(409);
        expect(body.error.code).toBe("CAPTURE_CLOSED");
        expect(await chunkRows(pausedId)).toEqual([]);
    });

    it("returns 409 for an upload to a capture that already ended", async () => {
        const res = await upload(endedId, "0");
        const body = await res.json();
        expect(res.status).toBe(409);
        expect(body.error.code).toBe("CAPTURE_CLOSED");
        expect(await chunkRows(endedId)).toEqual([]);
    });

    it("returns not-found shaped failure for a bogus capture id path", async () => {
        const res = await upload("not-a-uuid", "0");
        expect([400, 404, 500]).toContain(res.status);
        const body = await res.json();
        expect(body.error).not.toBeNull();
    });

    it("caps an oversized import for the import endpoint", async () => {
        const form = new FormData();
        form.append("file", new Blob([new Uint8Array(26 * 1024 * 1024)], { type: "video/mp4" }), "import.mp4");
        const res = await app().request(`/captures/${recordingId}/import`, {
            method: "POST",
            body: form,
            headers: { "X-API-Key": KEY },
        });
        const body = await res.json();
        expect(res.status).toBe(413);
        expect(body.error.code).toBe("FILE_TOO_LARGE");
        expect(await chunkRows(recordingId)).toEqual([]);
    });
});
