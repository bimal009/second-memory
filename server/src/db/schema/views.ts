import { sql } from "drizzle-orm";
import {
  bigint,
  doublePrecision,
  pgView,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { captures } from "./captures";
import { chunks } from "./chunks";
import { memories } from "./memories";
import { objects } from "./objects";
import { sightings } from "./sightings";

export const memoryPlaces = pgView("memory_places", {
  memoryId: uuid("memory_id").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
}).as(
  sql`
    SELECT m.id AS memory_id,
           COALESCE(m.lat, c.lat) AS lat,
           COALESCE(m.lng, c.lng) AS lng
    FROM ${memories} m
    LEFT JOIN ${chunks} c ON c.id = m.chunk_id
  `,
);

export const sightingsLocated = pgView("sightings_located", {
  id: uuid("id").notNull(),
  objectId: uuid("object_id").notNull(),
  userId: uuid("user_id").notNull(),
  label: text("label").notNull(),
  memoryId: uuid("memory_id").notNull(),
  frameId: uuid("frame_id"),
  seenAt: timestamp("seen_at", { withTimezone: true }).notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
}).as(
  sql`
    SELECT s.id, s.object_id, o.user_id, o.label,
           s.memory_id, s.frame_id, s.seen_at,
           p.lat, p.lng
    FROM ${sightings} s
    JOIN ${objects} o ON o.id = s.object_id
    JOIN ${memoryPlaces} p ON p.memory_id = s.memory_id
  `,
);

export const captureStats = pgView("capture_stats", {
  captureId: uuid("capture_id").notNull(),
  fileCount: bigint("file_count", { mode: "number" }).notNull(),
  uploadBytes: bigint("upload_bytes", { mode: "number" }).notNull(),
  framesKept: bigint("frames_kept", { mode: "number" }).notNull(),
  recordedSeconds: doublePrecision("recorded_seconds").notNull(),
  rawDeletedCount: bigint("raw_deleted_count", { mode: "number" }).notNull(),
}).as(
  sql`
    SELECT c.id AS capture_id,
           count(k.id) AS file_count,
           COALESCE(sum(k.upload_bytes), 0) AS upload_bytes,
           COALESCE(sum(k.frames_kept), 0) AS frames_kept,
           COALESCE(sum(k.duration_s), 0) AS recorded_seconds,
           count(k.raw_deleted_at) AS raw_deleted_count
    FROM ${captures} c
    LEFT JOIN ${chunks} k ON k.capture_id = c.id
    GROUP BY c.id
  `,
);
