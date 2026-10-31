import { z } from "zod";
import { apiResponse } from "./responses";
export const memorySchema = z.object({
    id: z.string().uuid(),
    capture_id: z.string().uuid(),
    chunk_id: z.string().uuid().nullable(),
    chunk_idx: z.number().int().nullable(),
    kind: z.enum(["moment", "session_chunk", "session_summary"]),
    status: z.enum(["pending", "ready"]),
    note: z.string(),
    description: z.string().nullable(),
    transcript: z.string().nullable(),
    tags: z.array(z.string()),
    window_start: z.string().nullable(),
    window_end: z.string().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    occurred_at: z.string(),
    created_at: z.string(),
    media: z.array(z.object({
        id: z.string().uuid(),
        kind: z.enum(["frame", "thumbnail", "mask"]),
        parent_id: z.string().uuid().nullable(),
        storage_key: z.string(),
        offset_ms: z.number().int().nullable(),
    })),
});
export type Memory = z.infer<typeof memorySchema>;
export const memoriesResponseSchema = apiResponse(z.array(memorySchema));
export const memoryResponseSchema = apiResponse(memorySchema);
