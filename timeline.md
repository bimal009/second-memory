# Second Memory (Ev): Build Timeline

**Deadline:** Wed Nov 4, 9:00 PM ET = Thu Nov 5, ~7:45 AM Nepal. **Target submit: Nov 4, 6:00 PM Nepal.**
**Track:** Indie Developer. **Theme:** Build for Your World.
**Stack:** Expo (dev build, Android) + FastAPI + Postgres/pgvector. Fresh public monorepo (`/app`, `/server`).

## Pitch (what judges must remember)
Voice-triggered, intent-routed capture on a rolling buffer. Say "Hey Ev, remember this" mid-recording; Ev saves the last N seconds, location, and a note. Later: "Where's my passport?" returns the cited frame, SAM-highlighted object, and map pin.

**Not a basic RAG app.** Lead with: rolling buffer, intent router, SAM grounding, spatial answer, proactive reminders. Retrieval is supporting.

## Rules checklist
- [ ] Fresh repo, no Zovly code. Commit daily.
- [ ] README section: "Built during the hackathon".
- [ ] `.env` gitignored before first commit. Public repo.
- [ ] Demo video under 3:00, own audio only, no real personal data.
- [ ] Avoid banned areas: health advice, education chatbot, generic RAG, plain image analyzer.
- [ ] Verify model names at dev.meta.ai (speech-to-text, SAM 3.1, embeddings).

## Scope

**Must ship (P0)**
1. Rolling buffer: ~10s segments, last ~2 min kept locally, nothing uploaded until triggered.
2. "Ev" hold-to-talk button, active during capture.
3. Intent router: one call, strict Pydantic schema (`quick_memory`, `ask`, `reminder`, `clarify`) with `clip.pre_seconds/post_seconds`, `location`, `note`.
4. `/capture`: upload clip, ffmpeg to audio + key frames, transcribe, describe, store memory (text, embedding, GPS, thumbnail). Delete raw video.
5. Ask Ev: hybrid retrieval, answer cites memory + thumbnail + map pin. Says "no memory of that" when unsure.
6. SAM 3.1 object highlight on the cited frame.
7. Privacy: recording indicator, pause, delete one, delete all.

**Should ship (P1)**
8. Reminders extracted from speech ("return book Friday") with push notification.
9. Daily recap notification.
10. Eval set: 25 questions over seeded memories, retrieval hit rate + "no answer" accuracy in README.
11. Spoken replies from Ev.

**Stretch (P2, only if P0 + P1 done)**
12. Face blurring.
13. System shortcut (Android Quick Settings tile / iOS App Intent).
14. Glasses toolkit: describe as future work only.

**Cut**
Lecture/session mode, always-on wake word, background recording, accounts/auth, video replay, medical examples.

## Schedule (Nepal time)

### Day 0: Wed Oct 28 (tonight)
- [ ] Create public repo, `.gitignore`, `.env.example`, README skeleton.
- [ ] Create API key; test Chat, Audio, Segment calls. Log model names, limits, pricing.
- [ ] Decide fallbacks: speech-to-text, embeddings.
- [ ] Scaffold FastAPI (`/health`) and Expo app; start first EAS Android build.
- **Exit:** one model call from the server works; app builds.

### Day 1: Thu Oct 29. Vertical slice
- [ ] Deploy FastAPI (Render/Railway/Fly). Phone hits deployed `/health`.
- [ ] Camera + mic capture screen, recording indicator.
- [ ] Segment recorder + ring buffer (local, auto-delete).
- [ ] `/capture` stub: upload clip, ffmpeg split, store.
- **Exit:** record, trigger, clip lands on server as frames + audio.

### Day 2: Fri Oct 30. Understanding pipeline
- [ ] Transcription of clip audio.
- [ ] Frame description via Muse Spark; skip silent audio and duplicate frames.
- [ ] Memory schema: text, tags, GPS, thumbnail, embedding, timestamps.
- [ ] Hold-to-talk "Ev" button; transcribe command; trim command from saved memory.
- **Exit:** "remember this" creates a real stored memory.

### Day 3: Sat Oct 31. Intent router + search
- [ ] Intent router with Pydantic schema, validation, one retry, regex fast path for obvious phrases and durations.
- [ ] App enforces plan: settings override, clamp durations.
- [ ] Hybrid retrieval (vector + full-text), grounded answer with citations.
- [ ] "No memory of that" behavior.
- **Exit:** ask by voice, get cited answer.

### Day 4: Sun Nov 1. The differentiator
- [ ] SAM 3.1 segmentation on cited frame; render highlight in answer card.
- [ ] Map pin from GPS in answer card.
- [ ] Memory Detail screen, Timeline list.
- [ ] Seed script: 25-30 realistic demo memories.
- **Exit:** "Where's my passport?" shows frame, highlight, pin. This is the demo moment.

### Day 5: Mon Nov 2. Proactive + trust
- [ ] Reminder extraction, scheduling, Expo push.
- [ ] Daily recap job + notification.
- [ ] Pause, delete one, delete all, privacy screen.
- [ ] Eval script + results table.
- **Exit:** all P0 + P1 features work on a real phone. **Feature freeze at end of day.**

### Day 6: Tue Nov 3. Harden + package
- [ ] Bug bash on device: permissions, bad network, silence, long clips, battery.
- [ ] Spoken replies (P1) if stable; else cut.
- [ ] Production build installable on your phone; APK for judges if possible.
- [ ] README: architecture diagram, setup, limitations, "Built during the hackathon", eval numbers.
- [ ] Write demo script; rehearse twice.
- **Exit:** clean install works end to end on deployed backend.

### Day 7: Wed Nov 4. Ship
- [ ] Morning: record demo video (see script), edit, upload.
- [ ] Final check: repo public, no secrets in history, README accurate, video link opens logged out.
- [ ] Submit by **6:00 PM Nepal**. Add all team members. Pick Indie track.
- [ ] Remaining time is buffer only. No new code.

## Demo script (target 2:30)
| Time | Beat |
|---|---|
| 0:00 | Problem in one sentence: we forget small important things. |
| 0:15 | Capture running, indicator on. "Hey Ev, remember this: passport in the blue drawer." Show plan chips: clip, location, note. |
| 0:45 | "Ev, remind me to return the library book Friday." Reminder created. |
| 1:05 | Architecture in 15s: buffer, intent router, Meta models, SAM, memory store. |
| 1:20 | "Where's my passport?" Cited frame, SAM highlight, map pin. |
| 1:50 | "What did I do today?" plus daily recap notification. |
| 2:05 | Privacy: local buffer, pause, delete all. |
| 2:20 | Eval numbers. Close: same pipeline works with glasses. |

## Cut rules
- Behind by >half a day at any checkpoint: drop the lowest-priority open item.
- Anything not working by Day 5 end is cut, not rescued.
- If SAM access fails: fall back to Muse Spark bounding-box description and draw box; note it honestly.
- If speech-to-text unavailable: open-weights model via Baseten/Modal/Fireworks credits, or Whisper.

## Risks
| Risk | Mitigation |
|---|---|
| Free credits drain | Short test clips, skip silence/duplicates, cap frames per clip, set spend limit. |
| Segment gaps in `expo-camera` | Audio-first buffer + frame every 2s; try `react-native-vision-camera` only if blocked. |
| Phone can't reach backend | Deploy Day 1, test on device early. |
| Native build errors | EAS build Day 0, rebuild after each native module. |
| Banned-category flag | Pitch around capture + grounding, neutral examples. |
| Live demo fails | Pre-recorded video, seeded data, rehearsed script. |