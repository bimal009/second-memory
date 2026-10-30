import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { rename, rm, writeFile } from "node:fs/promises";
import {
  CHUNK_DURATION_S,
  createChunkSchema,
  type ApiResponse,
  type Chunk,
} from "@repo/types";
import { db } from "../db/index";
import { chunks } from "../db/schema";
import {
  audioPath,
  chunkPath,
  ensureChunkDir,
  frameDir,
} from "../lib/storage";
import { chunkJobId, chunkQueue, enqueueChunk } from "../lib/queue";

type Env = { Variables: { userId: string } };

export const chunksRouter = new Hono<Env>();

chunksRouter.post("/", async (c) => {
  const captureId = c.req.param("captureId");
  if (!captureId) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid params",
        data: null,
        error: { code: "INVALID_PARAM", message: "captureId is required" },
      },
      400,
    );
  }

  const capture = await db.query.captures.findFirst({
    where: { id: captureId, userId: c.get("userId") },
    columns: { id: true, status: true },
  });
  if (!capture) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "CAPTURE_NOT_FOUND", message: "capture not found" },
      },
      404,
    );
  }
  if (capture.status !== "recording" && capture.status !== "processing") {
    return c.json<ApiResponse<null>>(
      {
        status: 409,
        message: "Conflict",
        data: null,
        error: {
          code: "CAPTURE_CLOSED",
          message: "capture is not accepting chunks",
        },
      },
      409,
    );
  }

  const form = await c.req.parseBody();
  const file = form["file"];
  if (!(file instanceof File) || file.size === 0) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid body",
        data: null,
        error: {
          code: "FILE_REQUIRED",
          message: "a non-empty file is required",
        },
      },
      400,
    );
  }

  const parsed = createChunkSchema.safeParse(form);
  if (!parsed.success) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid body",
        data: null,
        error: { code: "INVALID_BODY", message: parsed.error.message },
      },
      400,
    );
  }
  const body = parsed.data;

  const existing = await db.query.chunks.findFirst({
    where: { captureId, idx: body.idx },
  });
  if (existing) {
    if (existing.status === "uploaded") {
      try {
        await enqueueChunk(captureId, existing.idx);
      } catch (err) {
        console.error("[chunks] enqueue failed", err);
      }
    }
    return c.json<ApiResponse<Chunk>>({
      status: 200,
      message: "Chunk already uploaded",
      data: {
        id: existing.id,
        capture_id: existing.captureId,
        idx: existing.idx,
        started_at: existing.startedAt.toISOString(),
        duration_s: existing.durationS,
        lat: existing.lat,
        lng: existing.lng,
        accuracy_m: existing.accuracyM,
        status: existing.status as Chunk["status"],
        error: existing.error,
        upload_bytes: existing.uploadBytes,
        frames_kept: existing.framesKept,
        raw_deleted_at: existing.rawDeletedAt?.toISOString() ?? null,
        created_at: existing.createdAt.toISOString(),
        processed_at: existing.processedAt?.toISOString() ?? null,
      },
      error: null,
    });
  }

  const path = chunkPath(captureId, body.idx);
  await ensureChunkDir(captureId, body.idx);
  await writeFile(`${path}.part`, Buffer.from(await file.arrayBuffer()));
  await rename(`${path}.part`, path);

  const [created] = await db
    .insert(chunks)
    .values({
      captureId,
      idx: body.idx,
      startedAt: body.started_at,
      // ffprobe corrects this with the real duration during processing.
      durationS: body.duration_s ?? CHUNK_DURATION_S,
      lat: body.lat,
      lng: body.lng,
      accuracyM: body.accuracy_m,
      uploadBytes: file.size,
    })
    .onConflictDoNothing({ target: [chunks.captureId, chunks.idx] })
    .returning();

  if (!created) {
    const row = await db.query.chunks.findFirst({
      where: { captureId, idx: body.idx },
    });
    if (!row) {
      return c.json<ApiResponse<null>>(
        {
          status: 500,
          message: "Internal server error",
          data: null,
          error: { code: "INTERNAL", message: "chunk insert failed" },
        },
        500,
      );
    }
    return c.json<ApiResponse<Chunk>>({
      status: 200,
      message: "Chunk already uploaded",
      data: {
        id: row.id,
        capture_id: row.captureId,
        idx: row.idx,
        started_at: row.startedAt.toISOString(),
        duration_s: row.durationS,
        lat: row.lat,
        lng: row.lng,
        accuracy_m: row.accuracyM,
        status: row.status as Chunk["status"],
        error: row.error,
        upload_bytes: row.uploadBytes,
        frames_kept: row.framesKept,
        raw_deleted_at: row.rawDeletedAt?.toISOString() ?? null,
        created_at: row.createdAt.toISOString(),
        processed_at: row.processedAt?.toISOString() ?? null,
      },
      error: null,
    });
  }

  try {
    await enqueueChunk(captureId, created.idx);
  } catch (err) {
    console.error("[chunks] enqueue failed", err);
  }

  return c.json<ApiResponse<Chunk>>(
    {
      status: 201,
      message: "Chunk uploaded",
      data: {
        id: created.id,
        capture_id: created.captureId,
        idx: created.idx,
        started_at: created.startedAt.toISOString(),
        duration_s: created.durationS,
        lat: created.lat,
        lng: created.lng,
        accuracy_m: created.accuracyM,
        status: created.status as Chunk["status"],
        error: created.error,
        upload_bytes: created.uploadBytes,
        frames_kept: created.framesKept,
        raw_deleted_at: created.rawDeletedAt?.toISOString() ?? null,
        created_at: created.createdAt.toISOString(),
        processed_at: created.processedAt?.toISOString() ?? null,
      },
      error: null,
    },
    201,
  );
});

