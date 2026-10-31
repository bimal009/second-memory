import { createMiddleware } from "hono/factory";
import type { ApiResponse } from "@repo/types";
import { hashApiKey } from "../lib/hash";
import { db } from "../db/index";
export const auth = createMiddleware<{
    Variables: {
        userId: string;
    };
}>(async (c, next) => {
    const apiKey = c.req.header("X-API-Key");
    const user = apiKey
        ? await db.query.users.findFirst({
            where: { apiKeyHash: hashApiKey(apiKey) },
            columns: { id: true },
        })
        : undefined;
    if (!user) {
        return c.json<ApiResponse<null>>({
            status: 401,
            message: "Unauthorized",
            data: null,
            error: {
                code: "UNAUTHORIZED",
                message: "invalid or missing api key",
            },
        }, 401);
    }
    c.set("userId", user.id);
    await next();
});
