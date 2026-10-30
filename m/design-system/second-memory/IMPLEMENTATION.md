# Second Memory — native implementation decisions

Stack detected: Expo 58, React Native 0.88, TypeScript strict, Expo Router.
Existing MASTER.md is preserved. The user's lime light/dark tokens supersede its blue palette.

UI/UX Pro Max source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
Ran `--design-system --persist -p "Second Memory" --output-dir C:\m\m --page camera`.
Verified flat/minimal style and Inter/Inter pairing. The marketing-page pattern and blue palette are not applicable to this camera utility.
Supplemental searches: touch target minimum, loading feedback, dragging movements, Inter minimal mobile, icon button accessible label, reduced motion transitions, and `safe areas gestures animation --stack react-native`.
The safe-area UX result was off-topic; use the native stack and pro-rules safe-area guidance instead. Lucide overrides other icon-family recommendations.

## File plan
1. theme/ThemeProvider, tokens; components/ui shared primitives; constants/strings.
2. features/pager/{AppPagerProvider,AppPager,PagerSurface,PagerNav,MemoriesOverlay}.
3. features/camera/{CameraPage,CameraPreview,CameraTools,CameraControls,useCamera}; domain/{Shutter,ModeSwitcher}.
4. features/session/{useSessionRecorder,SessionControls,SessionDetail}; domain/{Waveform,ChunkStatus,SessionCard}.
5. api/domainClient + mockClient; types/session; mocks/data; features/memories/{MemoryLibrary,MomentDetail}; domain/{MemoryGrid,SightingsTimeline}.
6. features/ask/AskPage; features/today/TodayPage; features/settings/{SettingsModal,PrivacyReceipt}; README and manual tests.

Routes remain in src/app to match this repository. Keep bootstrap hook, onboarding, permissions, launch HTTP clients, and secure key storage unchanged. Existing protected `(tabs)/capture` becomes the pager entry; all entry routes remain behind `ready`.

## Visual system
- Inter regular/medium/semibold/bold, already loaded with expo-font. No extra font family.
- 4/8 spacing; 16 body, 12 captions; 24/32 headings; radius 10.
- 48 minimum targets, 8 gaps; white on opaque camera scrims; deep lime on white.
- Reanimated transform/opacity, 150–300ms, reduced-motion handling. Draggable sheet has Close; page swipes have labeled buttons.
- Only local SVG gradient placeholder frames. No remote image assets or third-party brand assets.

## Recording contract
UI simulation only. No microphone/camera recording, filesystem media writes, or uploads. Session chunk lifecycle is simulated behind the session hook and mock API; native capture runtime is disconnected.
