# Second Memory

Entry for the Meta Global AI Developer Hackathon (Build for Your World).

A phone in your pocket stands in for Meta AI glasses. It records continuously
in 30-second chunks. The server turns every chunk into frames, a transcript
and a one-sentence note in the past tense. Hours later you can ask plain
questions like "where did I park?" and get a real answer: the time, the
location, the exact frame from that moment, and the answer spoken out loud.
Faces are blurred on the stored frames. You can delete any capture, or
everything, in one tap.

## What it calls on Meta's side

Everything runs through the Meta Model API (muse-spark-1.3), kept to one call
per job:

| Job | Call |
|---|---|
| Chunk understanding of frames + transcript | vision |
| Capture summary + action items | chat |
| Voice command intent plan | chat |
| Ask answer composed from retrieved notes | chat |
| Subject highlight box on the cited frame | vision |
| Chunk speech to text | muse-voice-transcribe |

Embeddings are the one piece the API does not cover, so a small open model
(all-MiniLM-L6-v2, 384 dims) runs locally. No video is kept server-side.

## Repo layout

| Folder | What |
|---|---|
| `server/` | Hono API + BullMQ workers (ffmpeg frames, phash, ASR, describe, summarize, ask, sweeps) |
| `m/` | Expo mobile app: 30s chunk recorder, offline upload queue, router button, ask screen with speech |
| `types/` | Shared zod schemas + every tunable constant (`@repo/types`) |

## Setup

```bash
pnpm install
pnpm -r typecheck
pnpm test
```

Server needs Postgres with the `vector` and `pg_trgm` extensions, Redis, and
ffmpeg/ffprobe on PATH. Fill `server/.env` (`DATABASE_URL`, `REDIS_URL`,
`MODEL_API_KEY`), then:

```bash
pnpm --filter server db:migrate
pnpm --filter server db:generate   # after editing server/src/db/schema
pnpm --filter server dev           # boot checks ffmpeg/redis/db, then serves :8000
```

Seed a demo user (prints an API key to put on the phone):

```bash
pnpm --filter server exec tsx scripts/seed.ts
```

Offline retrieval eval, no model calls:

```bash
pnpm --filter server exec tsx scripts/ask-eval.ts
```

## Trying it

1. Start the server and the Expo app, connect a phone.
2. Hold record. Chunks upload every 30 seconds even if the app closes.
3. Tap the ASK button and type "where did I park?" or "where are my keys?".
   The answer is spoken back and cites the frame it came from.
4. Or press and speak: "bookmark this", "remind me to file taxes by Friday at 5",
   "track my keys". Bare words like "pause", "resume" and "stop" act instantly
   with no model call.
5. End the capture: summary, action items and the daily recap land as memories.

## How a capture becomes memories

1. The phone uploads 30s chunks (`POST /captures/:id/chunks`, idempotent, lat/lng attached).
2. A worker samples frames every 4 seconds (up to 8), dedupes lookalikes
   against the previous chunk with perceptual hashes, extracts a 16kHz mono
   WAV, and waits for the previous chunk so notes stay in order.
3. One vision call returns the note, tags, visible objects, spoken commitments
   with resolved times, and face boxes. Faces are blurred with sharp before anything is stored.
4. One transaction writes the memory, frame and thumbnail rows, object
   sightings, and any reminders. The raw video and WAV are deleted in the
   same job; the privacy endpoint shows exactly what the server is holding.
5. On capture end, one chat call produces the run summary and action items,
   pending bookmarks are finalized, and the daily recap is upserted.

## How ask finds the answer

Questions go through two paths, memory only after the first:

- **Object path first.** If the question names a tracked object, the latest
  sighting answers it directly. Three or more sightings in the area flips in
  a "you usually leave it around there" note.
- **Hybrid retrieval fallback.** Top-k by pgvector cosine over the question
  embedding, unioned with top-k full-text hits over memory notes, then
  reciprocal rank fusion (`ASK_RRF_K=60`). A memory that both modes agree on
  rises first. One grounded chat call composes the answer from those notes
  and nothing else. If nothing clears the bar, the answer is honestly
  "I have no memory of that."
- When the cited frame exists, one extra vision call locates the subject on
  it and returns an approximate highlight box.

Pending memories are never retrievable, by either path.

## Privacy

- Raw video and audio exist only for the seconds it takes to process a chunk,
  then they are gone. `GET /privacy` shows what the server currently holds.
- What persists: key frames (faces blurred), thumbnails, notes, and text. No video.
- Delete one capture or the whole account server-side and the phone mirrors it
  (`DELETE /captures/:id`, `DELETE /captures`).
- Location stays on the server as a single lat/lng per memory, used only to answer.

## Voice commands

`POST /router` takes audio or text and is idempotent by `command_id`.
Bare controls apply instantly. Everything else, fillers included, goes to the
intent model, which returns up to four ordered actions: bookmark (window
anchors at press time minus 20s through press plus spoken duration), reminders
(only times actually stated out loud), track/untrack, ask, or a clarifying
question. Ask answers ride back inside the same HTTP response.

## Notes

- Spec folders `api/`/`mobile/` map to `server/`/`m/` here.
- Tests cover 35 cases across six files against a real database: plan schemas,
  the full command surface, idempotency, window rules, the finalizer, ask
  ranking and nudges.
