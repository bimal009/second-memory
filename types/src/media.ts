import { z } from "zod";
export const MediaInfoSchema = z.object({
    kind: z.enum(["video", "audio", "image"]),
    width: z.number().int().nonnegative(),
    height: z.number().int().nonnegative(),
    duration: z.number().nonnegative(),
    has_audio: z.boolean(),
});
export type MediaInfo = z.infer<typeof MediaInfoSchema>;
