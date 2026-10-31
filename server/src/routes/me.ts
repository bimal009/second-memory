import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { type ApiResponse, updateUserSchema, type User } from "@repo/types";
import { db } from "../db/index";
import { users } from "../db/schema";

type Env = { Variables: { userId: string } };

export const meRouter = new Hono<Env>();

meRouter.get("/", async (c) => {
  const user = await db.query.users.findFirst({
    where: { id: c.get("userId") },
    columns: { id: true, assistantName: true, timezone: true, createdAt: true },
  });

  if (!user) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "USER_NOT_FOUND", message: "user not found" },
      },
      404,
    );
  }

  return c.json<ApiResponse<User>>({
    status: 200,
    message: "OK",
    data: {
      id: user.id,
      assistant_name: user.assistantName,
      timezone: user.timezone,
      created_at: user.createdAt.toISOString(),
    },
    error: null,
  });
});

meRouter.patch("/", async (c) => {
  const raw = await c.req.json().catch(() => ({}));
  const body =
    typeof raw.assistant_name === "string"
      ? { ...raw, assistant_name: raw.assistant_name.trim() }
      : raw;

  const parsed = updateUserSchema.safeParse(body);
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

  // Only write what the client actually sent: zod's timezone default would
  // otherwise clobber the stored timezone on every rename.
  const set: { assistantName?: string; timezone?: string } = {};
  if (parsed.data.assistant_name !== undefined) {
    set.assistantName = parsed.data.assistant_name;
  }
  if (typeof raw.timezone === "string" && raw.timezone.length > 0) {
    set.timezone = raw.timezone;
  }
  if (Object.keys(set).length === 0) {
    return c.json<ApiResponse<null>>(
      {
        status: 400,
        message: "Invalid body",
        data: null,
        error: { code: "EMPTY_PATCH", message: "nothing to update" },
      },
      400,
    );
  }

  const [user] = await db
    .update(users)
    .set(set)
    .where(eq(users.id, c.get("userId")))
    .returning({
      id: users.id,
      assistantName: users.assistantName,
      timezone: users.timezone,
      createdAt: users.createdAt,
    });

  if (!user) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "USER_NOT_FOUND", message: "user not found" },
      },
      404,
    );
  }

  return c.json<ApiResponse<User>>({
    status: 200,
    message: "Assistant updated",
    data: {
      id: user.id,
      assistant_name: user.assistantName,
      timezone: user.timezone,
      created_at: user.createdAt.toISOString(),
    },
    error: null,
  });
});
