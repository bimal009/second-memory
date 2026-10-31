import { z } from "zod";
import { apiResponse } from "./responses";

export const trackedObjectSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  tracked: z.boolean(),
  last_nudged_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string(),
});
export type TrackedObject = z.infer<typeof trackedObjectSchema>;

export const trackedObjectsResponseSchema = apiResponse(
  z.array(trackedObjectSchema),
);
export const trackedObjectResponseSchema = apiResponse(trackedObjectSchema);
