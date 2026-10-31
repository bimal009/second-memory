CREATE TABLE "router_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"plan" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "router_commands_user_command_unique" UNIQUE("user_id","command_id")
);
--> statement-breakpoint
CREATE INDEX "router_commands_user_time_idx" ON "router_commands" ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "router_commands" ADD CONSTRAINT "router_commands_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_assistant_name_len", ADD CONSTRAINT "users_assistant_name_len" CHECK ("assistant_name" ~ '^[A-Za-z]{2,12}$');--> statement-breakpoint
ALTER TABLE "captures" DROP CONSTRAINT "captures_status_check", ADD CONSTRAINT "captures_status_check" CHECK ("status" IN ('recording', 'ending', 'processing', 'ready', 'failed', 'deleting'));--> statement-breakpoint
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_source_check", ADD CONSTRAINT "reminders_source_check" CHECK ("source" IN ('voice', 'commitment', 'summary'));