import { Hono } from "hono";
import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { type ApiResponse, type Memory } from "@repo/types";
import { db } from "../db/index";
import { memories } from "../db/schema";
type Env = {
    Variables: {
        userId: string;
    };
};
export const memoriesRouter = new Hono<Env>();
const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    before: z.coerce.date().optional(),
});
const idParamSchema = z.object({ id: z.string().uuid() });
type MemoryRow = {
    id: string;
    captureId: string;
    chunkId: string | null;
    kind: string;
    status: string;
    note: string;
    description: string | null;
    transcript: string | null;
    tags: string[];
    windowStart: Date | null;
    windowEnd: Date | null;
    lat: number | null;
    lng: number | null;
    occurredAt: Date;
    createdAt: Date;
    media: {
        id: string;
        kind: string;
        parentId: string | null;
        storageKey: string;
        offsetMs: number | null;
    }[];
};
const MEMORY_COLUMNS = {
    id: true,
    captureId: true,
    chunkId: true,
    kind: true,
    status: true,
    note: true,
    description: true,
    transcript: true,
    tags: true,
    windowStart: true,
    windowEnd: true,
    lat: true,
    lng: true,
    occurredAt: true,
    createdAt: true,
} as const;
const MEMORY_MEDIA = {
    columns: {
        id: true,
        kind: true,
        parentId: true,
        storageKey: true,
        offsetMs: true,
    },
} as const;
const toMemory = (row: MemoryRow): Memory => ({
    id: row.id,
    capture_id: row.captureId,
    chunk_id: row.chunkId,
    kind: row.kind as Memory["kind"],
    status: row.status as Memory["status"],
    note: row.note,
    description: row.description,
    transcript: row.transcript,
    tags: row.tags,
    window_start: row.windowStart?.toISOString() ?? null,
    window_end: row.windowEnd?.toISOString() ?? null,
    lat: row.lat,
    lng: row.lng,
    occurred_at: row.occurredAt.toISOString(),
    created_at: row.createdAt.toISOString(),
    media: row.media.map((m) => ({
        id: m.id,
        kind: m.kind as Memory["media"][number]["kind"],
        parent_id: m.parentId,
        storage_key: m.storageKey,
        offset_ms: m.offsetMs,
    })),
});
memoriesRouter.get("/", async (c) => {
    const parsed = listQuerySchema.safeParse({
        limit: c.req.query("limit") ?? undefined,
        before: c.req.query("before") ?? undefined,
    });
    if (!parsed.success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid query",
            data: null,
            error: { code: "INVALID_QUERY", message: parsed.error.message },
        }, 400);
    }
    const { limit, before } = parsed.data;
    const rows = (await db.query.memories.findMany({
        where: {
            userId: c.get("userId"),
            ...(before ? { occurredAt: { lt: before } } : {}),
        },
        orderBy: { occurredAt: "desc" },
        limit,
        columns: MEMORY_COLUMNS,
        with: { media: MEMORY_MEDIA },
    })) as unknown as MemoryRow[];
    return c.json<ApiResponse<Memory[]>>({
        status: 200,
        message: "OK",
        data: rows.map(toMemory),
        error: null,
    });
});
memoriesRouter.get("/:id", async (c) => {
    const parsed = idParamSchema.safeParse({ id: c.req.param("id") });
    if (!parsed.success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid param",
            data: null,
            error: { code: "INVALID_PARAM", message: parsed.error.message },
        }, 400);
    }
    const row = (await db.query.memories.findFirst({
        where: { id: parsed.data.id, userId: c.get("userId") },
        columns: MEMORY_COLUMNS,
        with: { media: MEMORY_MEDIA },
    })) as unknown as MemoryRow | undefined;
    if (!row) {
        return c.json<ApiResponse<null>>({
            status: 404,
            message: "Not found",
            data: null,
            error: { code: "MEMORY_NOT_FOUND", message: "memory not found" },
        }, 404);
    }
    return c.json<ApiResponse<Memory>>({
        status: 200,
        message: "OK",
        data: toMemory(row),
        error: null,
    });
});
