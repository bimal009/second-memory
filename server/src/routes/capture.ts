import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCaptureSchema, CHUNK_DURATION_S, MAX_UPLOAD_MB, type ApiResponse, type Capture, } from "@repo/types";
import { db } from "../db/index";
import { captures, chunks } from "../db/schema";
import { captureDir, chunkDir, ensureCaptureDir, ensureChunkDir, } from "../lib/storage";
import { enqueueChunk, enqueueSummary } from "../lib/queue";
import { chunksRouter } from "./chunk";
import { getMediaInfo } from "../services/ffmpeg";
const execFileAsync = promisify(execFile);
type Env = {
    Variables: {
        userId: string;
    };
};
const uuidSchema = z.string().uuid();
function toCapture(capture: {
    id: string;
    source: string;
    status: string;
    error: string | null;
    createdAt: Date;
    endedAt: Date | null;
    processedAt: Date | null;
}): Capture {
    return {
        id: capture.id,
        source: capture.source as Capture["source"],
        status: capture.status as Capture["status"],
        error: capture.error,
        created_at: capture.createdAt.toISOString(),
        ended_at: capture.endedAt?.toISOString() ?? null,
        processed_at: capture.processedAt?.toISOString() ?? null,
    };
}
export const captureRouter = new Hono<Env>();
captureRouter.route("/:captureId/chunks", chunksRouter);
captureRouter.post("/", async (c) => {
    const parsed = createCaptureSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid body",
            data: null,
            error: { code: "INVALID_BODY", message: parsed.error.message },
        }, 400);
    }
    const [capture] = await db
        .insert(captures)
        .values({ userId: c.get("userId"), source: parsed.data.source })
        .returning();
    if (!capture) {
        return c.json<ApiResponse<null>>({
            status: 500,
            message: "Internal server error",
            data: null,
            error: { code: "INTERNAL", message: "something went wrong" },
        }, 500);
    }
    await ensureCaptureDir(capture.id);
    return c.json<ApiResponse<Capture>>({
        status: 201,
        message: "Capture started",
        data: toCapture(capture),
        error: null,
    }, 201);
});
captureRouter.get("/", async (c) => {
    const rows = await db.query.captures.findMany({
        where: { userId: c.get("userId") },
        orderBy: { createdAt: "desc" },
    });
    return c.json<ApiResponse<Capture[]>>({
        status: 200,
        message: "OK",
        data: rows.map(toCapture),
        error: null,
    });
});
captureRouter.get("/:id", async (c) => {
    const capture = await db.query.captures.findFirst({
        where: { id: c.req.param("id"), userId: c.get("userId") },
    });
    if (!capture) {
        return c.json<ApiResponse<null>>({
            status: 404,
            message: "Not found",
            data: null,
            error: { code: "CAPTURE_NOT_FOUND", message: "capture not found" },
        }, 404);
    }
    return c.json<ApiResponse<Capture>>({
        status: 200,
        message: "OK",
        data: toCapture(capture),
        error: null,
    });
});
captureRouter.post("/:id/end", async (c) => {
    const [capture] = await db
        .update(captures)
        .set({ endedAt: new Date(), status: "ending" })
        .where(and(eq(captures.id, c.req.param("id")), eq(captures.userId, c.get("userId")), inArray(captures.status, ["recording", "paused"])))
        .returning();
    if (!capture) {
        return c.json<ApiResponse<null>>({
            status: 404,
            message: "Not found",
            data: null,
            error: {
                code: "CAPTURE_NOT_FOUND",
                message: "capture not found or already ended",
            },
        }, 404);
    }
    enqueueSummary(capture.id).catch((err) => console.error("[captures] summary enqueue failed", err));
    return c.json<ApiResponse<Capture>>({
        status: 200,
        message: "Capture ended",
        data: toCapture(capture),
        error: null,
    });
});
captureRouter.post("/:id/pause", async (c) => {
    const id = c.req.param("id");
    if (!uuidSchema.safeParse(id).success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid params",
            data: null,
            error: { code: "INVALID_PARAM", message: "captureId must be a uuid" },
        }, 400);
    }
    const [capture] = await db
        .update(captures)
        .set({ status: "paused" })
        .where(and(eq(captures.id, id), eq(captures.userId, c.get("userId")), eq(captures.status, "recording")))
        .returning();
    if (!capture) {
        return c.json<ApiResponse<null>>({
            status: 409,
            message: "Conflict",
            data: null,
            error: { code: "NOT_PAUSABLE", message: "capture is not recording" },
        }, 409);
    }
    return c.json<ApiResponse<Capture>>({
        status: 200,
        message: "Capture paused",
        data: toCapture(capture),
        error: null,
    });
});
captureRouter.post("/:id/resume", async (c) => {
    const id = c.req.param("id");
    if (!uuidSchema.safeParse(id).success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid params",
            data: null,
            error: { code: "INVALID_PARAM", message: "captureId must be a uuid" },
        }, 400);
    }
    const [capture] = await db
        .update(captures)
        .set({ status: "recording" })
        .where(and(eq(captures.id, id), eq(captures.userId, c.get("userId")), eq(captures.status, "paused")))
        .returning();
    if (!capture) {
        return c.json<ApiResponse<null>>({
            status: 409,
            message: "Conflict",
            data: null,
            error: { code: "NOT_RESUMABLE", message: "capture is not paused" },
        }, 409);
    }
    return c.json<ApiResponse<Capture>>({
        status: 200,
        message: "Capture resumed",
        data: toCapture(capture),
        error: null,
    });
});
captureRouter.delete("/", async (c) => {
    const marked = await db
        .update(captures)
        .set({ status: "deleting" })
        .where(eq(captures.userId, c.get("userId")))
        .returning({ id: captures.id });
    await db.delete(captures).where(eq(captures.userId, c.get("userId")));
    await Promise.all(marked.map((m) => rm(captureDir(m.id), { recursive: true, force: true }).catch(() => { })));
    return c.json<ApiResponse<null>>({
        status: 200,
        message: "All captures deleted",
        data: null,
        error: null,
    });
});
captureRouter.delete("/:id", async (c) => {
    const id = c.req.param("id");
    if (!uuidSchema.safeParse(id).success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid params",
            data: null,
            error: { code: "INVALID_PARAM", message: "captureId must be a uuid" },
        }, 400);
    }
    const [marked] = await db
        .update(captures)
        .set({ status: "deleting" })
        .where(and(eq(captures.id, id), eq(captures.userId, c.get("userId"))))
        .returning({ id: captures.id });
    if (!marked) {
        return c.json<ApiResponse<null>>({
            status: 404,
            message: "Not found",
            data: null,
            error: { code: "CAPTURE_NOT_FOUND", message: "capture not found" },
        }, 404);
    }
    await db.delete(captures).where(eq(captures.id, id));
    await rm(captureDir(id), { recursive: true, force: true }).catch(() => { });
    return c.json<ApiResponse<null>>({
        status: 200,
        message: "Capture deleted",
        data: null,
        error: null,
    });
});
captureRouter.post("/:id/import", async (c) => {
    const id = c.req.param("id");
    if (!uuidSchema.safeParse(id).success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid params",
            data: null,
            error: { code: "INVALID_PARAM", message: "captureId must be a uuid" },
        }, 400);
    }
    const capture = await db.query.captures.findFirst({
        where: { id, userId: c.get("userId") },
        columns: { id: true, status: true },
    });
    if (!capture) {
        return c.json<ApiResponse<null>>({
            status: 404,
            message: "Not found",
            data: null,
            error: { code: "CAPTURE_NOT_FOUND", message: "capture not found" },
        }, 404);
    }
    if (capture.status === "deleting") {
        return c.json<ApiResponse<null>>({
            status: 409,
            message: "Conflict",
            data: null,
            error: { code: "CAPTURE_CLOSED", message: "capture is being deleted" },
        }, 409);
    }
    if ((await db.$count(chunks, eq(chunks.captureId, id))) > 0) {
        return c.json<ApiResponse<null>>({
            status: 409,
            message: "Conflict",
            data: null,
            error: { code: "IMPORT_CONFLICT", message: "capture already has chunks" },
        }, 409);
    }
    const form = await c.req.parseBody();
    const file = form["file"];
    if (!(file instanceof File) || file.size === 0) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid body",
            data: null,
            error: {
                code: "FILE_REQUIRED",
                message: "a non-empty video file is required",
            },
        }, 400);
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        return c.json<ApiResponse<null>>({
            status: 413,
            message: "Payload too large",
            data: null,
            error: {
                code: "FILE_TOO_LARGE",
                message: `file exceeds ${MAX_UPLOAD_MB} MB`,
            },
        }, 413);
    }
    const srcPath = join(captureDir(id), "import.mp4");
    await ensureCaptureDir(id);
    await writeFile(srcPath, Buffer.from(await file.arrayBuffer()));
    try {
        const info = await getMediaInfo(srcPath);
        if (info.kind !== "video")
            throw new Error("only video files are supported");
        const segments = Math.max(1, Math.ceil(info.duration / CHUNK_DURATION_S));
        const baseMs = Date.now() - info.duration * 1000;
        for (let i = 0; i < segments; i++) {
            await ensureChunkDir(id, i);
            await execFileAsync("ffmpeg", [
                "-v", "error", "-y",
                "-ss", String(i * CHUNK_DURATION_S),
                "-t", String(CHUNK_DURATION_S),
                "-i", srcPath,
                "-c", "copy",
                join(chunkDir(id, i), "video.mp4"),
            ], { timeout: 60000 });
            await db.insert(chunks).values({
                captureId: id,
                idx: i,
                startedAt: new Date(baseMs + i * CHUNK_DURATION_S * 1000),
                durationS: CHUNK_DURATION_S,
                uploadBytes: 0,
            });
            await enqueueChunk(id, i);
        }
        return c.json<ApiResponse<{
            chunks: number;
        }>>({
            status: 201,
            message: "Video imported",
            data: { chunks: segments },
            error: null,
        });
    }
    catch (err) {
        console.error("[captures] import failed", err);
        return c.json<ApiResponse<null>>({
            status: 422,
            message: "Import failed",
            data: null,
            error: {
                code: "IMPORT_FAILED",
                message: err instanceof Error ? err.message : "import failed",
            },
        }, 422);
    }
    finally {
        await rm(srcPath, { force: true }).catch(() => { });
    }
});
