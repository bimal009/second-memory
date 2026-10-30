import { Hono } from "hono";
import { and, eq } from "drizzle-orm";

import { db } from "../db/index";
import { devices } from "../db/schema";
import {
  ApiResponse,
  createDeviceSchema,
  Device,
  updateDeviceSchema,
} from "@repo/types";

type Env = { Variables: { userId: string } };

export const deviceRouter = new Hono<Env>();

deviceRouter.post("/", async (c) => {
  const parsed = createDeviceSchema.safeParse(await c.req.json());
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

  const [device] = await db
    .insert(devices)
    .values({
      userId: c.get("userId"),
      pushToken: parsed.data.push_token,
      platform: parsed.data.platform,
    })
    .onConflictDoUpdate({
      target: devices.pushToken,
      set: {
        userId: c.get("userId"),
        platform: parsed.data.platform,
        lastSeenAt: new Date(),
      },
    })
    .returning();

  return c.json<ApiResponse<Device>>(
    {
      status: 201,
      message: "Device registered",
      data: {
        id: device.id,
        push_token: device.pushToken,
        platform: device.platform as "android" | "ios",
        last_seen_at: device.lastSeenAt.toISOString(),
        created_at: device.createdAt.toISOString(),
      },
      error: null,
    },
    201,
  );
});

deviceRouter.get("/", async (c) => {
  const rows = await db.query.devices.findMany({
    where: { userId: c.get("userId") },
    orderBy: { createdAt: "desc" },
  });

  return c.json<ApiResponse<Device[]>>({
    status: 200,
    message: "OK",
    data: rows.map((device) => ({
      id: device.id,
      push_token: device.pushToken,
      platform: device.platform as "android" | "ios",
      last_seen_at: device.lastSeenAt.toISOString(),
      created_at: device.createdAt.toISOString(),
    })),
    error: null,
  });
});

deviceRouter.patch("/:id", async (c) => {
  const parsed = updateDeviceSchema.safeParse(await c.req.json());
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

  const [device] = await db
    .update(devices)
    .set({
      pushToken: parsed.data.push_token,
      platform: parsed.data.platform,
      lastSeenAt: new Date(),
    })
    .where(
      and(
        eq(devices.id, c.req.param("id")),
        eq(devices.userId, c.get("userId")),
      ),
    )
    .returning();

  if (!device) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "DEVICE_NOT_FOUND", message: "device not found" },
      },
      404,
    );
  }

  return c.json<ApiResponse<Device>>({
    status: 200,
    message: "Device updated",
    data: {
      id: device.id,
      push_token: device.pushToken,
      platform: device.platform as "android" | "ios",
      last_seen_at: device.lastSeenAt.toISOString(),
      created_at: device.createdAt.toISOString(),
    },
    error: null,
  });
});

deviceRouter.delete("/:id", async (c) => {
  const [device] = await db
    .delete(devices)
    .where(
      and(
        eq(devices.id, c.req.param("id")),
        eq(devices.userId, c.get("userId")),
      ),
    )
    .returning({ id: devices.id });

  if (!device) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "DEVICE_NOT_FOUND", message: "device not found" },
      },
      404,
    );
  }

  return c.json<ApiResponse<null>>({
    status: 200,
    message: "Device deleted",
    data: null,
    error: null,
  });
});
