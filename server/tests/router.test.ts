import { Hono } from "hono";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "../src/middleware/auth";
import { routerRouter } from "../src/routes/router";
import { db } from "../src/db/index";
import { users, captures, memories, objects, reminders, routerCommands } from "../src/db/schema";
import { intentPlan, transcribe } from "../src/lib/meta";
import { answerAsk } from "../src/lib/ask";
import { hashApiKey } from "../src/lib/hash";

vi.mock("../src/lib/meta", () => ({
    intentPlan: vi.fn(),
    transcribe: vi.fn(),
    chat: vi.fn(),
    vision: vi.fn(),
    segment: vi.fn(async () => []),
}));
vi.mock("../src/lib/ask", () => ({ answerAsk: vi.fn() }));

const intentPlanMock = vi.mocked(intentPlan);
const transcribeMock = vi.mocked(transcribe);
const answerAskMock = vi.mocked(answerAsk);
const execFileAsync = promisify(execFile);

function app() {
    const root = new Hono<{ Variables: { userId: string } }>();
    root.use("/router", auth);
    root.use("/router/*", auth);
    root.route("/router", routerRouter);
    return root;
}

const KEY = `test-key-${crypto.randomUUID()}`;
let userId = "";

async function post(body: unknown) {
    return app().request("/router", {
        method: "POST",
        body: JSON.stringify(body),
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
    await db.insert(captures).values({ userId, status: "recording" });
});

afterEach(async () => {
    await db.delete(routerCommands).where(eq(routerCommands.userId, userId));
    await db.delete(memories).where(eq(memories.userId, userId));
    await db.delete(reminders).where(eq(reminders.userId, userId));
    await db.delete(objects).where(eq(objects.userId, userId));
    await db.update(captures).set({ status: "recording" }).where(and(eq(captures.userId, userId), inArray(captures.status, ["recording", "paused"])));
    intentPlanMock.mockReset();
    answerAskMock.mockReset();
});

describe("router fast path + model path", () => {
    it("runs bare control commands without the model", async () => {
        const res = await post({ command_id: uuid(), transcript: "pause" });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.executed[0].command).toBe("pause");
        expect(intentPlanMock).not.toHaveBeenCalled();
    });

    it("sends messy input straight to the model, fillers included", async () => {
        intentPlanMock.mockResolvedValue(
            JSON.stringify({
                actions: [{ intent: "bookmark", note: "Remembered this moment", tags: ["saved"] }],
            }),
        );
        const res = await post({ command_id: uuid(), transcript: "uh please remember this" });
        const body = await res.json();
        expect(body.data.executed[0].intent).toBe("bookmark");
        expect(intentPlanMock).toHaveBeenCalledTimes(1);
        expect(intentPlanMock.mock.calls[0][0]).toBe("uh please remember this");
    });

    it("strips the wake name prefix, then uses the fast path", async () => {
        const res = await post({ command_id: uuid(), transcript: "ok Muse resume" });
        const body = await res.json();
        expect(body.data.executed[0].command).toBe("resume");
        expect(intentPlanMock).not.toHaveBeenCalled();
    });

    it("keeps a foreign-name prefix (goes to the model)", async () => {
        intentPlanMock.mockResolvedValue(JSON.stringify({ actions: [] }));
        await post({ command_id: uuid(), transcript: "hey Jarvis stop" });
        expect(intentPlanMock.mock.calls[0][0]).toBe("hey Jarvis stop");
    });

    it("books a bookmark into a pending moment with the spec window", async () => {
        intentPlanMock.mockResolvedValue(
            JSON.stringify({ actions: [{ intent: "bookmark", note: "sunset", tags: ["nice"] }] }),
        );
        const before = Date.now();
        const res = await post({ command_id: uuid(), transcript: "bookmark sunset" });
        const body = await res.json();
        const row = await db.query.memories.findFirst({ where: { userId, note: "sunset" } });
        expect(body.data.executed[0].status).toBe("pending");
        expect(row!.windowStart!.getTime() - (before - 20000)).toBeLessThan(5000);
        expect(row!.windowEnd!.getTime() - (before + 10000)).toBeLessThan(5000);
    });

    it("honors a custom duration on the bookmark window", async () => {
        intentPlanMock.mockResolvedValue(
            JSON.stringify({
                actions: [{ intent: "bookmark", note: "speech", tags: [], duration_sec: 45 }],
            }),
        );
        const before = Date.now();
        await post({ command_id: uuid(), transcript: "save the next 45 seconds" });
        const row = await db.query.memories.findFirst({ where: { userId, note: "speech" } });
        expect(row!.windowEnd!.getTime() - (before + 45000)).toBeLessThan(5000);
    });

    it("inserts reminders with the exact stated time", async () => {
        intentPlanMock.mockResolvedValue(
            JSON.stringify({
                actions: [
                    { intent: "reminder", text: "call mom", due_at: "2026-11-01T09:00:00+05:45" },
                ],
            }),
        );
        const res = await post({ command_id: uuid(), transcript: "remind me" });
        const body = await res.json();
        const row = await db.query.reminders.findFirst({ where: { userId, text: "call mom" } });
        expect(body.data.executed[0].reminder_id).toBe(row!.id);
        expect(row!.dueAt.toISOString()).toBe("2026-11-01T03:15:00.000Z");
        expect(row!.source).toBe("voice");
    });

    it("upserts tracked objects from track actions", async () => {
        intentPlanMock.mockResolvedValue(
            JSON.stringify({ actions: [{ intent: "track", label: "Keys", enabled: true }] }),
        );
        await post({ command_id: uuid(), transcript: "track my keys" });
        await post({ command_id: uuid(), transcript: "track my keyboard" });
        intentPlanMock.mockResolvedValue(
            JSON.stringify({ actions: [{ intent: "track", label: "keys", enabled: false }] }),
        );
        await post({ command_id: uuid(), transcript: "stop tracking my keys" });
        const obj = await db.query.objects.findFirst({
            where: { userId, label: "keys" },
            columns: { tracked: true },
        });
        expect(obj!.tracked).toBe(false);
    });

    it("runs two planned actions in order, each isolated", async () => {
        intentPlanMock.mockResolvedValue(
            JSON.stringify({
                actions: [
                    { intent: "bookmark", note: "two", tags: [] },
                    { intent: "track", label: "bag", enabled: true },
                ],
            }),
        );
        const res = await post({ command_id: uuid(), transcript: "do two things" });
        const body = await res.json();
        expect(body.data.executed.map((a: { intent: string }) => a.intent)).toEqual([
            "bookmark",
            "track",
        ]);
    });

    it("answers ask actions with the full payload in-response", async () => {
        const answer = {
            question: "where did I park?",
            known: true,
            answer: "gate B",
            memory_id: null,
            frame: null,
            highlight: null,
            lat: 27.7,
            lng: 85.3,
            last_seen_at: "2026-10-31T10:00:00.000Z",
            usually_here: false,
        };
        intentPlanMock.mockResolvedValue(
            JSON.stringify({ actions: [{ intent: "ask", question: "where did I park?" }] }),
        );
        answerAskMock.mockResolvedValue(answer);
        const res = await post({ command_id: uuid(), transcript: "where did I park?" });
        const body = await res.json();
        expect(body.data.executed[0].answer).toEqual(answer);
        expect(answerAskMock).toHaveBeenCalledWith(userId, "where did I park?");
    });

    it("clarifies after two invalid model answers instead of dying", async () => {
        intentPlanMock.mockResolvedValue("nope, not json");
        const res = await post({ command_id: uuid(), transcript: "fluffy nonsense" });
        const body = await res.json();
        expect(body.data.executed[0].intent).toBe("clarify");
        expect(body.data.executed[0].question).toContain("fluffy nonsense");
    });

    it("retries the model once with the injected transcript when it fails", async () => {
        intentPlanMock
            .mockResolvedValueOnce("not json at all")
            .mockResolvedValueOnce(JSON.stringify({ actions: [{ intent: "clarify", question: "ok" }] }));
        await post({ command_id: uuid(), transcript: "retry case" });
        expect(intentPlanMock).toHaveBeenCalledTimes(2);
    });
});

