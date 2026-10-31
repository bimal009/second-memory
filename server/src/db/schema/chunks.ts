import { sql } from "drizzle-orm";
import { bigint, check, doublePrecision, index, integer, pgTable, real, text, timestamp, unique, uuid, } from "drizzle-orm/pg-core";
import { captures } from "./captures";
export const chunks = pgTable("chunks", {
    id: uuid("id").primaryKey().defaultRandom(),
    captureId: uuid("capture_id")
        .notNull()
        .references(() => captures.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    durationS: real("duration_s").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    accuracyM: real("accuracy_m"),
    status: text("status").notNull().default("uploaded"),
    error: text("error"),
    transcript: text("transcript"),
    uploadBytes: bigint("upload_bytes", { mode: "number" })
        .notNull()
        .default(0),
    framesKept: integer("frames_kept").notNull().default(0),
    rawDeletedAt: timestamp("raw_deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [
    unique("chunks_capture_id_idx_unique").on(table.captureId, table.idx),
    check("chunks_idx_check", sql `${table.idx} >= 0`),
    check("chunks_duration_s_check", sql `${table.durationS} > 0`),
    check("chunks_lat_check", sql `${table.lat} BETWEEN -90 AND 90`),
    check("chunks_lng_check", sql `${table.lng} BETWEEN -180 AND 180`),
    check("chunks_status_check", sql `${table.status} IN ('uploaded', 'processing', 'processed', 'skipped', 'failed')`),
    check("chunks_lat_lng_null_check", sql `(${table.lat} IS NULL) = (${table.lng} IS NULL)`),
    index("chunks_pending_idx")
        .on(table.createdAt)
        .where(sql `${table.status} IN ('uploaded', 'processing')`),
]);
