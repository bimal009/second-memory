import { z } from "zod";
import { apiResponse } from "./responses";
export const devicePlatform = z.enum(["android", "ios"]);
export const deviceSchema = z.object({
    id: z.string().uuid(),
    push_token: z.string().nullable(),
    platform: devicePlatform,
    last_seen_at: z.string(),
    created_at: z.string(),
});
export type Device = z.infer<typeof deviceSchema>;
export const createDeviceSchema = z.object({
    push_token: z.string().nullable().optional(),
    platform: devicePlatform,
});
export type CreateDeviceSchema = z.infer<typeof createDeviceSchema>;
export const updateDeviceSchema = createDeviceSchema.partial();
export type UpdateDeviceSchema = z.infer<typeof updateDeviceSchema>;
export const deviceResponseSchema = apiResponse(deviceSchema);
export const devicesResponseSchema = apiResponse(z.array(deviceSchema));
