import { z } from "zod";
import { apiResponse } from "./responses";
export const privacyReceiptSchema = z.object({
    captures: z.number().int(),
    chunks: z.number().int(),
    chunks_holding_raw: z.number().int(),
    frames_stored: z.number().int(),
    memories: z.number().int(),
    reminders: z.number().int(),
    tracked_objects: z.number().int(),
    storage_bytes: z.number().int(),
    wording: z.string(),
});
export type PrivacyReceipt = z.infer<typeof privacyReceiptSchema>;
export const privacyResponseSchema = apiResponse(privacyReceiptSchema);
