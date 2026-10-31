import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  type ApiResponse,
  type TrackedObject,
  trackedObjectsResponseSchema,
} from "@repo/types";
import { db } from "../db/index";
import { objects } from "../db/schema";

type Env = { Variables: { userId: string } };

export const trackedRouter = new Hono<Env>();

trackedRouter.get("/", async (c) => {
  const rows = await db.query.objects.findMany({
    where: { userId: c.get("userId"), tracked: true },
    orderBy: { label: "asc" },
  });

  return c.json<ApiResponse<TrackedObject[]>>({
    status: 200,
    message: "OK",
    data: rows.map((row) => ({
      id: row.id,
      label: row.label,
      tracked: row.tracked,
      last_nudged_at: row.lastNudgedAt?.toISOString() ?? null,
      created_at: row.createdAt.toISOString(),
    })),
    error: null,
  });
});

trackedRouter.delete("/:id", async (c) => {
  const [deleted] = await db
    .update(objects)
    .set({ tracked: false })
    .where(eq(objects.id, c.req.param("id")))
    .returning({ id: objects.id });

  if (!deleted) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: { code: "OBJECT_NOT_FOUND", message: "object not found" },
      },
      404,
    );
  }

  return c.json<ApiResponse<null>>({
    status: 200,
    message: "Object untracked",
    data: null,
    error: null,
  });
});
