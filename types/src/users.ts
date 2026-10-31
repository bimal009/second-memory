import { z } from "zod";
import { apiResponse } from "./responses";
export const userSchema = z.object({
    id: z.string().uuid(),
    assistant_name: z.string().regex(/^[A-Za-z]{2,12}$/, {
        message: "one word, 2-12 letters",
    }),
    timezone: z.string().default("UTC"),
    created_at: z.string(),
});
export type User = z.infer<typeof userSchema>;
export const createUserSchema = userSchema.omit({ id: true, created_at: true });
export type CreateUserSchema = z.infer<typeof createUserSchema>;
export const updateUserSchema = createUserSchema.partial();
export type UpdateUserSchema = z.infer<typeof updateUserSchema>;
export const userResponseSchema = apiResponse(userSchema);
export type UserResponse = z.infer<typeof userResponseSchema>;
export const createUserResponseSchema = apiResponse(userSchema.extend({ api_key: z.string() }));
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;
