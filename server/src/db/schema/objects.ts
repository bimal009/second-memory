import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const objects = pgTable(
  "objects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    tracked: boolean("tracked").notNull().default(false),
    lastNudgedAt: timestamp("last_nudged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("objects_user_id_label_unique").on(table.userId, table.label),
    check(
      "objects_label_check",
      sql`${table.label} = lower(btrim(${table.label}))`,
    ),
    index("objects_label_trgm_idx").using(
      "gin",
      table.label.op("gin_trgm_ops"),
    ),
  ],
);
