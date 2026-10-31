import { z } from "zod";
import { apiResponse } from "./responses";

export const recapSchema = z.object({
  day: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  created_at: z.string(),
});
export type Recap = z.infer<typeof recapSchema>;

export const recapResponseSchema = apiResponse(recapSchema);
export const recapsResponseSchema = apiResponse(z.array(recapSchema));
