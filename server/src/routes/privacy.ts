import { Hono } from "hono";
import { count, eq } from "drizzle-orm";
import { type ApiResponse, type PrivacyReceipt } from "@repo/types";
import { db } from "../db/index";
import { memories, objects, reminders } from "../db/schema";
type Env = {
    Variables: {
        userId: string;
    };
};
export const privacyRouter = new Hono<Env>();
const WORDING = "The server holds each chunk briefly in storage/capture/<capture_id>/<idx>/ " +
    "then deletes the raw video and WAV once the chunk is processed. Key frames, " +
    "thumbnails and text stay. The full video never leaves your phone.";
privacyRouter.get("/", async (c) => {
    const userId = c.get("userId");
    const [memCount] = await db
        .select({ n: count() })
        .from(memories)
        .where(eq(memories.userId, userId));
    const [reminderCount] = await db
        .select({ n: count() })
        .from(reminders)
        .where(eq(reminders.userId, userId));
    const [trackedCount] = await db
        .select({ n: count() })
        .from(objects)
        .where(eq(objects.userId, userId));
    const caps = await db.query.captures.findMany({
        where: { userId },
        columns: { id: true },
        with: {
            chunks: {
                columns: { uploadBytes: true, rawDeletedAt: true },
            },
            memories: {
                columns: { id: true },
                with: { media: { columns: { kind: true } } },
            },
        },
    });
    let chunksTotal = 0;
    let chunksHoldingRaw = 0;
    let storageBytes = 0;
    let framesStored = 0;
    for (const cap of caps) {
        chunksTotal += cap.chunks.length;
        for (const chunk of cap.chunks) {
            storageBytes += chunk.uploadBytes;
            if (!chunk.rawDeletedAt)
                chunksHoldingRaw += 1;
        }
        for (const memory of cap.memories) {
            framesStored += memory.media.filter((m) => m.kind === "frame").length;
        }
    }
    const data: PrivacyReceipt = {
        captures: caps.length,
        chunks: chunksTotal,
        chunks_holding_raw: chunksHoldingRaw,
        frames_stored: framesStored,
        memories: memCount?.n ?? 0,
        reminders: reminderCount?.n ?? 0,
        tracked_objects: trackedCount?.n ?? 0,
        storage_bytes: storageBytes,
        wording: WORDING,
    };
    return c.json<ApiResponse<PrivacyReceipt>>({
        status: 200,
        message: "OK",
        data,
        error: null,
    });
});
