import { sql } from "drizzle-orm";
import { type AnyPgColumn, check, index, integer, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
import { memories } from "./memories";
import { objects } from "./objects";
export const media = pgTable("media", {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id")
        .notNull()
        .references(() => memories.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => media.id, {
        onDelete: "cascade",
    }),
    objectId: uuid("object_id").references(() => objects.id, {
        onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    offsetMs: integer("offset_ms"),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    check("media_kind_check", sql `${table.kind} IN ('frame', 'thumbnail', 'mask')`),
    check("media_offset_ms_check", sql `${table.offsetMs} >= 0`),
    index("media_memory_idx").on(table.memoryId, table.kind),
    index("media_parent_idx")
        .on(table.parentId)
        .where(sql `${table.parentId} IS NOT NULL`),
]);
