import { z } from "zod";
import { apiResponse } from "./responses";
export const reminderSource = z.enum(["voice", "commitment", "summary"]);
export type ReminderSource = z.infer<typeof reminderSource>;
export const reminderStatus = z.enum(["pending", "done", "dismissed"]);
export type ReminderStatus = z.infer<typeof reminderStatus>;
export const reminderSchema = z.object({
    id: z.string().uuid(),
    text: z.string(),
    due_at: z.string().datetime({ offset: true }),
    source: reminderSource,
    status: reminderStatus,
    memory_id: z.string().uuid().nullable(),
    created_at: z.string(),
});
export type Reminder = z.infer<typeof reminderSchema>;
export const remindersResponseSchema = apiResponse(z.array(reminderSchema));
export const reminderResponseSchema = apiResponse(reminderSchema);
