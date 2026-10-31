import { Hono } from "hono";
import { type ApiResponse, type AskAnswer, askRequestSchema } from "@repo/types";
import { answerAsk } from "../lib/ask";

type Env = { Variables: { userId: string } };

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

    const answer: AskAnswer = await answerAsk(c.get("userId"), parsed.data.question);

    return c.json<ApiResponse<AskAnswer>>({
        status: 200,
        message: "OK",
        data: answer,
        error: null,
    });
});
