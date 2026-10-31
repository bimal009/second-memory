import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, closeDb } from "../src/db/index";
import { users, captures, memories, media } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";
import { finalizeMoments } from "../src/worker";

vi.mock("../src/lib/meta", () => ({
    chat: vi.fn(), intentPlan: vi.fn(), transcribe: vi.fn(), vision: vi.fn(),
}));
vi.mock("../src/lib/embed", () => ({ embed: vi.fn(async () => new Array(384).fill(0.1)) }));

const KEY = `pipe-key-${crypto.randomUUID()}`;
let userId = "";
let captureId = "";
const t0 = Date.UTC(2026, 9, 31, 10, 0, 0);

type Frame = { memoryId: string; offsetMs: number; at: number };

async function chunkMemory(offsetS: number, frameOffsetsS: number[]): Promise<string> {
    const [row] = await db
        .insert(memories)
        .values({
            userId,
            captureId,
            kind: "session_chunk",
            status: "ready",
            note: `chunk at +${offsetS}s`,
            occurredAt: new Date(t0 + offsetS * 1000),
        })
        .returning({ id: memories.id });
    const frameRows = await db
        .insert(media)
        .values(
            frameOffsetsS.map((o) => ({
                memoryId: row!.id,
                kind: "frame",
                storageKey: `frame_${o}.jpg`,
                offsetMs: o * 1000,
            })),
        )
        .returning({ id: media.id });
    await db.insert(media).values(
        frameRows.map((f, index) => ({
            memoryId: row!.id,
            parentId: f.id,
            kind: "thumbnail",
            storageKey: `thumb_${index}.jpg`,
        })),
    );
    return row!.id;
}

async function pendingMoment(windowStartS: number, windowEndS: number): Promise<string> {
    const [row] = await db
        .insert(memories)
        .values({
            userId,
            captureId,
            kind: "moment",
            status: "pending",
            note: `moment ${windowStartS}`,
            windowStart: new Date(t0 + windowStartS * 1000),
            windowEnd: new Date(t0 + windowEndS * 1000),
        })
        .returning({ id: memories.id });
    return row!.id;
}

async function readyMoment(id: string) {
    return db.query.memories.findFirst({
        where: { id },
        columns: { status: true, note: true },
        with: {
            media: {
                columns: { kind: true, offsetMs: true, parentId: true },
            },
        },
    });
}

beforeAll(async () => {
    const [user] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY) })
        .returning({ id: users.id });
    userId = user.id;
    const [capture] = await db
        .insert(captures)
        .values({ userId, status: "recording" })
        .returning({ id: captures.id });
    captureId = capture.id;
});

afterAll(async () => {
    if (userId) await db.delete(users).where(eq(users.id, userId));
    await closeDb();
});

describe("bookmark finalizer", () => {
    it("finalizes closed windows, keeps open ones pending, and uses the press-race fallback", async () => {
        await chunkMemory(-90, [0]);
        await chunkMemory(0, [4, 8, 12]);
        await chunkMemory(45, [2]);
        const covered = await pendingMoment(-5, 6);
        const open = await pendingMoment(20, 40);
        const gaping = await pendingMoment(-70, -60);

        await finalizeMoments(captureId, new Date(t0 + 10_000));

        const ready = await readyMoment(covered);
        expect(ready!.status).toBe("ready");
        expect(ready!.media.filter((f) => f.kind === "frame").map((f) => f.offsetMs)).toEqual([4000]);
        expect(ready!.media.filter((f) => f.kind === "thumbnail").length).toBe(1);

        const openReady = await db.query.memories.findFirst({
            where: { id: open },
            columns: { status: true },
        });
        expect(openReady!.status).toBe("pending");

        const pressRace = await readyMoment(gaping);
        expect(pressRace!.status).toBe("ready");
        expect(pressRace!.media.map((f) => f.kind)).toEqual(["frame", "thumbnail"]);
    });
});
