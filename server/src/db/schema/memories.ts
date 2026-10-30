import { type SQL, sql } from "drizzle-orm";
import {
  check,
  customType,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { captures } from "./captures";
import { chunks } from "./chunks";
import { users } from "./users";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    captureId: uuid("capture_id")
      .notNull()
      .references(() => captures.id, { onDelete: "cascade" }),
    chunkId: uuid("chunk_id").references(() => chunks.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull().default("moment"),
    status: text("status").notNull().default("ready"),
    windowStart: timestamp("window_start", { withTimezone: true }),
    windowEnd: timestamp("window_end", { withTimezone: true }),
    note: text("note").notNull(),
    description: text("description"),
    transcript: text("transcript"),
    tags: text("tags").array().notNull().default(sql`'{}'`),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    embedding: vector("embedding", { dimensions: 384 }),
    search: tsvector("search").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('english', coalesce(${memories.note}, '') || ' ' || coalesce(${memories.description}, '') || ' ' || coalesce(${memories.transcript}, ''))`,
    ),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "memories_kind_check",
      sql`${table.kind} IN ('moment', 'session_chunk', 'session_summary')`,
    ),
    check(
      "memories_status_check",
      sql`${table.status} IN ('pending', 'ready')`,
    ),
    check("memories_lat_check", sql`${table.lat} BETWEEN -90 AND 90`),
    check("memories_lng_check", sql`${table.lng} BETWEEN -180 AND 180`),
    check(
      "memories_lat_lng_null_check",
      sql`(${table.lat} IS NULL) = (${table.lng} IS NULL)`,
    ),
    check(
      "memories_window_check",
      sql`${table.windowEnd} IS NULL OR ${table.windowStart} IS NULL OR ${table.windowEnd} > ${table.windowStart}`,
    ),
    index("memories_user_time_idx").on(table.userId, table.occurredAt.desc()),
    index("memories_capture_idx").on(table.captureId, table.occurredAt),
    index("memories_chunk_idx")
      .on(table.chunkId)
      .where(sql`${table.chunkId} IS NOT NULL`),
    index("memories_search_idx").using("gin", table.search),
    index("memories_tags_idx").using("gin", table.tags),
    index("memories_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
