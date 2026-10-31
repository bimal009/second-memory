import { z } from "zod";
export const chunkUnderstandingSchema = z.object({
    note: z.string().min(1),
    tags: z.array(z.string()),
    objects: z.array(z.string()),
    commitments: z.array(z.object({
        text: z.string().min(1),
        due_at: z.string().datetime({ offset: true }).nullable(),
    })),
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
