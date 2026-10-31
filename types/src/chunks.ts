import { z } from "zod";
import { apiResponse } from "./responses";
import { CHUNK_DURATION_S, MIN_CHUNK_DURATION_S } from "./constants";

export const chunkStatus = z.enum([
  "uploaded",
  "processing",
  "processed",
  "skipped",
  "failed",
]);
export type ChunkStatus = z.infer<typeof chunkStatus>;

export const localChunkStatus = z.enum([
  "pending",
  "uploading",
  "uploaded",
  "failed",
]);
export type LocalChunkStatus = z.infer<typeof localChunkStatus>;

export const localChunkSchema = z.object({
  id: z.string(),
  capture_id: z.string().uuid(),
  idx: z.number().int().min(0),
  started_at: z.string(),
  duration_s: z.number().min(MIN_CHUNK_DURATION_S).max(CHUNK_DURATION_S),
  path: z.string().min(1),
  status: localChunkStatus,
  size: z.number().int().nonnegative(),
  attempts: z.number().int().nonnegative(),
  last_error: z.string().nullable(),
  created_at: z.string(),
});
export type LocalChunk = z.infer<typeof localChunkSchema>;

export const chunkSchema = z.object({
  id: z.string().uuid(),
  capture_id: z.string().uuid(),
  idx: z.number().int().min(0),
  started_at: z.string(),
  duration_s: z.number().min(MIN_CHUNK_DURATION_S).max(CHUNK_DURATION_S),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  accuracy_m: z.number().nullable(),
  status: chunkStatus,
  error: z.string().nullable(),
  upload_bytes: z.number(),
  frames_kept: z.number().int(),
  raw_deleted_at: z.string().nullable(),
  created_at: z.string(),
  processed_at: z.string().nullable(),
});
export type Chunk = z.infer<typeof chunkSchema>;

/**
 * A chunk row as the database returns it (server-side snake_case names,
 * Date objects for timestamps). Mirrors the drizzle `chunks` table; use for
 * worker/router code that passes rows around. Zod-parsed at boundaries.
 */
export const chunkRowSchema = z.object({
  id: z.string().uuid(),
  captureId: z.string().uuid(),
  idx: z.number().int().min(0),
  startedAt: z.date(),
  durationS: z.number(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  accuracyM: z.number().nullable(),
  status: chunkStatus,
  error: z.string().nullable(),
  uploadBytes: z.number().int().nonnegative(),
  framesKept: z.number().int(),
  rawDeletedAt: z.date().nullable(),
  createdAt: z.date(),
  processedAt: z.date().nullable(),
});
export type ChunkRow = z.infer<typeof chunkRowSchema>;

export const createChunkSchema = z
  .object({
    idx: z.coerce.number().int().min(0),
    started_at: z.coerce.date(),
    duration_s: z.coerce
      .number()
      .min(MIN_CHUNK_DURATION_S)
      .max(CHUNK_DURATION_S)
      .optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    accuracy_m: z.coerce.number().optional(),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: "lat and lng must be sent together",
  });
export type CreateChunkSchema = z.infer<typeof createChunkSchema>;

export const chunkResponseSchema = apiResponse(chunkSchema);
export const chunksResponseSchema = apiResponse(z.array(chunkSchema));
