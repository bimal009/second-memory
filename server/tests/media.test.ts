import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { auth } from "../src/middleware/auth";
import { mediaRouter } from "../src/routes/media";
import { db, closeDb } from "../src/db/index";
import { users, captures, memories, media } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";
import { captureDir, STORAGE_ROOT } from "../src/lib/storage";

vi.mock("../src/lib/meta", () => ({
    chat: vi.fn(),
    intentPlan: vi.fn(),
    transcribe: vi.fn(),
    vision: vi.fn(),
    segment: vi.fn(async () => []),
}));

const KEY_A = `media-key-a-${crypto.randomUUID()}`;
const KEY_B = `media-key-b-${crypto.randomUUID()}`;
let userIdA = "";
let userIdB = "";
let captureIdA = "";
let memoryIdA = "";
let frameId = "";
let thumbId = "";
let traversalId = "";
const frameBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

function app() {
    const root = new Hono<{ Variables: { userId: string } }>();
    root.use("/media", auth);
    root.use("/media/*", auth);
    root.route("/media", mediaRouter);
    return root;
}

const get = (path: string, key: string) =>
    app().request(path, { headers: { "X-API-Key": key } });

beforeAll(async () => {
    const [a] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY_A) })
        .returning({ id: users.id });
    const [b] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY_B) })
        .returning({ id: users.id });
    userIdA = a.id;
    userIdB = b.id;
    const [capture] = await db
        .insert(captures)
        .values({ userId: userIdA, status: "ready" })
        .returning({ id: captures.id });
    captureIdA = capture.id;
    const [memory] = await db
        .insert(memories)
        .values({
            userId: userIdA,
            captureId: captureIdA,
            kind: "session_chunk",
            status: "ready",
            note: "photo note",
            occurredAt: new Date(),
        })
        .returning({ id: memories.id });
    memoryIdA = memory.id;
    const dir = join(captureDir(captureIdA), "frames");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "1.jpg"), frameBytes);
    const [frame] = await db
        .insert(media)
        .values({
            memoryId: memoryIdA,
            kind: "frame",
            storageKey: `capture/${captureIdA}/frames/1.jpg`,
            offsetMs: 4000,
        })
        .returning({ id: media.id });
    frameId = frame.id;
    const [thumb] = await db
        .insert(media)
        .values({
            memoryId: memoryIdA,
            parentId: frameId,
            kind: "thumbnail",
            storageKey: `capture/${captureIdA}/frames/1.jpg`,
            offsetMs: 4000,
        })
        .returning({ id: media.id });
    thumbId = thumb.id;
    const [traversal] = await db
        .insert(media)
        .values({
            memoryId: memoryIdA,
            kind: "frame",
            storageKey: "../outside.jpg",
            offsetMs: 0,
        })
        .returning({ id: media.id });
    traversalId = traversal.id;
});

afterAll(async () => {
    await rm(captureDir(captureIdA), { recursive: true, force: true });
    await rm(join(STORAGE_ROOT, "outside.jpg"), { force: true });
    await db.delete(media).where(eq(media.memoryId, memoryIdA));
    await db.delete(memories).where(eq(memories.id, memoryIdA));
    await db.delete(captures).where(eq(captures.id, captureIdA));
    await db.delete(users).where(eq(users.id, userIdA));
    await db.delete(users).where(eq(users.id, userIdB));
    await closeDb();
});

describe("media endpoint", () => {
    it("serves bytes to the owner", async () => {
        const res = await get(`/media/${frameId}`, KEY_A);
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toBe("image/jpeg");
        const body = Buffer.from(await res.arrayBuffer());
        expect(body.equals(frameBytes)).toBe(true);
    });

    it("serves thumbnails via the same route", async () => {
        const res = await get(`/media/${thumbId}`, KEY_A);
        expect(res.status).toBe(200);
    });

    it("returns 404 for another user's media", async () => {
        const res = await get(`/media/${frameId}`, KEY_B);
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error.code).toBe("MEDIA_NOT_FOUND");
    });

    it("rejects bad uuid params", async () => {
        const res = await get("/media/not-a-uuid", KEY_A);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe("INVALID_PARAM");
    });

    it("returns 404 for unknown media ids", async () => {
        const res = await get(`/media/${crypto.randomUUID()}`, KEY_A);
        expect(res.status).toBe(404);
    });

    it("blocks storage keys escaping the root", async () => {
        const res = await get(`/media/${traversalId}`, KEY_A);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe("INVALID_KEY");
    });

    it("requires auth", async () => {
        const res = await app().request(`/media/${frameId}`);
        expect(res.status).toBe(401);
    });
});
