import { z } from "zod";
export const faceBoxSchema = z.object({
    i: z.number().int().min(0),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
});
export const chunkUnderstandingSchema = z.object({
    note: z.string().min(1),
    tags: z.array(z.string()),
    objects: z.array(z.string()),
    commitments: z.array(z.object({
        text: z.string().min(1),
        due_at: z.string().datetime({ offset: true }).nullable(),
    })),
    face_boxes: z.array(faceBoxSchema).optional(),
});
export type ChunkUnderstanding = z.infer<typeof chunkUnderstandingSchema>;
export const captureSummarySchema = z.object({
    summary: z.string().min(1),
    highlights: z.array(z.string()),
    action_items: z.array(z.object({
        text: z.string().min(1),
        due_at: z.string().datetime({ offset: true }).nullable(),
    })),
});
export type CaptureSummary = z.infer<typeof captureSummarySchema>;
