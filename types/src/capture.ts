import { z } from "zod";
import { apiResponse } from "./responses";
export const captureSource = z.enum(["phone", "glasses", "import"]);
export type CaptureSource = z.infer<typeof captureSource>;
export const captureStatus = z.enum([
    "recording",
    "paused",
    "ending",
    "processing",
    "ready",
    "failed",
    "deleting",
]);
export type CaptureStatus = z.infer<typeof captureStatus>;
export const captureSchema = z.object({
    id: z.string().uuid(),
    source: captureSource,
    status: captureStatus,
    error: z.string().nullable(),
    created_at: z.string(),
    ended_at: z.string().nullable(),
    processed_at: z.string().nullable(),
});
export type Capture = z.infer<typeof captureSchema>;
export const createCaptureSchema = z.object({
    source: captureSource.optional(),
});
export type CreateCaptureSchema = z.infer<typeof createCaptureSchema>;
export const captureResponseSchema = apiResponse(captureSchema);
export const capturesResponseSchema = apiResponse(z.array(captureSchema));
