import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
import { users } from "./users";
export const captures = pgTable("captures", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("phone"),
    status: text("status").notNull().default("recording"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [
    check("captures_source_check", sql `${table.source} IN ('phone', 'glasses', 'import')`),
    check("captures_status_check", sql `${table.status} IN ('recording', 'paused', 'ending', 'processing', 'ready', 'failed', 'deleting')`),
    index("captures_user_created_idx").on(table.userId, table.createdAt.desc()),
    index("captures_open_idx")
        .on(table.createdAt)
        .where(sql `${table.status} IN ('recording', 'processing')`),
]);
