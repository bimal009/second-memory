import { Hono } from "hono";
import { type ApiResponse, routerRequestSchema } from "@repo/types";
import { db } from "../db/index";

type Env = { Variables: { userId: string } };

export const routerRouter = new Hono<Env>();

/**
 * Voice/text command router. Multipart audio mode, the regex fast path, the
 * Muse plan call and action execution are wired in Phase 3 (router phase);
 * this file already owns validation and command_id idempotency.
 */
routerRouter.post("/", async (c) => {
  const parsed = routerRequestSchema.safeParse(
    await c.req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid body",
        data: null,
        error: { code: "INVALID_BODY", message: parsed.error.message },
      },
      400,
    );
  }
  const body = parsed.data;

  // Idempotency: a retry with the same (user_id, command_id) replays the
  // stored result instead of creating duplicate moments/reminders/tracks.
  const existing = await db.query.routerCommands.findFirst({
    where: { userId: c.get("userId"), commandId: body.command_id },
  });
  if (existing) {
    return c.json<ApiResponse<unknown>>({
      status: 200,
      message: "Command replayed",
      data: existing.result,
      error: null,
    });
  }

  // TODO(PHASE 3): transcribe audio (multipart) or use transcript, regex fast
  // path, Muse plan -> CommandPlan validate -> retry -> run actions in order,
  // store into router_commands, return full result (ask included).
  return c.json<ApiResponse<null>>(
    {
      status: 501,
      message: "Not implemented",
      data: null,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "router plan execution lands in the router phase",
      },
    },
    501,
  );
});
