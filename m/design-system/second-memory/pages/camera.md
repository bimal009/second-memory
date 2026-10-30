# Camera page override ? continuous capture call

Overrides the existing MASTER where it conflicts with this native app. MASTER remains untouched.

- User's exact lime palette in src/theme/tokens.ts; camera always dark, text on strong scrims.
- Inter/Inter: one OFL font family, loaded by expo-font. Lucide outline icons only, 24pt; decorative icons hidden from accessibility.
- Call header: assistant name from settings, Watching / Listening / Thinking. No marketing headline or buffer/session mode switch.
- Top avatar / recording pill / flip; status strip; 48pt tools with 8pt gaps; shutter + message + stop; labeled pager navigation.
- Capture is idle until Start. Tap active shutter bookmarks. Hold starts simulated PTT. A short unfinished hold is not a tap.
- Default chunks: 30s. Capture is owned by CaptureProvider and never gated by page or sheet focus. CameraView is mounted at pager root.
- App background ? background_paused. Return requires Resume. Indicator and pause reason persist above pages and in native sheets.
- Answer overlay follows a downward drag and has Close/Open in Ask alternatives. Capture stays active behind it.
- No rolling buffer, clip replay, copied logos, downloaded images, or sound assets. Optional local-copy player only with a real API-provided URI.
- 16pt camera gutters; 24pt content gutters; 4/8pt spacing rhythm; radius 10 except circular shutter/pills.
- 150?300ms transform/opacity transitions. Reduced motion disables animation. Sheet vertical pan fails on horizontal movement to protect pager swipes.
- API loading/error/offline states, denied-camera fallback, and uncapped Dynamic Type outside camera.

Design evidence: Flat Design and Inter/Inter matched. Product-demo landing patterns and blue palette were rejected for this native surface. Touch spacing, loading feedback, dragging alternatives and reduced-motion searches matched. No useful safe-area or Lucide-specific database match: applied native pro-rules guidance and user's Lucide requirement.
