import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, closeDb } from "../src/db/index";
import { users, captures, memories, objects, sightings, reminders } from "../src/db/schema";
import { hashApiKey } from "../src/lib/hash";
import { sweepNudges } from "../src/worker";

vi.mock("../src/lib/meta", () => ({
    chat: vi.fn(), intentPlan: vi.fn(), transcribe: vi.fn(), vision: vi.fn(),
}));

const KEY = `nudge-key-${crypto.randomUUID()}`;
let userId = "";

beforeAll(async () => {
    const [user] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(KEY) })
        .returning({ id: users.id });
    userId = user.id;
    await db.insert(captures).values({ userId, status: "ready" });
    const [capture] = await db.select().from(captures).where(eq(captures.userId, userId));
    const [seen] = await db
        .insert(memories)
        .values({
            userId,
            captureId: capture!.id,
            kind: "session_chunk",
            status: "ready",
            note: "keys on the table here",
            lat: 27.7,
            lng: 85.3,
            occurredAt: new Date(Date.now() - 3600_000),
        })
        .returning({ id: memories.id });
    const [nowHere] = await db
        .insert(memories)
        .values({
            userId,
            captureId: capture!.id,
            kind: "session_chunk",
            status: "ready",
            note: "walked across the city",
            lat: 27.75,
            lng: 85.4,
            occurredAt: new Date(),
        })
        .returning({ id: memories.id });
    await db.insert(objects).values({ userId, label: "keys", tracked: true });
    const object = await db.query.objects.findFirst({
        where: { userId, label: "keys" },
        columns: { id: true },
    });
    await db.insert(sightings).values({
        objectId: object!.id,
        memoryId: seen!.id,
        seenAt: new Date(Date.now() - 3600_000),
    });
});

afterAll(async () => {
    if (userId) await db.delete(users).where(eq(users.id, userId));
    await closeDb();
});

describe("leave-behind nudge sweep", () => {
    it("nudges once for a tracked object left far away and again only after the cooldown", async () => {
        await sweepNudges();
        const rows = await db.query.reminders.findMany({ where: { userId } });
        expect(rows.length).toBe(1);
        expect(rows[0].source).toBe("nudge");
        expect(rows[0].text).toContain("keys");
        const object = await db.query.objects.findFirst({
            where: { userId, label: "keys" },
            columns: { lastNudgedAt: true },
        });
        expect(object!.lastNudgedAt).not.toBeNull();

        await sweepNudges();
        const again = await db.query.reminders.findMany({ where: { userId } });
        expect(again.length).toBe(1);
    });
});