describe("router idempotency", () => {
    it("replays the stored result without another model call", async () => {
        intentPlanMock.mockResolvedValue(
            JSON.stringify({ actions: [{ intent: "track", label: "replay", enabled: true }] }),
        );
        const id = uuid();
        await post({ command_id: id, transcript: "track the replay bag" });
        await db.delete(objects).where(eq(objects.userId, userId));
        const res = await post({ command_id: id, transcript: "track the replay bag" });
        const body = await res.json();
        expect(body.message).toBe("Command replayed");
        expect(intentPlanMock).toHaveBeenCalledTimes(1);
    });
});

describe("router guards", () => {
    it("rejects a non-uuid command id", async () => {
        const res = await post({ command_id: "abc", transcript: "pause" });
        expect(res.status).toBe(400);
    });

    it("rejects a command with neither transcript nor audio", async () => {
        const res = await post({ command_id: uuid() });
        expect(res.status).toBe(400);
    });

    it("rejects a missing api key", async () => {
        const res = await app().request("/router", {
            method: "POST",
            body: JSON.stringify({ command_id: uuid(), transcript: "pause" }),
            headers: { "Content-Type": "application/json" },
        });
        expect(res.status).toBe(401);
    });

    it("transcribes mapped audio instead of text", async () => {
        transcribeMock.mockResolvedValue("stop");
        const wav = join(tmpdir(), `test_voice_${crypto.randomUUID()}.m4a`);
        await execFileAsync("ffmpeg", [
            "-f", "lavfi", "-i", "sine=frequency=440:duration=1", wav,
        ]);
        const form = new FormData();
        form.append("command_id", uuid());
        form.append("audio", new Blob([await readFile(wav)], { type: "audio/m4a" }), "cmd.m4a");
        const res = await app().request("/router", {
            method: "POST",
            body: form,
            headers: { "X-API-Key": KEY },
        });
        const body = await res.json();
        expect(body.data.executed[0].command).toBe("stop");
        expect(transcribeMock).toHaveBeenCalledTimes(1);
    });
});
