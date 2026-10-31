import { Hono } from "hono";
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { auth } from "../src/middleware/auth";
import { captureRouter } from "../src/routes/capture";
import { routerRouter } from "../src/routes/router";
import { db, closeDb } from "../src/db/index";
import { users, captures, routerCommands, memories, objects, reminders } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";

vi.mock("../src/lib/meta", () => ({
    chat: vi.fn(),
    intentPlan: vi.fn(),
    transcribe: vi.fn(),
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

const KEY = `pause-key-${crypto.randomUUID()}`;
let userId = "";
let captureId = "";

function app() {
    const root = new Hono<{ Variables: { userId: string } }>();
    root.use("*", auth);
    root.route("/captures", captureRouter);
    root.route("/router", routerRouter);
    return root;
}

async function call(path: string, method = "POST") {
    return app().request(path, {
        method,
        headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
    });
}

const uuid = () => crypto.randomUUID();

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

afterEach(async () => {
    await db.delete(routerCommands).where(eq(routerCommands.userId, userId));
    await db.delete(memories).where(eq(memories.userId, userId));
    await db.update(captures).set({ status: "recording" }).where(eq(captures.id, captureId));
});

afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
});

const statusOf = async () => {
    const [row] = await db
        .select({ status: captures.status })
        .from(captures)
        .where(eq(captures.id, captureId));
    return row.status;
};

describe("pause and resume", () => {
    it("pauses a recording capture, rejects a second pause, and rejects uploads while paused", async () => {
        const res = await call(`/captures/${captureId}/pause`);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.data.status).toBe("paused");
        expect(await statusOf()).toBe("paused");

        const again = await call(`/captures/${captureId}/pause`);
        expect(again.status).toBe(409);

        const upload = await call(`/captures/${captureId}/chunks`);
        const uploadBody = await upload.json();
        expect(upload.status).toBe(409);
        expect(uploadBody.error.code).toBe("CAPTURE_CLOSED");
    });

    it("resumes a paused capture and rejects a resume when recording", async () => {
        await call(`/captures/${captureId}/pause`);
        const res = await call(`/captures/${captureId}/resume`);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.data.status).toBe("recording");

        const again = await call(`/captures/${captureId}/resume`);
        expect(again.status).toBe(409);
    });

    it("ends a capture from paused", async () => {
        await call(`/captures/${captureId}/pause`);
        const res = await call(`/captures/${captureId}/end`);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.data.status).toBe("ending");
        expect(await statusOf()).toBe("ending");
    });

    it("runs bare pause and resume through the router fast path", async () => {
        const pause = await app().request("/router", {
            method: "POST",
            body: JSON.stringify({ command_id: uuid(), transcript: "pause" }),
            headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
        });
        const pauseBody = await pause.json();
        expect(pauseBody.data.executed[0].command).toBe("pause");
        expect(pauseBody.data.executed[0].error).toBeNull();
        expect(await statusOf()).toBe("paused");

        const resume = await app().request("/router", {
            method: "POST",
            body: JSON.stringify({ command_id: uuid(), transcript: "resume" }),
            headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
        });
        const resumeBody = await resume.json();
        expect(resumeBody.data.executed[0].command).toBe("resume");
        expect(resumeBody.data.executed[0].error).toBeNull();
        expect(await statusOf()).toBe("recording");
    });
});
