import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
import { memories } from "./memories";
import { users } from "./users";
export const reminders = pgTable("reminders", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    memoryId: uuid("memory_id").references(() => memories.id, {
        onDelete: "set null",
    }),
    source: text("source").notNull().default("voice"),
    text: text("text").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    check("reminders_source_check", sql `${table.source} IN ('voice', 'commitment', 'summary')`),
    check("reminders_status_check", sql `${table.status} IN ('pending', 'done', 'dismissed')`),
    index("reminders_due_idx")
        .on(table.dueAt)
        .where(sql `${table.status} = 'pending'`),
    index("reminders_user_idx").on(table.userId, table.dueAt),
]);
