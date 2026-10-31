import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, integer, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
import { captures } from "./captures";
import { users } from "./users";
export const modelCalls = pgTable("model_calls", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    captureId: uuid("capture_id").references(() => captures.id, {
        onDelete: "set null",
    }),
    purpose: text("purpose").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms").notNull(),
    ok: boolean("ok").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    check("model_calls_purpose_check", sql `${table.purpose} IN ('route', 'describe', 'transcribe', 'segment', 'answer', 'summarize', 'recap', 'embed')`),
    index("model_calls_created_idx").on(table.createdAt.desc()),
    index("model_calls_capture_idx")
        .on(table.captureId)
        .where(sql `${table.captureId} IS NOT NULL`),
]);