chunksRouter.get("/", async (c) => {
  const captureId = c.req.param("captureId");
  if (!captureId) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid params",
        data: null,
        error: { code: "INVALID_PARAM", message: "captureId is required" },
      },
      400,
    );
  }

  const capture = await db.query.captures.findFirst({
    where: { id: captureId, userId: c.get("userId") },
    columns: { id: true },
  });
  if (!capture) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "CAPTURE_NOT_FOUND", message: "capture not found" },
      },
      404,
    );
  }

  const rows = await db.query.chunks.findMany({
    where: { captureId },
    orderBy: { idx: "asc" },
  });

  return c.json<ApiResponse<Chunk[]>>({
    status: 200,
    message: "OK",
    data: rows.map((row) => ({
      id: row.id,
      capture_id: row.captureId,
      idx: row.idx,
      started_at: row.startedAt.toISOString(),
      duration_s: row.durationS,
      lat: row.lat,
      lng: row.lng,
      accuracy_m: row.accuracyM,
      status: row.status as Chunk["status"],
      error: row.error,
      upload_bytes: row.uploadBytes,
      frames_kept: row.framesKept,
      raw_deleted_at: row.rawDeletedAt?.toISOString() ?? null,
      created_at: row.createdAt.toISOString(),
      processed_at: row.processedAt?.toISOString() ?? null,
    })),
    error: null,
  });
});

chunksRouter.get("/:idx", async (c) => {
  const captureId = c.req.param("captureId");
  if (!captureId) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid params",
        data: null,
        error: { code: "INVALID_PARAM", message: "captureId is required" },
      },
      400,
    );
  }

  const idxParam = c.req.param("idx");
  const idx = Number(idxParam);
  if (idxParam === undefined || !Number.isInteger(idx) || idx < 0) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid params",
        data: null,
        error: {
          code: "INVALID_PARAM",
          message: "idx must be a non-negative integer",
        },
      },
      400,
    );
  }

  const capture = await db.query.captures.findFirst({
    where: { id: captureId, userId: c.get("userId") },
    columns: { id: true },
  });
  if (!capture) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "CAPTURE_NOT_FOUND", message: "capture not found" },
      },
      404,
    );
  }

  const chunk = await db.query.chunks.findFirst({ where: { captureId, idx } });
  if (!chunk) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "CHUNK_NOT_FOUND", message: "chunk not found" },
      },
      404,
    );
  }

  return c.json<ApiResponse<Chunk>>({
    status: 200,
    message: "OK",
    data: {
      id: chunk.id,
      capture_id: chunk.captureId,
      idx: chunk.idx,
      started_at: chunk.startedAt.toISOString(),
      duration_s: chunk.durationS,
      lat: chunk.lat,
      lng: chunk.lng,
      accuracy_m: chunk.accuracyM,
      status: chunk.status as Chunk["status"],
      error: chunk.error,
      upload_bytes: chunk.uploadBytes,
      frames_kept: chunk.framesKept,
      raw_deleted_at: chunk.rawDeletedAt?.toISOString() ?? null,
      created_at: chunk.createdAt.toISOString(),
      processed_at: chunk.processedAt?.toISOString() ?? null,
    },
    error: null,
  });
});

chunksRouter.delete("/:idx", async (c) => {
  const captureId = c.req.param("captureId");
  if (!captureId) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid params",
        data: null,
        error: { code: "INVALID_PARAM", message: "captureId is required" },
      },
      400,
    );
  }

  const idxParam = c.req.param("idx");
  const idx = Number(idxParam);
  if (idxParam === undefined || !Number.isInteger(idx) || idx < 0) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid params",
        data: null,
        error: {
          code: "INVALID_PARAM",
          message: "idx must be a non-negative integer",
        },
      },
      400,
    );
  }

  const capture = await db.query.captures.findFirst({
    where: { id: captureId, userId: c.get("userId") },
    columns: { id: true },
  });
  if (!capture) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "CAPTURE_NOT_FOUND", message: "capture not found" },
      },
      404,
    );
  }

  const [deleted] = await db
    .delete(chunks)
    .where(and(eq(chunks.captureId, captureId), eq(chunks.idx, idx)))
    .returning({ id: chunks.id });
  if (!deleted) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "CHUNK_NOT_FOUND", message: "chunk not found" },
      },
      404,
    );
  }

  await chunkQueue.remove(chunkJobId(captureId, idx)).catch(() => {});

  await rm(chunkPath(captureId, idx), { force: true });
  await rm(audioPath(captureId, idx), { force: true });
  await rm(frameDir(captureId, idx), { recursive: true, force: true });

  return c.json<ApiResponse<null>>({
    status: 200,
    message: "Chunk deleted",
    data: null,
    error: null,
  });
});
