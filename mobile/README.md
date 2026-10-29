# Second Memory (mobile)

Voice-triggered memory capture — hold to talk, keep what matters, find it later.

A **UI-only** Expo (SDK 58, React Native 0.88, TypeScript strict) implementation with Expo Router. All data comes from an in-app mock client; every real backend/native seam is marked with a `TODO` stub (see below).

## Run

```bash
pnpm install
npx tsc --noEmit   # typecheck
npx eslint src     # lint
npx expo start     # dev server
```

Open in Expo Go (scan the QR) or a simulator. If a native module dialog appears, prefer a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## Structure

- `src/app/` — routes only (root `_layout.tsx` + fonts/providers + global RecordingBanner, `(tabs)/` capture/ask/memories/today/settings, `onboarding.tsx`, `memory/[id].tsx`)
- `src/features/` — screens and feature hooks (`capture`, `ask`, `memories`, `today`, `settings`, `onboarding`)
- `src/components/ui/` — primitives (Text/Button/IconButton/Card/Chip/Badge/SwitchRow/Skeleton/EmptyState/ScreenContainer/BottomSheet)
- `src/components/domain/` — feature components (frames + highlight, RecordingBanner, BufferMeter, HoldToTalkButton, CapturePlanChips, MemoryCard, CitedAnswerCard, LocationCard, ReminderRow, RecapCard)
- `src/theme/` — design tokens (`tokens.ts` is the **only** place colors are defined), spacing, Inter typography
- `src/constants/strings.ts` — every user-facing string (`{name}` interpolates the assistant name)
- `src/api/` — `SecondMemoryClient` interface + `mockClient` (**the backend swap point**: replace `mockClient` in `src/api/index.ts` with an HTTP client; nothing else changes)
- `design-system/second-memory/MASTER.md` — persisted design system notes

## Stubbed seams (UI-only)

All of these work against mocks and carry `TODO(backend)` / `TODO(native)` comments:

| Seam | Where | What's mocked |
| --- | --- | --- |
| Capture / recognition | `src/features/capture/CaptureSessionProvider.tsx`, `src/hooks/useAssistantCommand.ts` | Session lifecycle, "keep the toolbox" transcript, parsed capture plan |
| Rolling buffer | `src/hooks/useRollingBuffer.ts`, `BufferMeter` | Seconds counter only — no real on-device buffer |
| Location | `src/hooks/useLocation.ts` | Tries `expo-location`, falls back to mock coordinates (Media/home) |
| API | `src/api/mockClient.ts` | ~14 seeded memories, keyword-ask scoring, 450ms latency, in-memory settings/mutations |
| Ask (voice) | `src/features/ask/useAsk.ts` | Hold-to-ask sends a canned transcribed question |
| Settings persistence | `src/features/settings/context.tsx` | In-memory only; resets on reload |
| Camera preview | `src/features/capture/CameraStage.tsx` | Real `CameraView` preview; placeholder on simulator/denied |
| Reminders / notifications | `expo-notifications` configured in `app.json` only | No scheduler is wired |

## Notes

- Haptics only on confirmations/important actions (`useHaptics`).
- All animations are `react-native-reanimated`, transform/opacity-only, 150–300ms, and respect reduced motion.
- Touch targets are ≥ 48px; icon-only controls carry `accessibilityLabel`s.
- RN 0.88 removed `StyleSheet.absoluteFillObject` — use the local `ABS_FILL` constants pattern.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
