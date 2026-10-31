import { Hono } from "hono";
import { type ApiResponse, type Recap } from "@repo/types";
import { db } from "../db/index";

type Env = { Variables: { userId: string } };

export const recapRouter = new Hono<Env>();

/** GET /recap           -> latest recap
 *  GET /recap?day=YYYY-MM-DD -> that day's recap */
recapRouter.get("/", async (c) => {
  const day = c.req.query("day");

  const row = day
    ? await db.query.dailyRecaps.findFirst({
        where: { userId: c.get("userId"), day },
      })
    : await db.query.dailyRecaps.findFirst({
        where: { userId: c.get("userId") },
        orderBy: { day: "desc" },
      });

  if (!row) {
    return c.json<ApiResponse<null>>(
      {
        status: 404,
        message: "Not found",
        data: null,
        error: {
          code: "RECAP_NOT_FOUND",
          message: "no recap for this day yet",
        },
      },
      404,
    );
  }

  return c.json<ApiResponse<Recap>>({
    status: 200,
    message: "OK",
    data: {
      day: row.day,
      summary: row.summary,
      highlights: (row.highlights as string[]) ?? [],
      created_at: row.createdAt.toISOString(),
    },
    error: null,
  });
});
