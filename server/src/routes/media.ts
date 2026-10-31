import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { type ApiResponse } from "@repo/types";
import { db } from "../db/index";
import { memories, media } from "../db/schema";
import { STORAGE_ROOT } from "../lib/storage";

type Env = {
    Variables: {
        userId: string;
    };
};

export const mediaRouter = new Hono<Env>();

const idParamSchema = z.object({ id: z.string().uuid() });

mediaRouter.get("/:id", async (c) => {
    const parsed = idParamSchema.safeParse({ id: c.req.param("id") });
    if (!parsed.success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid param",
            data: null,
            error: { code: "INVALID_PARAM", message: parsed.error.message },
        }, 400);
    }
    const [row] = await db
        .select({
            userId: memories.userId,
            storageKey: media.storageKey,
        })
        .from(media)
        .innerJoin(memories, eq(media.memoryId, memories.id))
        .where(eq(media.id, parsed.data.id))
        .limit(1);
    if (!row || row.userId !== c.get("userId")) {
        return c.json<ApiResponse<null>>({
            status: 404,
            message: "Not found",
            data: null,
            error: { code: "MEDIA_NOT_FOUND", message: "media not found" },
        }, 404);
    }
    const key = normalize(row.storageKey);
    if (normalize(join(STORAGE_ROOT, key)).startsWith(STORAGE_ROOT) === false) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid key",
            data: null,
            error: { code: "INVALID_KEY", message: "storage key escapes root" },
        }, 400);
    }
    try {
        const bytes = await readFile(join(STORAGE_ROOT, key));
        return c.body(new Uint8Array(bytes), 200, {
            "Content-Type": "image/jpeg",
            "Cache-Control": "private, max-age=31536000, immutable",
        });
    }
    catch {
        return c.json<ApiResponse<null>>({
            status: 404,
            message: "Not found",
            data: null,
            error: { code: "MEDIA_FILE_MISSING", message: "media file missing" },
        }, 404);
    }
});
