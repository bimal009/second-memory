import { Hono } from "hono";
import { type ApiResponse, askRequestSchema } from "@repo/types";
type Env = {
    Variables: {
        userId: string;
    };
};
export const askRouter = new Hono<Env>();
askRouter.post("/", async (c) => {
    const parsed = askRequestSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid body",
            data: null,
            error: { code: "INVALID_BODY", message: parsed.error.message },
        }, 400);
    }
    return c.json<ApiResponse<null>>({
        status: 501,
        message: "Not implemented",
        data: null,
        error: {
            code: "NOT_IMPLEMENTED",
            message: "ask answering lands in the ask phase",
        },
    }, 501);
});
