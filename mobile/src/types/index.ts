/** Shared domain types.*/

export type Point = { x: number; y: number };

/** What a memory was captured as. */
export type MemoryKind = "clip" | "note" | "place";

export type MemoryLocation = {
  label: string;
  lat: number;
  lng: number;
};

/**
 * Mock mask polygon (0..1 relative to the frame) the "AI" highlighted.
 * The real backend returns these; UI only draws them.
 */
export type FrameHighlight = {
  mask: Point[];
  /** Short label of the highlighted object, e.g. "screwdriver". */
  objectLabel: string;
};

export type Memory = {
  id: string;
  kind: MemoryKind;
  title: string;
  summary: string;
  transcript: string;
  /** ISO timestamp of capture. */
  createdAt: string;
  startedAtLabel: string;
  /** Seed for the generated gradient placeholder frame. */
  frameSeed: number;
  tags: string[];
  location?: MemoryLocation;
  highlight?: FrameHighlight;
  /** Duration of the kept clip in seconds (clips only). */
  clipDurationSec?: number;
};

export type MemoryFilterKey = "all" | "today" | "places" | "clips" | "reminders";

/** What a voice command produced ("keep this", "add a note", …). */
export type CapturePlan = {
  clip: boolean;
  includeLocation: boolean;
  note: string | null;
};

export type Answer = {
  question: string;
  text: string;
  citedMemoryId: string;
  /** Relative mock mask points for the FrameWithHighlight overlay. */
  highlightMask: Point[];
  frameSeed: number;
  timeLabel: string;
};

export type AskResult =
  | { kind: "answer"; answer: Answer }
  | { kind: "not-found"; suggestions: string[] };

export type Reminder = {
  id: string;
  text: string;
  timeLabel: string;
  done: boolean;
};

export type KeyMoment = {
  label: string;
  timeLabel: string;
  frameSeed: number;
};

export type DayRecap = {
  dateLabel: string;
  headline: string;
  summary: string;
  keyMoments: KeyMoment[];
};

export type TodayPayload = {
  recap: DayRecap | null;
  reminders: Reminder[];
};

export type AppearanceMode = "light" | "dark" | "system";
export type BufferMinutes = 1 | 2 | 5;

export type ConnectedSource = {
  id: string;
  name: string;
  enabled: boolean;
  comingSoon?: boolean;
};

export type AppSettings = {
  onboardingComplete: boolean;
  assistantName: string;
  appearance: AppearanceMode;
  alwaysOnIndicator: boolean;
  recordingPaused: boolean;
  bufferMinutes: BufferMinutes;
  faceBlur: boolean;
  connectedSources: ConnectedSource[];
};
