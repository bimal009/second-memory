import { jsonb, pgTable, timestamp, unique, uuid, index, } from "drizzle-orm/pg-core";
import { users } from "./users";
export const routerCommands = pgTable("router_commands", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    commandId: uuid("command_id").notNull(),
    plan: jsonb("plan").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    unique("router_commands_user_command_unique").on(table.userId, table.commandId),
    index("router_commands_user_time_idx").on(table.userId, table.createdAt.desc()),
]);
