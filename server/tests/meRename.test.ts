import { Hono } from "hono";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { auth } from "../src/middleware/auth";
import { meRouter } from "../src/routes/me";
import { routerRouter } from "../src/routes/router";
import { db, closeDb } from "../src/db/index";
import { users, captures, routerCommands, memories, objects, reminders } from "../src/db/schema";
import { intentPlan } from "../src/lib/meta";
import { hashApiKey } from "../src/lib/hash";

vi.mock("../src/lib/meta", () => ({
    intentPlan: vi.fn(),
    transcribe: vi.fn(),
    chat: vi.fn(),
    vision: vi.fn(),
    segment: vi.fn(async () => []),
}));
vi.mock("../src/lib/queue", () => ({
    chunkQueue: { remove: vi.fn() },
    chunkJobId: (captureId: string, idx: number) => `${captureId}#${idx}`,
    enqueueChunk: vi.fn(),
    enqueueSummary: vi.fn(async () => {}),
    CHUNK_QUEUE: "chunks",
    SUMMARY_QUEUE: "summary",
}));

const intentPlanMock = vi.mocked(intentPlan);

function app() {
    const root = new Hono<{ Variables: { userId: string } }>();
    root.use("/me", auth);
    root.use("/me/*", auth);
    root.use("/router", auth);
    root.use("/router/*", auth);
    root.route("/me", meRouter);
    root.route("/router", routerRouter);
    return root;
}

const KEY = `me-key-${crypto.randomUUID()}`;
let userId = "";

const patch = (body: unknown) =>
    app().request("/me", {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
    });

const postRouter = (transcript: string) =>
    app().request("/router", {
        method: "POST",
        body: JSON.stringify({ command_id: crypto.randomUUID(), transcript }),
        headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
    });

const userOf = () =>
    db
        .select({ assistantName: users.assistantName, timezone: users.timezone })
        .from(users)
        .where(eq(users.id, userId))
        .then((rows) => rows[0]);

beforeAll(async () => {
    const [user] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY) })
        .returning({ id: users.id });
    userId = user.id;
    await db.insert(captures).values({ userId, status: "recording" });
});

afterEach(async () => {
    await db.delete(routerCommands).where(eq(routerCommands.userId, userId));
    await db.delete(memories).where(eq(memories.userId, userId));
    await db.delete(reminders).where(eq(reminders.userId, userId));
    await db.delete(objects).where(eq(objects.userId, userId));
    await db
        .update(captures)
        .set({ status: "recording" })
        .where(eq(captures.userId, userId));
    await db.update(users).set({ assistantName: "Muse", timezone: "UTC" }).where(eq(users.id, userId));
    intentPlanMock.mockReset();
});

afterAll(async () => {
    if (userId) await db.delete(users).where(eq(users.id, userId));
    await closeDb();
});

describe("me rename validation", () => {
    it("rejects an empty patch with EMPTY_PATCH", async () => {
        const res = await patch({});
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe("EMPTY_PATCH");
    });

    it("rejects an invalid assistant name", async () => {
        for (const bad of ["Nova9", "n", "two words", ""]) {
            const res = await patch({ assistant_name: bad });
            const body = await res.json();
            expect(res.status).toBe(400);
            expect(body.error.code).toBe("INVALID_BODY");
        }
        expect((await userOf())!.assistantName).toBe("Muse");
    });

    it("accepts a valid rename and persists it", async () => {
        const res = await patch({ assistant_name: "Nova" });
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.data.assistant_name).toBe("Nova");
        expect(body.data.timezone).toBe("UTC");
        expect((await userOf())!.assistantName).toBe("Nova");
    });

    it("keeps a named assistant when only the timezone changes", async () => {
        const res = await patch({ assistant_name: "Nova", timezone: "Asia/Kathmandu" });
        expect(res.status).toBe(200);
        expect((await userOf())!.timezone).toBe("Asia/Kathmandu");
    });
});

describe("router uses the renamed assistant", () => {
    it("strips the wake prefix with the new name on the fast path", async () => {
        await patch({ assistant_name: "Nova" });
        const res = await postRouter("ok Nova pause");
        const body = await res.json();
        expect(body.data.executed[0].command).toBe("pause");
        expect(body.data.executed[0].error).toBeNull();
        expect(intentPlanMock).not.toHaveBeenCalled();
        expect((await app().request("/me", { headers: { "X-API-Key": KEY } })).status).toBe(200);
        const capturesAfter = await db
            .select({ status: captures.status })
            .from(captures)
            .where(eq(captures.userId, userId));
        expect(capturesAfter.map((c) => c.status)).toContain("paused");
    });

    it("no longer strips the old name and defers to the model", async () => {
        await patch({ assistant_name: "Nova" });
        intentPlanMock.mockResolvedValue(JSON.stringify({ actions: [{ intent: "clarify", question: "q" }] }));
        const res = await postRouter("ok Muse stop");
        const body = await res.json();
        expect(body.data.executed[0].intent).toBe("clarify");
        expect(intentPlanMock).toHaveBeenCalledTimes(1);
        expect(intentPlanMock.mock.calls[0][0]).toBe("ok Muse stop");
        const capturesAfter = await db
            .select({ status: captures.status })
            .from(captures)
            .where(eq(captures.userId, userId));
        expect(capturesAfter.every((c) => c.status !== "ending")).toBe(true);
    });

    it("routes a planned bookmark under the new name", async () => {
        await patch({ assistant_name: "Nova" });
        intentPlanMock.mockResolvedValue(
            JSON.stringify({ actions: [{ intent: "bookmark", note: "renamed bookmark", tags: ["rename"] }] }),
        );
        const res = await postRouter("ok Nova bookmark this");
        const body = await res.json();
        expect(body.data.executed[0].intent).toBe("bookmark");
        expect(body.data.executed[0].status).toBe("pending");
        const row = await db.query.memories.findFirst({ where: { userId, note: "renamed bookmark" } });
        expect(row).not.toBeNull();
        expect(row!.mediaPlan).toBe("frames,audio");
    });
});
