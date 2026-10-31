import { Hono } from "hono";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { auth } from "../src/middleware/auth";
import { askRouter } from "../src/routes/ask";
import { db } from "../src/db/index";
import { users, captures, memories, media, objects, sightings } from "../src/db/schema";
import { chat } from "../src/lib/meta";
import { embed } from "../src/lib/embed";
import { hashApiKey } from "../src/lib/hash";

vi.mock("../src/lib/meta", () => ({
    chat: vi.fn(),
    intentPlan: vi.fn(),
    transcribe: vi.fn(),
    vision: vi.fn(),
}));
vi.mock("../src/lib/embed", () => ({
    embed: vi.fn(async () => new Array(384).fill(1)),
}));

const chatMock = vi.mocked(chat);
const VECTOR = new Array(384).fill(1);

function app() {
    const root = new Hono<{ Variables: { userId: string } }>();
    root.use("/ask", auth);
    root.use("/ask/*", auth);
    root.route("/ask", askRouter);
    return root;
}

const KEY = `ask-key-${crypto.randomUUID()}`;
let userId = "";

async function post(question: string) {
    return app().request("/ask", {
        method: "POST",
        body: JSON.stringify({ question }),
        headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
    });
}

beforeAll(async () => {
    const [user] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY) })
        .returning({ id: users.id });
    userId = user.id;
    await db.insert(captures).values({ userId, status: "ready" });
});

afterEach(async () => {
    const rows = await db
        .select({ id: memories.id })
        .from(memories)
        .where(eq(memories.userId, userId));
    if (rows.length > 0) {
        await db.delete(media).where(inArray(media.memoryId, rows.map((r) => r.id)));
    }
    await db.delete(memories).where(eq(memories.userId, userId));
    await db.delete(objects).where(eq(objects.userId, userId));
    chatMock.mockReset();
});

describe("ask: object-first path", () => {
    it("answers last-seen with citations once an object has 3 sightings", async () => {
        const [capture] = await db
            .select()
            .from(captures)
            .where(eq(captures.userId, userId))
            .limit(1);
        const memoryIds: string[] = [];
        for (let i = 0; i < 3; i++) {
            const [row] = await db
                .insert(memories)
                .values({
                    userId,
                    captureId: capture.id,
                    kind: "session_chunk",
                    status: "ready",
                    note: i === 2 ? "blue sedan parked by gate B" : "walking",
                    lat: 27.7,
                    lng: 85.3,
                })
                .returning({ id: memories.id });
            memoryIds.push(row!.id);
        }
        const [frame] = await db
            .insert(media)
            .values({
                memoryId: memoryIds[2],
                kind: "frame",
                storageKey: "f1.jpg",
                offsetMs: 0,
            })
            .returning({ id: media.id });
        await db
            .insert(media)
            .values({
                memoryId: memoryIds[2],
                parentId: frame.id,
                kind: "thumbnail",
                storageKey: "t1.jpg",
            });
        await db.insert(objects).values({ userId, label: "car", tracked: true }).returning({
            id: objects.id,
        });
        const obj = await db.query.objects.findFirst({
            where: { userId, label: "car" },
            columns: { id: true },
        });
        for (let i = 0; i < 3; i++) {
            await db.insert(sightings).values({
                objectId: obj!.id,
                memoryId: memoryIds[i],
                frameId: i === 2 ? frame.id : null,
                seenAt: new Date(new Date("2026-10-31T09:00:00.000Z").getTime() + i * 60000),
            });
        }

        const res = await post("where did I park my car?");
        const answer = (await res.json()).data;
        expect(answer.known).toBe(true);
        expect(answer.usually_here).toBe(true);
        expect(answer.memory_id).toBe(memoryIds[2]);
        expect(answer.last_seen_at).toBe("2026-10-31T09:02:00.000Z");
        expect(answer.lat).toBe(27.7);
        expect(answer.frame.media_id).toBe(frame.id);
        expect(chatMock).not.toHaveBeenCalled();
    });
});

describe("ask: honest no-memory", () => {
    it("says no when nothing matches", async () => {
        const [capture] = await db
            .select()
            .from(captures)
            .where(eq(captures.userId, userId))
            .limit(1);
        await db.insert(memories).values({
            userId,
            captureId: capture.id,
            kind: "session_chunk",
            status: "ready",
            note: "coffee at Nirvana cafe",
            embedding: null,
        });
        const res = await post("where did I leave my bicycle?");
        const answer = (await res.json()).data;
        expect(answer.known).toBe(false);
        expect(answer.answer).toContain("no memory");
        expect(answer.memory_id).toBeNull();
        expect(chatMock).not.toHaveBeenCalled();
    });
});

describe("ask: hybrid memory fallback", () => {
    it("cites the best matching past memory when no object exists", async () => {
        const [capture] = await db
            .select()
            .from(captures)
            .where(eq(captures.userId, userId))
            .limit(1);
        const [ready] = await db
            .insert(memories)
            .values({
                userId,
                captureId: capture.id,
                kind: "session_chunk",
                status: "ready",
                note: "car parked near gate B",
                embedding: VECTOR,
                occurredAt: new Date("2026-10-31T08:00:00.000Z"),
            })
            .returning({ id: memories.id });
        await db.insert(memories).values({
            userId,
            captureId: capture.id,
            kind: "session_chunk",
            status: "pending",
            note: "car parked near gate D",
            embedding: VECTOR,
        });
        chatMock.mockResolvedValue('{"known":true,"answer":"by gate B"}');

        const res = await post("where is the car parked?");
        const answer = (await res.json()).data;
        expect(answer.known).toBe(true);
        expect(answer.answer).toBe("by gate B");
        expect(answer.memory_id).toBe(ready.id);
        expect(answer.frame).toBeNull();
        expect(chatMock).toHaveBeenCalledTimes(1);
    });

    it("excludes pending memories from the fallback", async () => {
        chatMock.mockReset();
        const [capture] = await db
            .select()
            .from(captures)
            .where(eq(captures.userId, userId))
            .limit(1);
        await db.insert(memories).values({
            userId,
            captureId: capture.id,
            kind: "session_chunk",
            status: "pending",
            note: "secret pending thing",
            embedding: VECTOR,
        });
        const res = await post("thing");
        const answer = (await res.json()).data;
        expect(answer.known).toBe(false);
        expect(chatMock).not.toHaveBeenCalled();
    });
});
