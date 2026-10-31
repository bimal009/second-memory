import { z } from "zod";

export const askRequestSchema = z.object({
  question: z.string().min(1),
});
export type AskRequest = z.infer<typeof askRequestSchema>;

/**
 * A grounded answer. `known=false` means "no memory of that" (answer still
 * explains that). frame/memory ids point at /media and /memories resources;
 * lat/lng is the map pin when known.
 */
export const askAnswerSchema = z.object({
  question: z.string(),
  known: z.boolean(),
  answer: z.string(),
  memory_id: z.string().uuid().nullable(),
  frame: z
    .object({
      media_id: z.string().uuid(),
      thumbnail_id: z.string().uuid().nullable(),
      offset_ms: z.number().int().nullable(),
    })
    .nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  last_seen_at: z.string().datetime({ offset: true }).nullable(),
  usually_here: z.boolean(),
});
export type AskAnswer = z.infer<typeof askAnswerSchema>;
