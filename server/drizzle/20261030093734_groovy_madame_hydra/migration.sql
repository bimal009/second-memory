CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assistant_name" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"api_key_hash" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_assistant_name_len" CHECK (char_length("assistant_name") BETWEEN 1 AND 30)
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"push_token" text UNIQUE,
	"platform" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_platform_check" CHECK ("platform" IN ('android', 'ios'))
);
--> statement-breakpoint
CREATE TABLE "captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"source" text DEFAULT 'phone' NOT NULL,
	"status" text DEFAULT 'recording' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	CONSTRAINT "captures_source_check" CHECK ("source" IN ('phone', 'glasses', 'import')),
	CONSTRAINT "captures_status_check" CHECK ("status" IN ('recording', 'processing', 'ready', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"capture_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_s" real NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"accuracy_m" real,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"error" text,
	"upload_bytes" bigint DEFAULT 0 NOT NULL,
	"frames_kept" integer DEFAULT 0 NOT NULL,
	"raw_deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "chunks_capture_id_idx_unique" UNIQUE("capture_id","idx"),
	CONSTRAINT "chunks_idx_check" CHECK ("idx" >= 0),
	CONSTRAINT "chunks_duration_s_check" CHECK ("duration_s" > 0),
	CONSTRAINT "chunks_lat_check" CHECK ("lat" BETWEEN -90 AND 90),
	CONSTRAINT "chunks_lng_check" CHECK ("lng" BETWEEN -180 AND 180),
	CONSTRAINT "chunks_status_check" CHECK ("status" IN ('uploaded', 'processing', 'processed', 'skipped', 'failed')),
	CONSTRAINT "chunks_lat_lng_null_check" CHECK (("lat" IS NULL) = ("lng" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"capture_id" uuid NOT NULL,
	"chunk_id" uuid,
	"kind" text DEFAULT 'moment' NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"window_start" timestamp with time zone,
	"window_end" timestamp with time zone,
	"note" text NOT NULL,
	"description" text,
	"transcript" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"embedding" vector(384),
	"search" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce("memories"."note", '') || ' ' || coalesce("memories"."description", '') || ' ' || coalesce("memories"."transcript", ''))) STORED,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memories_kind_check" CHECK ("kind" IN ('moment', 'session_chunk', 'session_summary')),
	CONSTRAINT "memories_status_check" CHECK ("status" IN ('pending', 'ready')),
	CONSTRAINT "memories_lat_check" CHECK ("lat" BETWEEN -90 AND 90),
	CONSTRAINT "memories_lng_check" CHECK ("lng" BETWEEN -180 AND 180),
	CONSTRAINT "memories_lat_lng_null_check" CHECK (("lat" IS NULL) = ("lng" IS NULL)),
	CONSTRAINT "memories_window_check" CHECK ("window_end" IS NULL OR "window_start" IS NULL OR "window_end" > "window_start")
);
--> statement-breakpoint
CREATE TABLE "objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"tracked" boolean DEFAULT false NOT NULL,
	"last_nudged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "objects_user_id_label_unique" UNIQUE("user_id","label"),
	CONSTRAINT "objects_label_check" CHECK ("label" = lower(btrim("label")))
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"memory_id" uuid NOT NULL,
	"parent_id" uuid,
	"object_id" uuid,
	"kind" text NOT NULL,
	"storage_key" text NOT NULL,
	"offset_ms" integer,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_kind_check" CHECK ("kind" IN ('frame', 'thumbnail', 'mask')),
	CONSTRAINT "media_offset_ms_check" CHECK ("offset_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sightings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"object_id" uuid NOT NULL,
	"memory_id" uuid NOT NULL,
	"frame_id" uuid,
	"seen_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sightings_object_id_memory_id_unique" UNIQUE("object_id","memory_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"memory_id" uuid,
	"source" text DEFAULT 'voice' NOT NULL,
	"text" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_source_check" CHECK ("source" IN ('voice', 'commitment')),
	CONSTRAINT "reminders_status_check" CHECK ("status" IN ('pending', 'done', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "daily_recaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"summary" text NOT NULL,
	"highlights" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_recaps_user_id_day_unique" UNIQUE("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "model_calls" (
	"id" bigserial PRIMARY KEY,
	"user_id" uuid,
	"capture_id" uuid,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer NOT NULL,
	"ok" boolean NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_calls_purpose_check" CHECK ("purpose" IN ('route', 'describe', 'transcribe', 'segment', 'answer', 'summarize', 'recap', 'embed'))
);
--> statement-breakpoint
CREATE INDEX "devices_user_idx" ON "devices" ("user_id");--> statement-breakpoint
CREATE INDEX "captures_user_created_idx" ON "captures" ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "captures_open_idx" ON "captures" ("created_at") WHERE "status" IN ('recording', 'processing');--> statement-breakpoint
CREATE INDEX "chunks_pending_idx" ON "chunks" ("created_at") WHERE "status" IN ('uploaded', 'processing');--> statement-breakpoint
CREATE INDEX "memories_user_time_idx" ON "memories" ("user_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "memories_capture_idx" ON "memories" ("capture_id","occurred_at");--> statement-breakpoint
CREATE INDEX "memories_chunk_idx" ON "memories" ("chunk_id") WHERE "chunk_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "memories_search_idx" ON "memories" USING gin ("search");--> statement-breakpoint
CREATE INDEX "memories_tags_idx" ON "memories" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "memories_embedding_idx" ON "memories" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "objects_label_trgm_idx" ON "objects" USING gin ("label" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "media_memory_idx" ON "media" ("memory_id","kind");--> statement-breakpoint
CREATE INDEX "media_parent_idx" ON "media" ("parent_id") WHERE "parent_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "sightings_object_seen_idx" ON "sightings" ("object_id","seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sightings_memory_idx" ON "sightings" ("memory_id");--> statement-breakpoint
CREATE INDEX "reminders_due_idx" ON "reminders" ("due_at") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "reminders_user_idx" ON "reminders" ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "model_calls_created_idx" ON "model_calls" ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "model_calls_capture_idx" ON "model_calls" ("capture_id") WHERE "capture_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "captures" ADD CONSTRAINT "captures_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_capture_id_captures_id_fkey" FOREIGN KEY ("capture_id") REFERENCES "captures"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_capture_id_captures_id_fkey" FOREIGN KEY ("capture_id") REFERENCES "captures"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_chunk_id_chunks_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "chunks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "objects" ADD CONSTRAINT "objects_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_memory_id_memories_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_parent_id_media_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "media"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_object_id_objects_id_fkey" FOREIGN KEY ("object_id") REFERENCES "objects"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_object_id_objects_id_fkey" FOREIGN KEY ("object_id") REFERENCES "objects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_memory_id_memories_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_frame_id_media_id_fkey" FOREIGN KEY ("frame_id") REFERENCES "media"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_memory_id_memories_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "daily_recaps" ADD CONSTRAINT "daily_recaps_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_capture_id_captures_id_fkey" FOREIGN KEY ("capture_id") REFERENCES "captures"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE VIEW "capture_stats" AS (
    SELECT c.id AS capture_id,
           count(k.id) AS file_count,
           COALESCE(sum(k.upload_bytes), 0) AS upload_bytes,
           COALESCE(sum(k.frames_kept), 0) AS frames_kept,
           COALESCE(sum(k.duration_s), 0) AS recorded_seconds,
           count(k.raw_deleted_at) AS raw_deleted_count
    FROM "captures" c
    LEFT JOIN "chunks" k ON k.capture_id = c.id
    GROUP BY c.id
  );--> statement-breakpoint
CREATE VIEW "memory_places" AS (
    SELECT m.id AS memory_id,
           COALESCE(m.lat, c.lat) AS lat,
           COALESCE(m.lng, c.lng) AS lng
    FROM "memories" m
    LEFT JOIN "chunks" c ON c.id = m.chunk_id
  );--> statement-breakpoint
CREATE VIEW "sightings_located" AS (
    SELECT s.id, s.object_id, o.user_id, o.label,
           s.memory_id, s.frame_id, s.seen_at,
           p.lat, p.lng
    FROM "sightings" s
    JOIN "objects" o ON o.id = s.object_id
    JOIN "memory_places" p ON p.memory_id = s.memory_id
  );