import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { closeDb } from "./db/index";
import { userRouter } from "./routes/user";
import { ApiResponse } from "@repo/types";
import { deviceRouter } from "./routes/device";
import { captureRouter } from "./routes/capture";
import { auth } from "./middleware/auth";
import { ensureTmpDir } from "./lib/storage";

await ensureTmpDir();

const app = new Hono();

app.use(logger());

app.get("/health", (c) =>
  c.json<ApiResponse<{ uptime: number }>>({
    status: 200,
    message: "OK",
    data: { uptime: process.uptime() },
    error: null,
  }),
);

app.route("/users", userRouter);
app.use("/devices", auth);
app.use("/devices/*", auth);
app.route("/devices", deviceRouter);
app.use("/captures", auth);
app.use("/captures/*", auth);
app.route("/captures", captureRouter);
app.notFound((c) =>
  c.json<ApiResponse<null>>(
    {
      status: 404,
      message: "Not found",
      data: null,
      error: { code: "NOT_FOUND", message: "route not found" },
    },
    404,
  ),
);

app.onError((err, c) => {
  console.error(err);
  return c.json<ApiResponse<null>>(
    {
      status: 500,
      message: "Internal server error",
      data: null,
      error: { code: "INTERNAL", message: "something went wrong" },
    },
    500,
  );
});

const server = serve({ fetch: app.fetch, port: 8000 });

async function shutdown() {
  server.close();
  await closeDb();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
