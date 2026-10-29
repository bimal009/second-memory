CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_name text NOT NULL
                   CHECK (char_length(assistant_name) BETWEEN 1 AND 30),
    timezone       text NOT NULL DEFAULT 'UTC',
    api_key_hash   text NOT NULL UNIQUE,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE devices (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_token   text NOT NULL UNIQUE,
    platform     text NOT NULL CHECK (platform IN ('android', 'ios')),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX devices_user_idx ON devices (user_id);

CREATE TABLE captures (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind            text NOT NULL DEFAULT 'moment'
                    CHECK (kind IN ('moment', 'session')),
    source          text NOT NULL DEFAULT 'phone'
                    CHECK (source IN ('phone', 'glasses', 'import')),
    status          text NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('recording', 'processing', 'ready', 'failed')),
    error           text,
    command_text    text,
    plan            jsonb NOT NULL,
    clip_start      timestamptz,
    clip_end        timestamptz,
    lat             double precision CHECK (lat BETWEEN -90 AND 90),
    lng             double precision CHECK (lng BETWEEN -180 AND 180),
    accuracy_m      real,
    file_count      integer NOT NULL DEFAULT 0,
    upload_bytes    bigint NOT NULL DEFAULT 0,
    audio_seconds   real,
    frames_analyzed integer NOT NULL DEFAULT 0,
    raw_deleted_at  timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    ended_at        timestamptz,
    processed_at    timestamptz
);
CREATE INDEX captures_user_created_idx ON captures (user_id, created_at DESC);
CREATE INDEX captures_processing_idx ON captures (created_at)
    WHERE status IN ('recording', 'processing');

CREATE TABLE memories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    capture_id  uuid REFERENCES captures(id) ON DELETE CASCADE,
    kind        text NOT NULL DEFAULT 'moment'
                CHECK (kind IN ('moment', 'session_chunk', 'session_summary')),
    offset_s    integer CHECK (offset_s >= 0),   -- seconds from session start (for cited timestamps)
    note        text NOT NULL,
    description text,
    transcript  text,
    tags        text[] NOT NULL DEFAULT '{}',
    lat         double precision CHECK (lat BETWEEN -90 AND 90),
    lng         double precision CHECK (lng BETWEEN -180 AND 180),
    embedding   vector(384),
    search      tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(note, '') || ' ' || coalesce(description, '') || ' ' || coalesce(transcript, ''))
    ) STORED,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX memories_user_time_idx ON memories (user_id, occurred_at DESC);
CREATE INDEX memories_capture_idx   ON memories (capture_id, offset_s) WHERE capture_id IS NOT NULL;
CREATE INDEX memories_search_idx    ON memories USING gin (search);
CREATE INDEX memories_tags_idx      ON memories USING gin (tags);
CREATE INDEX memories_embedding_idx ON memories USING hnsw (embedding vector_cosine_ops);

-- frames, thumbnails, and SAM masks (a mask points at its frame via parent_id)
CREATE TABLE media (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_id   uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    parent_id   uuid REFERENCES media(id) ON DELETE CASCADE,
    kind        text NOT NULL CHECK (kind IN ('frame', 'thumbnail', 'mask')),
    storage_key text NOT NULL,
    label       text,
    offset_ms   integer CHECK (offset_ms >= 0),
    width       integer,
    height      integer,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_memory_idx ON media (memory_id, kind);
CREATE INDEX media_user_idx   ON media (user_id);

CREATE TABLE sightings (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_id  uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    frame_id   uuid REFERENCES media(id) ON DELETE SET NULL,
    label      text NOT NULL CHECK (label = lower(label)),   -- store normalized lowercase
    lat        double precision CHECK (lat BETWEEN -90 AND 90),
    lng        double precision CHECK (lng BETWEEN -180 AND 180),
    seen_at    timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sightings_user_label_idx ON sightings (user_id, label, seen_at DESC);
CREATE INDEX sightings_label_trgm_idx ON sightings USING gin (label gin_trgm_ops);
CREATE INDEX sightings_memory_idx     ON sightings (memory_id);

CREATE TABLE reminders (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_id   uuid REFERENCES memories(id) ON DELETE SET NULL,
    text        text NOT NULL,
    due_at      timestamptz NOT NULL,
    status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'done', 'dismissed')),
    notified_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reminders_due_idx  ON reminders (due_at) WHERE status = 'pending';
CREATE INDEX reminders_user_idx ON reminders (user_id, due_at);

CREATE TABLE daily_recaps (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day          date NOT NULL,
    summary      text NOT NULL,
    highlights   jsonb NOT NULL DEFAULT '[]',
    memory_count integer NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, day)
);

CREATE TABLE model_calls (
    id            bigserial PRIMARY KEY,
    user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
    capture_id    uuid REFERENCES captures(id) ON DELETE SET NULL,
    purpose       text NOT NULL
                  CHECK (purpose IN ('route', 'describe', 'transcribe', 'segment',
                                     'answer', 'summarize', 'recap')),
    model         text NOT NULL,
    input_tokens  integer,
    output_tokens integer,
    latency_ms    integer NOT NULL,
    ok            boolean NOT NULL,
    error         text,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX model_calls_created_idx ON model_calls (created_at DESC);
CREATE INDEX model_calls_capture_idx ON model_calls (capture_id) WHERE capture_id IS NOT NULL;