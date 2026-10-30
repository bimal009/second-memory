/**
 * Every user-facing string lives here. `{name}` is interpolated with the
 * assistant name chosen by the user in settings.
 */
export const strings = {
  appName: "Second Memory",

  onboarding: {
    title: "Meet your memory",
    nameStep: "01 / MAKE IT YOURS",
    permissionsPageTitle: "Give your memory its senses",
    openSettings: "Open phone settings",
    permissionsStep: "02 / CONNECT YOUR SENSES",
    setupHint: "Choose a name and enable all four permissions to begin.",
    ready: "All set. Your next memory starts here.",
    saveError: "Could not save your assistant name. Please try again.",
    subtitle:
      "Record anything, any time. You decide what gets kept and what gets forgotten.",
    assistantPrompt: "What do you want to call your assistant?",
    assistantHint: "Choose a name to use when talking to your assistant.",
    assistantPlaceholder: "Enter a name",
    continue: "Continue",
    permissionsTitle: "A little access. A lot of recall.",
    permissionsSubtitle: "Enable all four permissions to continue. Tap each button to grant access.",
    permissions: {
      camera: { label: "Camera", reason: "See what you see, so moments can be found later by picture." },
      microphone: { label: "Microphone", reason: "Hear what you say, so {name} can follow your commands." },
      location: { label: "Location", reason: "Tag memories with where they happened — kept on your phone." },
      notifications: { label: "Notifications", reason: "Nudge you about reminders, like returning a library book." },
    },
    enable: "Enable",
    enabled: "Enabled",
    permissionRequired: "All permissions are required. If a permission was denied, enable it in your phone settings, then tap Enable again.",
    getStarted: "Get started",
  },

  tabs: {
    capture: "Capture",
    ask: "Ask",
    memories: "Memories",
    today: "Today",
    settings: "Settings",
  },

  capture: {
    recording: "Recording",
    paused: "Paused",
    bufferMeterTitle: "Last {minutes} kept on this phone, not uploaded",
    bufferMinutesLabel: "{minutes} min",
    holdToTalk: "Hold to talk to {name}",
    releaseToSend: "Release to send",
    liveCaptionPlaceholder: "Transcribed command appears here…",
    liveCaptionSample: "…keep the toolbox {clip}",
    sourcePhone: "Phone camera",
    sourceGlasses: "Glasses, coming soon",
    planTitle: "Keep from the last moment",
    planClip: "Clip -20s/+10s",
    planLocation: "Location",
    planNote: "Note",
    savedToast: "Saved",
    cameraPlaceholderTitle: "Camera preview",
    cameraPlaceholderBody: "Camera is unavailable here (simulator or no permission). Recording UI is fully interactive.",
    requestPermission: "Try to enable camera",
    permissionDenied: "Camera permission needed for the live preview.",
    stopRecording: "Stop recording",
    startRecording: "Start recording",
    pause: "Pause",
    resume: "Resume",
  },

  ask: {
    title: "Ask",
    subtitle: "Ask {name} anything you saw or said.",
    holdToAsk: "Hold to ask",
    typingFallback: "Or type a question",
    placeholder: "Where is the passport?",
    examplesTitle: "Try asking",
    listening: "Listening…",
    thinking: "Thinking…",
    answerTitle: "{name} remembers",
    answerBadge: "Answer",
    noMemoryTitle: "No memory of that",
    noMemoryBody: "{name} doesn't have a memory matching that. Try one of these, or capture it next time.",
    suggestionsTitle: "Suggestions",
    fromFrame: "From the frame",
    at: "At {time}",
    retry: "Ask again",
    errorTitle: "Something went wrong",
    errorBody: "Couldn't reach your memory. Check your connection and try again.",
  },

  memories: {
    search: "Search memories",
    filters: { all: "All", today: "Today", places: "Places", clips: "Clips", reminders: "Reminders" },
    emptyTitle: "No memories yet",
    emptyBody: "Hold to talk on the Capture tab and {name} will start remembering for you.",
    errorTitle: "Memories didn't load",
    loading: "Loading memories…",
    todayGroup: "Today",
    yesterdayGroup: "Yesterday",
    detail: {
      highlightOn: "Hide highlight",
      highlightOff: "Show highlight",
      transcriptTitle: "What you said",
      locationTitle: "Where",
      delete: "Delete this memory",
      deleteConfirmTitle: "Delete this memory?",
      deleteConfirmBody: "This clip, transcript and location will be permanently removed from this phone.",
      deleted: "Memory deleted",
      clipDuration: "{sec}s clip",
    },
  },

  today: {
    recapTitle: "Your day",
    keyMoments: "Key moments",
    remindersTitle: "Reminders",
    emptyTitle: "Nothing scheduled",
    emptyBody: "Reminders you say out loud (\"remind me to return the library book Friday\") will show up here.",
    remindMeLater: "Mark done",
    allDone: "All caught up",
  },

  settings: {
    title: "Settings",
    assistantName: "Assistant name",
    assistantNameHint: "Used everywhere you talk to it.",
    privacyTitle: "Privacy",
    alwaysOnIndicator: "Always-visible recording indicator",
    alwaysOnLocked: "Locked on — you'll always know when capture is running. This cannot be turned off.",
    pauseCapture: "Pause capture",
    pauseCapturingHint: "Stops video and voice capture everywhere until resumed.",
    storageNote: "Second Memory stores text and embeddings, not raw video.",
    bufferLength: "Rolling buffer length",
    faceBlur: "Blur faces in kept clips",
    faceBlurComingSoon: "Coming soon",
    appearanceTitle: "Appearance",
    appearanceLight: "Light",
    appearanceDark: "Dark",
    appearanceSystem: "System",
    sourcesTitle: "Connected sources",
    sourceComingSoon: "Coming soon",
    destructiveTitle: "DANGER ZONE",
    deleteAll: "Delete all memories",
    deleteAllTitle: "Delete all memories?",
    deleteAllBody: "Every memory, transcript and location on this phone will be permanently removed. This cannot be undone.",
    deleteAllTypeHint: "Type DELETE to confirm",
    deleteAllConfirm: "Delete everything",
    deleteAllCancelled: "Cancelled",
    deletedAllToast: "All memories deleted",
  },

  recordingBanner: {
    label: "Capturing",
    resume: "Resume capture",
    pause: "Pause capture",
  },

  locationCard: {
    openInMaps: "Open in Maps",
    coords: "{lat}, {lng}",
  },

  common: {
    back: "Back",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    retry: "Retry",
    close: "Close",
  },

  hapticsNote: "Haptic feedback reserved for confirmations.",
} as const;

