import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { rename, rm, writeFile } from "node:fs/promises";
import { createChunkSchema, type ApiResponse, type Chunk } from "@repo/types";
import { db } from "../db/index";
import { chunks } from "../db/schema";
import { captureDir, ensureDir } from "../lib/storage";

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

  let chunk = await db.query.chunks.findFirst({
    where: { captureId, idx: body.idx },
  });

  if (!chunk) {
    const dir = captureDir(captureId);
    await ensureDir(dir);
    await writeFile(
      `${dir}/${body.idx}.mp4.part`,
      Buffer.from(await file.arrayBuffer()),
    );
    await rename(`${dir}/${body.idx}.mp4.part`, `${dir}/${body.idx}.mp4`);

    const [inserted] = await db
      .insert(chunks)
      .values({
        captureId,
        idx: body.idx,
        startedAt: body.started_at,
        durationS: body.duration_s,
        lat: body.lat,
        lng: body.lng,
        accuracyM: body.accuracy_m,
        uploadBytes: file.size,
      })
      .returning();

    chunk = inserted;
  }

  return c.json<ApiResponse<Chunk>>(
    {
      status: 201,
      message: "Chunk uploaded",
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
    data: rows.map((chunk) => ({
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
    })),
    error: null,
  });
});

chunksRouter.get("/:idx", async (c) => {
  const captureId = c.req.param("captureId");
  const idxParam = c.req.param("idx");
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
  if (!idxParam) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid params",
        data: null,
        error: { code: "INVALID_PARAM", message: "idx is required" },
      },
      400,
    );
  }

  const idx = Number(idxParam);
  if (!Number.isInteger(idx) || idx < 0) {
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

  const chunk = await db.query.chunks.findFirst({
    where: { captureId, idx },
  });
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
  const idxParam = c.req.param("idx");
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
  if (!idxParam) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid params",
        data: null,
        error: { code: "INVALID_PARAM", message: "idx is required" },
      },
      400,
    );
  }

  const idx = Number(idxParam);
  if (!Number.isInteger(idx) || idx < 0) {
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

  const [chunk] = await db
    .delete(chunks)
    .where(and(eq(chunks.captureId, captureId), eq(chunks.idx, idx)))
    .returning({ id: chunks.id });

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

  await rm(`${captureDir(captureId)}/${idx}.mp4`, { force: true });

  return c.json<ApiResponse<null>>({
    status: 200,
    message: "Chunk deleted",
    data: null,
    error: null,
  });
});
