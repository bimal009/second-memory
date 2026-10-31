import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { closeDb } from "./db/index";
import { userRouter } from "./routes/user";
import { deviceRouter } from "./routes/device";
import { captureRouter } from "./routes/capture";
import { meRouter } from "./routes/me";
import { trackedRouter } from "./routes/tracked";
import { routerRouter } from "./routes/router";
import { askRouter } from "./routes/ask";
import { memoriesRouter } from "./routes/memory";
import { privacyRouter } from "./routes/privacy";
import { recapRouter } from "./routes/recap";
import { auth } from "./middleware/auth";
import { startChunkWorker, startSummaryWorker, startSweeps, stopChunkWorker, stopSummaryWorker, stopSweeps, } from "./worker";
import { redis } from "./lib/redis";
import { sql } from "drizzle-orm";
import { db } from "./db/index";
import type { ApiResponse } from "@repo/types";
const execFileAsync = promisify(execFile);
const app = new Hono<{
    Variables: {
        userId: string;
    };
}>();
app.use(logger());
app.get("/health", (c) => c.json<ApiResponse<{
    uptime: number;
}>>({
    status: 200,
    message: "OK",
    data: { uptime: process.uptime() },
    error: null,
}));
app.route("/users", userRouter);
app.use("/devices", auth);
app.use("/devices/*", auth);
app.route("/devices", deviceRouter);
app.use("/captures", auth);
app.use("/captures/*", auth);
app.route("/captures", captureRouter);
app.use("/me", auth);
app.use("/me/*", auth);
app.route("/me", meRouter);
app.use("/tracked-objects", auth);
app.use("/tracked-objects/*", auth);
app.route("/tracked-objects", trackedRouter);
app.use("/router", auth);
app.use("/router/*", auth);
app.route("/router", routerRouter);
app.use("/ask", auth);
app.use("/ask/*", auth);
app.route("/ask", askRouter);
app.use("/memories", auth);
app.use("/memories/*", auth);
app.route("/memories", memoriesRouter);
app.use("/privacy", auth);
app.use("/privacy/*", auth);
app.route("/privacy", privacyRouter);
app.use("/recap", auth);
app.use("/recap/*", auth);
app.route("/recap", recapRouter);
app.notFound((c) => c.json<ApiResponse<null>>({
    status: 404,
    message: "Not found",
    data: null,
    error: { code: "NOT_FOUND", message: "route not found" },
}, 404));
app.onError((err, c) => {
    console.error(err);
    return c.json<ApiResponse<null>>({
        status: 500,
        message: "Internal server error",
        data: null,
        error: { code: "INTERNAL", message: "something went wrong" },
    }, 500);
});
async function bootChecks() {
    await execFileAsync("ffmpeg", ["-version"]);
    await execFileAsync("ffprobe", ["-version"]);
    await redis.ping();
    await db.execute(sql `select 1`);
    console.log("[boot] ffmpeg, ffprobe, redis, db: ok");
}
let server: ReturnType<typeof serve> | null = null;
try {
    await bootChecks();
    server = serve({ fetch: app.fetch, port: 8000 });
    await startChunkWorker();
    await startSummaryWorker();
    startSweeps();
}
catch (err) {
    console.error("[boot] failed, exiting:", err);
    process.exit(1);
}
async function shutdown() {
    stopSweeps();
    await stopChunkWorker();
    await stopSummaryWorker();
    server?.close();
    await closeDb();
    redis.disconnect();
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