export const uiCopy = {
  previousFrame: "Previous frame", nextFrame: "Next frame", framePosition: "Frame {current} of {total}",
  brand: "Second Memory", close: "Close", back: "Back", cancel: "Cancel", retry: "Try again", loading: "Loading your memories", error: "Your memories couldn't load.", offline: "You're offline. Reconnect to try again.", empty: "No memories yet", emptyBody: "Save your first moment from the camera.",
  ask: "Ask", camera: "Camera", memories: "Memories", today: "Today", settings: "Settings", all: "All", moments: "Moments", sessions: "Sessions", places: "Places", yesterday: "Yesterday",
  cameraEyebrow: "BE HERE. REMEMBER LATER.", cameraTitle: "A little less to\nkeep in your head.", cameraHint: "Tap to save ? hold to ask {name}", fallbackName: "your assistant", openCamera: "Open camera settings", preview: "Camera preview", previewBody: "Live preview is unavailable on this device.", permission: "Camera access is off", permissionBody: "Allow camera access to see a live preview.", previewError: "Preview couldn't start", previewRetry: "Retry preview", flip: "Flip camera", flashOn: "Turn flash on", flashOff: "Turn flash off", locationOn: "Include location", locationOff: "Exclude location", pause: "Pause buffer", resume: "Resume buffer",
  buffer: "Last {time} kept on this phone, not uploaded", bufferPaused: "Buffer paused", previewOnly: "UI demo · no video or audio is recorded", reasonSession: "during sessions", reasonAway: "away from Camera", reasonBackground: "app in background", reasonOverlay: "a screen is open", reasonPrivacy: "privacy pause is on", reasonPermission: "camera preview unavailable", reasonLoading: "loading preferences", reasonError: "preferences unavailable",
  moment: "Moment", sessionMode: "Session (video + audio)", shutter: "Save a moment; hold to speak", listening: "Listening", liveTranscript: "Keep this moment and add a note.", release: "Release to send", saved: "Saved", saving: "Saving your moment", saveError: "Couldn't save. Tap to try again.", planClip: "Clip -20s/+10s", planLocation: "Location", planNote: "Note", bookmark: "Bookmark", bookmarked: "Bookmark added", tapHoldHint: "Tap to save · hold to speak", speakHint: "Hold to ask {name}",
  sessionStart: "Start session", sessionStop: "Stop session", sessionRunning: "Session running", sessionBuilding: "Building your notes", sessionBuildingBody: "Pulling the important parts together.", sessionConsent: "Tell people you are recording", keepAwake: "Keep screen on", dim: "Dim preview", sessionWarning: "45 minutes. Consider wrapping up.", sessionLimit: "Sessions stop automatically at 60 minutes.", shortSession: "Stop this short session?", shortBody: "It's under 10 seconds. Stop and build notes?", stop: "Stop & build notes", quality: "480p · low quality · 60-second chunks", chunkUploaded: "Chunk {count} uploaded", chunksWaiting: "{count} chunks waiting", noChunks: "First chunk is on its way", recording: "Capture preview", noRecording: "UI simulation — no recording",
  askEyebrow: "YOUR EVERYDAY, SEARCHABLE", askTitle: "You saw it.\nWe'll help you find it.", askSubtitle: "Ask {name} about the little things.", holdAsk: "Hold to ask", typeLabel: "Your question", typePlaceholder: "Where did I put my passport?", examples: "Try asking", thinking: "Looking through your memories", answer: "Found", lastSeen: "Last seen", notFound: "No memory of that", notFoundBody: "Try a different detail, or save it next time.", askPermission: "Microphone access is off. You can still type your question.",
  libraryEyebrow: "LESS LOST. MORE FOUND.", libraryTitle: "Your memories", search: "Search memories", searchPlaceholder: "A thing, a place, a passing thought…", noMatches: "Nothing here yet", count: "{count} moments, ready when you need them.", highlight: "Highlight object", transcript: "What you said", tags: "Little details", frames: "Memory frames", deleteMemory: "Delete this memory", deleteSession: "Delete session", deleteTitle: "Let this memory go?", deleteBody: "This removes the saved memory and its frames.", deleted: "Memory deleted", location: "Saved place", maps: "Open in Maps", mapError: "Maps couldn't open on this device.",
  todayEyebrow: "A LITTLE PERSPECTIVE", todayTitle: "Today, remembered.", todaySubtitle: "The important parts, all in one place.", recap: "Daily recap", reminders: "Coming up", daySessions: "Sessions", summary: "Summary", actions: "Action items", bookmarks: "Bookmarks", chunks: "Transcript", createReminder: "Create reminder", reminderAdded: "Reminder added", localCopy: "Local recording", localUnavailable: "Local player is a stub. No media file was recorded.",
  settingsTitle: "Make it yours.", settingsSubtitle: "Your memory. Your boundaries.", assistantName: "Assistant name", nameHint: "The name you use when speaking to your assistant.", appearance: "Appearance", light: "Light", dark: "Dark", system: "System", bufferLength: "Buffer length", minute: "{count} min", voiceReplies: "Voice replies", off: "Off", earphones: "Earphones only", always: "Always", keepLocal: "Keep recording on this phone", localHint: "Off by default. A local-only copy of sessions.", faceBlur: "Face blur", soon: "Coming soon", privacy: "Privacy", indicator: "Recording indicator", locked: "Always on · locked", privacyBody: "Raw video is never kept on the server. An optional local copy stays on this phone.", receipt: "Privacy receipt", sources: "Connected sources", phone: "Phone camera", glasses: "Meta AI glasses", active: "Active", disconnected: "Not connected", deleteAll: "Delete all memories", deleteAllBody: "This removes all moments and sessions. Type DELETE to confirm.", deleteConfirm: "DELETE", deletePlaceholder: "Type DELETE", keepMemories: "Keep my memories", settingsError: "Couldn't save that setting. Please try again.",
  receiptsTitle: "What left your phone", receiptsSubtitle: "A receipt for each capture. Raw files deleted after processing.", rawDeleted: "Raw files deleted", receiptStats: "{files} files · {size} MB · {seconds}s audio · {frames} frames analyzed", mockReceipt: "Demo receipts · no files were uploaded",
  diagnostics: "Preview states", demoNormal: "Normal", demoOffline: "Offline", demoEmpty: "Empty", demoError: "Error", demoDenied: "Permission denied", demoHint: "Simulate API and permission states for UI review.",
} as const;
export function copy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export const captureCopy = {
  start: "Start capture", capturing: "Capturing", idle: "Not capturing", paused: "Capture paused", background: "Capture paused while the app was in the background", error: "Capture couldn't continue", resume: "Resume", pause: "Pause", stop: "Stop", stopTitle: "End this capture?", stopBody: "This run is under 10 seconds. Your saved memories will stay.", endRun: "End capture", starting: "Starting", finishing: "Saving your run", startHint: "Tap to start", watching: "Watching", listening: "Listening", thinking: "Thinking", ready: "Ready when you are", previewOnly: "Preview only ? no recording", saved: "Saved", rememberThis: "Remember this", bookmarkHint: "Tap to remember ? hold to ask", talkHint: "Hold to speak", consent: "Tell people you are recording", keepAwake: "Screen stays on during capture", warning: "45 minutes ? capture ends at 60 minutes", limit: "Capture ended at the 60-minute limit", chunkSaved: "Chunk {count} saved", waiting: "{count} chunks waiting to upload", firstChunk: "Saving your first chunk", todayCount: "{count} memories today", ago: "Saved {seconds}s ago", uploadError: "Waiting for a connection", runMissing: "This run is no longer available", commandError: "Couldn't complete that. Try again.", commandLabel: "Message your assistant", commandPlaceholder: "Ask, remember, or set a reminder", send: "Send", commandExamples: ["Where did I leave my passport?", "Remember this", "Remind me to return the library book Friday", "Pause capture", "Stop capture"], openAsk: "Open in Ask", answer: "Answer", searching: "Searching", highlighting: "Highlighting", reminderSaved: "Reminder set", note: "Note", location: "Location", friday: "Friday", laterToday: "Later today", today: "Today", yesterday: "Yesterday", runs: "Runs", run: "Capture run", bookmarks: "Bookmarks", chunk: "Chunk", chunks: "Chunks", chunkLength: "Chunk length", seconds: "{count} s", chunkHint: "Applies to your next capture", recentQuestions: "Recent questions", noQuestions: "Your recent questions will appear here.", deleteRun: "Delete run", deleteRunBody: "This deletes the run and its saved memories.", planned: "Planned ? not available", showPreview: "Show preview", dimPreview: "Dim preview", permissionBody: "Allow camera access to see a live preview.", mockUnavailable: "Live preview is unavailable. You can try the capture demo.", waitingPermission: "Checking camera access", localPlaybackError: "This local recording couldn't be opened.", localOnly: "On this phone only", noRawUpload: "Demo receipts ? no files were uploaded", receiptPending: "No chunks uploaded yet", receiptChunk: "Chunk {count}", sheet: "Sheet", openMemory: "Open memory", settingsPending: "Loading preferences", resetSimulation: "Restore connection", offline: "You're offline. Chunks will wait until you reconnect.", offlineSim: "Offline preview", testing: "Preview controls", testOffline: "Simulate offline", testDenied: "Simulate denied permission", testEmpty: "Simulate empty memories", testError: "Simulate API error", testNormal: "Restore normal preview", localCopy: "Local recording", unavailable: "Capture unavailable", captureFailure: "Camera access was interrupted. Check permission, then resume.",
} as const;
