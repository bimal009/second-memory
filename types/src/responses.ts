import { z } from "zod";
export const apiError = z.object({
    code: z.string(),
    message: z.string(),
});
export type ApiError = z.infer<typeof apiError>;
export const apiResponse = <T extends z.ZodType>(data: T) => z.object({
    status: z.number(),
    message: z.string(),
    data: data.nullable(),
    error: apiError.nullable(),
});
export type ApiResponse<T> = {
    status: number;
    message: string;
    data: T | null;
    error: ApiError | null;
};
