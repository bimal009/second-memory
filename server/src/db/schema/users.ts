import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assistantName: text("assistant_name").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    apiKeyHash: text("api_key_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_assistant_name_len",
      sql`${table.assistantName} ~ '^[A-Za-z]{2,12}$'`,
    ),
  ],
);
