export type Source = "Buffer" | "Voice" | "Session";
export type Highlight = { x: number; y: number; w: number; h: number };
export type DemoMemory = {
  id: string; title: string; source: Source; timestamp: string; timeLabel: string;
  dayLabel: string; place: string; tags: string[]; frames: string[];
  highlight?: Highlight; coordinates: { latitude: number; longitude: number };
  reminder?: boolean;
};
export type BufferState = { seconds: number; capacity: number; recording: boolean };
export type CaptureDraft = {
  clip: { enabled: boolean; seconds: number };
  location: { enabled: boolean };
  note: { enabled: boolean; text: string };
  reminder: { enabled: boolean; time: string };
  frames: { enabled: boolean };
  source: Source;
};
export type DemoReminder = { id: string; text: string; timeLabel: string; source: Source; done: boolean };
export type SessionResult = {
  summary: string; actionItems: string[]; transcript: { timestamp: string; text: string }[];
  keyFrames?: { uri: string; timestamp: string }[];
};
export type PrivacyReceipt = {
  uploads: { time: string; size: string }[];
  deletedRawFiles: number; storedMemories: number; storedFrames: number;
};
export type Simulation = { offline: boolean; empty: boolean; error: boolean };
