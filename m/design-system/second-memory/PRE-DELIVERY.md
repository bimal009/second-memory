# Pre-delivery review

Based on UI/UX Pro Max `references/pro-rules.md`; reviewed quick-reference sections 1–3.

## Verified in code / automated checks
- Existing MASTER retained; camera-specific native override persisted; detected react-native stack queried.
- Inter only, loaded with expo-font; consistent Lucide icons, no emoji structural icons or remote images.
- Requested semantic lime tokens, radius 10, dark camera, opaque text scrims; deep lime for light-surface icon/text accents.
- 48pt interactive controls, descriptive icon labels/roles, selected/disabled states, visible press feedback.
- Native pager plus labeled buttons; Memories handle plus Close; carousel buttons; tap alternatives to mode swipe.
- Insets on camera top bar, pages and bottom navigation. Scrollable content and adaptive capped text width. Dynamic Type enabled outside camera.
- Transform/opacity animation with reduced-motion checks; placeholders and mock API loading/empty/error/offline states.
- Camera policy tested against every interruption; shutter thresholds tested; session boundaries/background clock jump tested.
- API tests: real citations, two chronological passport sightings, deleted citation fallback, session-note isolation/reminders, offline/empty and delete-all behavior.
- Launch hook/screens/identity client/key storage unchanged; native recording provider disconnected, stub recorder only.
- TypeScript and ESLint checks; web and Android JavaScript exports succeeded. Seven policy/API regression tests pass.

## Device checks still required

The browser host was unavailable, and native Brave inspection was not approved. The temporary fixture compiled but was not visually inspected. No visual QA or gesture/device pass is claimed.

- [ ] 375px, large phone, tablet; portrait and landscape.
- [ ] Largest text scaling, keyboard avoidance, focus visibility/order and VoiceOver/TalkBack.
- [ ] Contrast measurement against live camera frames and both themes (code uses requested palette/scrims).
- [ ] Native horizontal pager/vertical gesture arbitration and finger-following sheet drag.
- [ ] Actual denied-permission device behavior, camera flip/torch and background/resume.
- [ ] Haptic feel, reduced-motion behavior, 45m/60m runtime limits and mocked queue recovery.

## Manual test list

- [ ] Ready-only launch guard; no pager entry for loading/retry/onboarding/permissions.
- [ ] Camera swipe right to Ask / Ask button; swipe left to Today / Today button; Camera button returns.
- [ ] Camera swipe up / Memories button; sheet drag down / Close; horizontal drag must not open sheet.
- [ ] Avatar opens Settings; Close/Back dismiss; detail and receipt stack above overlays, Back returns correctly.
- [ ] Buffer pauses on page change, background, overlay/detail, privacy pause, permission denial and session; resumes only when all gates are satisfied.
- [ ] Tap saves once; 180–349ms unfinished hold does nothing; >=350ms hold shows transcript, release sends once; interruption cancels. Check haptics, Saved, plan chips, thumbnail motion.
- [ ] Mode tap/swipe; Session start, timer, dim, waveform, consent and screen-on notice; tap bookmarks, hold appends note; short-stop confirmation; building-notes opens session.
- [ ] 60s chunk acknowledgment, offline waiting/retry; 45m warning and 60m automatic stop using test clock.
- [ ] Memories filters/search/day groups; moment carousel swipe plus Previous/Next, highlight, tags, transcript and Maps; delete confirmation.
- [ ] Ask by hold/text; example chips; cited frame, coordinates and two passport sightings; skeleton/not-found/offline/error/denied states.
- [ ] Today recap, reminder toggles, session summary, action-to-reminder, selected bookmark, empty state.
- [ ] Name and settings persist; all appearance/buffer/voice options; local copy defaults off; face blur disabled; indicator locked; receipt metrics; exact DELETE confirmation preserves device key.

Run from `C:\m\m`: `corepack pnpm install`, `npx expo start --clear`, `npx tsc --noEmit`, `npx expo lint`, `node --test tests/ui-policy.test.cjs tests/mock-api.test.cjs`.

Native rebuild required for react-native-pager-view 9.0.7 and app config automatic appearance/default orientation. Existing launch/native permission configuration is unchanged.

Stub seams: `src/api/client.ts` + `domainClient.ts` + `mockClient.ts`; camera `useRollingBuffer`, `useAssistantCommand`, `useLocation`; session `useSessionRecorder`; Ask voice example, confirmation chime, reminder scheduling, and optional local playback. AsyncStorage preferences are real local UI preferences. All seed content lives in `src/mocks/data.ts`. Replace the UI API export once to use a backend; preserve the separate launch HTTP client.

Optional local media playback awaits a real local file and player integration; no fake URI is created. README was restored at the user's request.
