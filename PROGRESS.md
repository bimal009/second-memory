# PROGRESS — Second Memory build session

**Status:** Phase 1 (Foundation) complete — constants, `ending`/`deleting` statuses, `router_commands` table, `/me` `/tracked-objects` `/router` `/ask` `/privacy` `/recap` routes, boot checks, migration applied. Starting Phase 2 (chunk pipeline: `understandChunk`).

## Status

- Monorepo note: spec says `api`/`mobile`/`types`; repo folders are `server`/`m`/`types`. Mounted as-is (see Decisions).
- Baseline pre-existing (verified working before this session): captures/chunks/memories/media/sightings/objects/reminders/model_calls/users/device schemas + pgvector HNSW + pg_trgm indexes; auth (X-API-Key sha256); `/captures` + `/captures/:id/chunks` (idempotent, streamed, lat/lng captured); BullMQ worker in-process with Boot recovery; storage layout `storage/capture/<capture_id>/<idx>/{video.mp4,audio.wav,frames/}`; ffmpeg services (probe/frames/phash/mono wav); Meta Model API verified from TS (chat/vision/transcribe) with basic wrappers in `server/src/lib/meta.ts`; mobile capture screen with 30s chunk recorder + local SQLite queue.

## Features (Final target 1–18)

- [ ] 1. Continuous chunked capture, indicator, pause, bg-pause — api [x] / mobile [ ]
- [ ] 2. Local video on phone + playback from memory/answer — api [x] / mobile [ ]
- [ ] 3. Chunk pipeline (frames, phash, transcribe, describe, embed, store, delete raw) — api [ ] / mobile [x]
- [ ] 4. Push-button + voice router returning action list — api [ ] / mobile [ ]
- [ ] 5. Wake word (assistant name) — api [ ] / mobile [ ]
- [ ] 6. Ask by voice: SQL-first, hybrid fallback, cited answer, thumbnail, honest no-answer — api [ ] / mobile [ ]
- [ ] 7. Lazy SAM highlight — api [ ] / mobile [ ]
- [ ] 8. Last seen + "usually lives here" — api [ ] / mobile [ ]
- [ ] 9. Tracked objects + leave-behind nudge — api [ ] / mobile [ ]
- [ ] 10. Commitments → reminders with source chunk/frame + notifications — api [ ] / mobile [ ]
- [ ] 11. Reminders from speech — api [ ] / mobile [ ]
- [ ] 12. Run summary, action items, chunk timeline in detail — api [ ] / mobile [ ]
- [ ] 13. Daily recap — api [ ] / mobile [ ]
- [ ] 14. Privacy receipt — api [ ] / mobile [ ]
- [ ] 15. Delete one / delete all (server + local) — api [ ] / mobile [ ]
- [ ] 16. Import-video through chunk pipeline — api [ ] / mobile [ ]
- [ ] 17. Spoken replies — api [ ] / mobile [ ]
- [ ] 18. Face blur on stored key frames — api [ ] / mobile [ ]

## Tests (15 required)

- [ ] 1. CapturePlan/CommandPlan zod (six intents, max 4, defaults, +05:45 offsets)
- [ ] 2. router.test.ts 20 commands
- [ ] 3. Router idempotency by command_id
- [ ] 4. Window rule [press−20s, end+duration], default 10
- [ ] 5. Ordered claim (N+1 waits for N; proceeds after ORDER_WAIT_S)
- [ ] 6. Chunk pipeline (mocked models): skip rule, dedupe, cap 8 + force-keep, one tx rollback, cleanup in finally, offset_s, short chunk ≥1 frame, sightings lat/lng
- [ ] 7. Bookmark finalizer: pending→ready, race fallback, one action failure isolated
- [ ] 8. Ask: SQL-first, usually-lives-here ≥3, no-match "no memory of that", hybrid fallback, pending excluded
- [ ] 9. Commitments → reminders (chunk/frame link, dedupe)
- [ ] 10. Nudge logic (radius, no later sighting, min age, cooldown)
- [ ] 11. Idle auto-end sweep; stuck-processing sweep
- [ ] 12. Delete one/all: rows + folders gone; worker never recreates for `deleting`
- [ ] 13. Auth 401 + cross-user media 404
- [ ] 14. Upload endpoint guards (idempotent, zero-byte, oversize, bad idx/uuid, non-recording capture)
- [ ] 15. PATCH /me rename validation + router uses new name

## Fallbacks and stubs

- Embeddings: Meta Model API does not expose an embeddings endpoint → local open-source (all-MiniLM-L6-v2, 384 dims) via transformers.js. Decision recorded; revisit if the API adds embeddings.
- Wake word: per spec, attempt 1 (on-device speech recognition streaming) before falling back to chunk-transcript detection.
- SAM: lazy call from the ask path; fallback = model-drawn box labeled approximate.
- Face blur: simplest detector first (vision-returned normalized boxes + sharp blur); off by default if unreliable.

## Needs device verification

- Mic sharing: video recorder + speech recognition at once (decides wake word mode)
- ngrok reachability from phone; upload sizes/latency
- Real-phone capture: chunk timing sanity (gaps), kill/restore keeper, battery/heat
- Push-to-talk UX latency end-to-end
- Wake-word recognition quality for the chosen name (self-test in onboarding)

## Decisions

- Folder names kept as `server`/`m`/`types` (spec's api/mobile/types are aliases); script names unchanged.
- `media.offset_ms` kept (ms) instead of `offset_s` (schema already live and used by player math); equivalent information.
- `sightings` place/time comes from the linked memory's lat/lng and seen_at (already stored) instead of duplicating columns.
- Earlier-session items (worker on BullMQ in-process, storage layout, duration_s probe-truth, optional) counted as baseline api work where their tests exist.
- `/users/me` (GET/PATCH/DELETE) predates this session and is kept; the spec-listed `/me` is a new separate resource (`routes/me.ts`). Mobile uses `/me`.
- `PATCH /me` writes only fields the client actually sent (zod's timezone default would otherwise silently reset timezone on every rename); empty patch → 400 `EMPTY_PATCH`.
- `/router` and `/ask` are registered with full request validation + router idempotency lookup; plan/answer execution returns 501 until Phase 3/4 fills them (no fake data).
- `/tracked-objects` DELETE soft-untracks (`tracked = false`) so sightings history survives; untrack-by-voice is `track` intent with `enabled: false`.
- Root `pnpm typecheck` (all workspaces) and `pnpm test` (`--if-present`) scripts added; `typescript` devDependency added to `types`.
- Worker re-checks capture exists and is not `deleting` before processing and before failure-writes (never recreates files for a deleted capture).
- `reminders.source` gained `'summary'` (capture-end summary action items); DB check + zod updated.
- Capture `/end` sets `ending` (was `processing`); chunk uploads accepted during `recording` or `ending` only, so tail chunks in flight still land.
