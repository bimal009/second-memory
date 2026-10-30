import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  createUserSchema,
  updateUserSchema,
  type ApiResponse,
  type User,
} from "@repo/types";
import { db } from "../db/index";
import { users } from "../db/schema";
import { generateApiKey, hashApiKey } from "../lib/hash";
import { auth } from "../middleware/auth";

type Env = { Variables: { userId: string } };

export const userRouter = new Hono<Env>();

userRouter.post("/", async (c) => {
  const parsed = createUserSchema.safeParse(await c.req.json());
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

  const apiKey = generateApiKey();

  const [user] = await db
    .insert(users)
    .values({
      assistantName: parsed.data.assistant_name,
      timezone: parsed.data.timezone,
      apiKeyHash: hashApiKey(apiKey),
    })
    .returning({
      id: users.id,
      assistantName: users.assistantName,
      timezone: users.timezone,
      createdAt: users.createdAt,
    });

  return c.json<ApiResponse<User & { api_key: string }>>(
    {
      status: 201,
      message: "User created",
      data: {
        id: user.id,
        assistant_name: user.assistantName,
        timezone: user.timezone,
        created_at: user.createdAt.toISOString(),
        api_key: apiKey,
      },
      error: null,
    },
    201,
  );
});

userRouter.get("/me", auth, async (c) => {
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

userRouter.patch("/me", auth, async (c) => {
  const parsed = updateUserSchema.safeParse(await c.req.json());
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

  const [user] = await db
    .update(users)
    .set({
      assistantName: parsed.data.assistant_name,
      timezone: parsed.data.timezone,
    })
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
    message: "User updated",
    data: {
      id: user.id,
      assistant_name: user.assistantName,
      timezone: user.timezone,
      created_at: user.createdAt.toISOString(),
    },
    error: null,
  });
});

userRouter.delete("/me", auth, async (c) => {
  await db.delete(users).where(eq(users.id, c.get("userId")));

  return c.json<ApiResponse<null>>({
    status: 200,
    message: "User deleted",
    data: null,
    error: null,
  });
});
