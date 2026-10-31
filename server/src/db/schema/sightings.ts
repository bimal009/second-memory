import { index, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { media } from "./media";
import { memories } from "./memories";
import { objects } from "./objects";
export const sightings = pgTable("sightings", {
    id: uuid("id").primaryKey().defaultRandom(),
    objectId: uuid("object_id")
        .notNull()
        .references(() => objects.id, { onDelete: "cascade" }),
    memoryId: uuid("memory_id")
        .notNull()
        .references(() => memories.id, { onDelete: "cascade" }),
    frameId: uuid("frame_id").references(() => media.id, {
        onDelete: "set null",
    }),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    unique("sightings_object_id_memory_id_unique").on(table.objectId, table.memoryId),
    index("sightings_object_seen_idx").on(table.objectId, table.seenAt.desc()),
    index("sightings_memory_idx").on(table.memoryId),
]);
