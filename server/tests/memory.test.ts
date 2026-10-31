import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { desc, eq } from "drizzle-orm";
import { auth } from "../src/middleware/auth";
import { memoriesRouter } from "../src/routes/memory";
import { db, closeDb } from "../src/db/index";
import { users, captures, memories } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";

vi.mock("../src/lib/meta", () => ({
    chat: vi.fn(),
    intentPlan: vi.fn(),
    transcribe: vi.fn(),
    vision: vi.fn(),
}));

const KEY_A = `mem-key-a-${crypto.randomUUID()}`;
const KEY_B = `mem-key-b-${crypto.randomUUID()}`;
let userIdA = "";
let userIdB = "";
let newestId = "";

function app() {
    const root = new Hono<{ Variables: { userId: string } }>();
    root.use("/memories", auth);
    root.use("/memories/*", auth);
    root.route("/memories", memoriesRouter);
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
    await db.insert(captures).values([
        { userId: userIdA, status: "ready" },
        { userId: userIdB, status: "ready" },
    ]);
    const [capA] = await db.select().from(captures).where(eq(captures.userId, userIdA));
    await db.insert(memories).values([
        {
            userId: userIdA,
            captureId: capA.id,
            kind: "session_chunk",
            status: "ready",
            note: "older note",
            occurredAt: new Date("2026-10-31T08:00:00.000Z"),
        },
        {
            userId: userIdA,
            captureId: capA.id,
            kind: "moment",
            status: "ready",
            note: "newer note",
            occurredAt: new Date("2026-10-31T09:00:00.000Z"),
        },
    ]);
    const [newest] = await db
        .select()
        .from(memories)
        .where(eq(memories.userId, userIdA))
        .orderBy(desc(memories.occurredAt))
        .limit(1);
    newestId = newest.id;
});

afterAll(async () => {
    if (userIdA) await db.delete(users).where(eq(users.id, userIdA));
    if (userIdB) await db.delete(users).where(eq(users.id, userIdB));
    await closeDb();
});

describe("memories API", () => {
    it("lists memories newest-first and honors the limit", async () => {
        const res = await get("/memories?limit=1", KEY_A);
        const data = (await res.json()).data;
        expect(data.length).toBe(1);
        expect(data[0].note).toBe("newer note");
        expect(data[0].occurred_at).toBe("2026-10-31T09:00:00.000Z");
    });

    it("pages back with the before cursor", async () => {
        const res = await get("/memories?limit=5&before=2026-10-31T09:00:00.000Z", KEY_A);
        const data = (await res.json()).data;
        expect(data.map((m: { note: string }) => m.note)).toEqual(["older note"]);
    });

    it("returns a memory detail for its owner with media attached", async () => {
        const res = await get(`/memories/${newestId}`, KEY_A);
        const body = await res.json();
        expect(body.data.id).toBe(newestId);
        expect(body.data.kind).toBe("moment");
        expect(body.data.media).toEqual([]);
    });

    it("does not leak another user's memory detail", async () => {
        const res = await get(`/memories/${newestId}`, KEY_B);
        expect(res.status).toBe(404);
    });

    it("rejects a non-uuid detail id", async () => {
        const res = await get("/memories/not-a-uuid", KEY_A);
        expect(res.status).toBe(400);
    });

    it("hides memories from another user in the list", async () => {
        const res = await get("/memories?limit=50", KEY_B);
        const data = (await res.json()).data;
        expect(data.every((m: { note: string }) => m.note !== "newer note")).toBe(true);
    });
});
