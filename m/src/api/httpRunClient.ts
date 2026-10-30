import {
  createCapture,
  endCapture,
  getCapture,
  listCaptures,
  deleteCapture,
} from "@/api/capture";
import { uploadChunk } from "@/api/chunk";
import type { RunClient } from "@/api/runClient";
import type { ChunkLength, PendingChunk, Run } from "@/types/run";
import {
  CHUNK_DURATION_S,
  MIN_CHUNK_DURATION_S,
  type Capture,
  type CreateChunkSchema,
} from "@repo/types";
import { insertLocalChunk, markChunkStatus } from "@/lib/chunkDb";

function toRun(capture: Capture, chunkLength: ChunkLength = 30): Run {
  return {
    id: capture.id,
    title: "Capture",
    summary: "",
    createdAt: capture.created_at,
    durationSec: 0,
    frameSeed: 0,
    chunkLength,
    actionItems: [],
    bookmarks: [],
    chunks: [],
    ended: capture.status !== "recording",
  };
}

/** HTTP RunClient backed by POST /captures and /captures/:id/chunks. */
export const httpRunClient: Pick<
  RunClient,
  "listRuns" | "getRun" | "beginRun" | "finishRun" | "uploadChunk" | "deleteRun"
> = {
  async listRuns() {
    const captures = await listCaptures();
    return captures.map((capture) => toRun(capture));
  },

  async getRun(id) {
    try {
      return toRun(await getCapture(id));
    } catch {
      return null;
    }
  },

  async beginRun(chunkLength, _keepLocal) {
    void chunkLength;
    const capture = await createCapture({ source: "phone" });
    return toRun(capture, chunkLength);
  },

  async finishRun(id, seconds) {
    const capture = await endCapture(id);
    const run = toRun(capture);
    run.durationSec = seconds;
    run.ended = true;
    return run;
  },

  async uploadChunk(chunk: PendingChunk) {
    if (!chunk.uri) {
      throw new Error("Chunk file uri is required");
    }

    const body: CreateChunkSchema = {
      idx: chunk.index,
      started_at: new Date(
        chunk.startedAt ?? Date.now() - chunk.durationSec * 1000,
      ),
      duration_s: Math.min(
        CHUNK_DURATION_S,
        Math.max(MIN_CHUNK_DURATION_S, chunk.durationSec),
      ),
      ...(chunk.location
        ? { lat: chunk.location.lat, lng: chunk.location.lng }
        : {}),
    };
    const started_at =
      body.started_at instanceof Date
        ? body.started_at.toISOString()
        : String(body.started_at);

    await insertLocalChunk({
      id: chunk.id,
      capture_id: chunk.runId,
      idx: body.idx,
      started_at,
      duration_s: body.duration_s ?? CHUNK_DURATION_S,
      path: chunk.uri,
      status: "pending",
      size: 0,
    });

    try {
      await markChunkStatus(chunk.id, "uploading");
      await uploadChunk(chunk.runId, {
        ...body,
        uri: chunk.uri,
        mime: "video/mp4",
        name: `${body.idx}.mp4`,
      });
      await markChunkStatus(chunk.id, "uploaded");
    } catch (error) {
      await markChunkStatus(
        chunk.id,
        "failed",
        error instanceof Error ? error.message : "upload failed",
      );
      throw error;
    }
  },

  async deleteRun(id) {
    await deleteCapture(id);
  },
};
