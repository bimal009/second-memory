import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { rm } from "node:fs/promises";
import {
  createCaptureSchema,
  type ApiResponse,
  type Capture,
} from "@repo/types";
import { db } from "../db/index";
import { captures } from "../db/schema";
import { captureDir, ensureCaptureDir } from "../lib/storage";
import { chunksRouter } from "./chunk";

type Env = { Variables: { userId: string } };

export const captureRouter = new Hono<Env>();

captureRouter.route("/:captureId/chunks", chunksRouter);

captureRouter.post("/", async (c) => {
  const parsed = createCaptureSchema.safeParse(
    await c.req.json().catch(() => ({})),
  );
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

  const [capture] = await db
    .insert(captures)
    .values({ userId: c.get("userId"), source: parsed.data.source })
    .returning();

  if (!capture) {
    return c.json<ApiResponse<null>>(
      {
        status: 500,
        message: "Internal server error",
        data: null,
        error: { code: "INTERNAL", message: "something went wrong" },
      },
      500,
    );
  }

  // Root folder for everything this capture will ever store on disk.
  await ensureCaptureDir(capture.id);

  return c.json<ApiResponse<Capture>>(
    {
      status: 201,
      message: "Capture started",
      data: {
        id: capture.id,
        source: capture.source as Capture["source"],
        status: capture.status as Capture["status"],
        error: capture.error,
        created_at: capture.createdAt.toISOString(),
        ended_at: capture.endedAt?.toISOString() ?? null,
        processed_at: capture.processedAt?.toISOString() ?? null,
      },
      error: null,
    },
    201,
  );
});

captureRouter.get("/", async (c) => {
  const rows = await db.query.captures.findMany({
    where: { userId: c.get("userId") },
    orderBy: { createdAt: "desc" },
  });

  return c.json<ApiResponse<Capture[]>>({
    status: 200,
    message: "OK",
    data: rows.map((capture) => ({
      id: capture.id,
      source: capture.source as Capture["source"],
      status: capture.status as Capture["status"],
      error: capture.error,
      created_at: capture.createdAt.toISOString(),
      ended_at: capture.endedAt?.toISOString() ?? null,
      processed_at: capture.processedAt?.toISOString() ?? null,
    })),
    error: null,
  });
});

captureRouter.get("/:id", async (c) => {
  const capture = await db.query.captures.findFirst({
    where: { id: c.req.param("id"), userId: c.get("userId") },
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

  return c.json<ApiResponse<Capture>>({
    status: 200,
    message: "OK",
    data: {
      id: capture.id,
      source: capture.source as Capture["source"],
      status: capture.status as Capture["status"],
      error: capture.error,
      created_at: capture.createdAt.toISOString(),
      ended_at: capture.endedAt?.toISOString() ?? null,
      processed_at: capture.processedAt?.toISOString() ?? null,
    },
    error: null,
  });
});

captureRouter.post("/:id/end", async (c) => {
  const [capture] = await db
    .update(captures)
    .set({ endedAt: new Date(), status: "ending" })
    .where(
      and(
        eq(captures.id, c.req.param("id")),
        eq(captures.userId, c.get("userId")),
        eq(captures.status, "recording"),
      ),
    )
    .returning();

  if (!capture) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: {
          code: "CAPTURE_NOT_FOUND",
          message: "capture not found or already ended",
        },
      },
      404,
    );
  }

  return c.json<ApiResponse<Capture>>({
    status: 200,
    message: "Capture ended",
    data: {
      id: capture.id,
      source: capture.source as Capture["source"],
      status: capture.status as Capture["status"],
      error: capture.error,
      created_at: capture.createdAt.toISOString(),
      ended_at: capture.endedAt?.toISOString() ?? null,
      processed_at: capture.processedAt?.toISOString() ?? null,
    },
    error: null,
  });
});

captureRouter.delete("/:id", async (c) => {
  const [capture] = await db
    .delete(captures)
    .where(
      and(
        eq(captures.id, c.req.param("id")),
        eq(captures.userId, c.get("userId")),
      ),
    )
    .returning({ id: captures.id });

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

  await rm(captureDir(capture.id), { recursive: true, force: true });

  return c.json<ApiResponse<null>>({
    status: 200,
    message: "Capture deleted",
    data: null,
    error: null,
  });
});
