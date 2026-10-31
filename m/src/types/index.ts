export type Point = {
    x: number;
    y: number;
};
export type MemoryKind = "clip" | "note" | "place" | "chunk" | "bookmark";
export type MemoryLocation = {
    label: string;
    lat: number;
    lng: number;
};
export type FrameHighlight = {
    mask: Point[];
    objectLabel: string;
};
export type Memory = {
    id: string;
    kind: MemoryKind;
    runId?: string;
    localCopyUri?: string;
    title: string;
    summary: string;
    transcript: string;
    createdAt: string;
    startedAtLabel: string;
    frameSeed: number;
    tags: string[];
    location?: MemoryLocation;
    highlight?: FrameHighlight;
    clipDurationSec?: number;
};
export type MemoryFilterKey = "all" | "today" | "places" | "clips" | "reminders" | "bookmarks";
export type CapturePlan = {
    clip: boolean;
    includeLocation: boolean;
    note: string | null;
};
export type Answer = {
    question: string;
    text: string;
    citedMemoryId: string;
    highlightMask: Point[];
    frameSeed: number;
    timeLabel: string;
};
export type AskResult = {
    kind: "answer";
    answer: Answer;
} | {
    kind: "not-found";
    suggestions: string[];
};
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
    chunkLength?: import("./run").ChunkLength;
    keepLocalRecording?: boolean;
    voiceReplies?: "off" | "earphones" | "always";
    assistantName: string;
    appearance: AppearanceMode;
    alwaysOnIndicator: boolean;
    recordingPaused: boolean;
    bufferMinutes: BufferMinutes;
    faceBlur: boolean;
    defaultClipSeconds?: number;
    locationEnabled?: boolean;
    speakReplies?: boolean;
    pushToTalkMode?: "audio" | "video";
    sessionMode?: "audio" | "video";
    connectedSources: ConnectedSource[];
};
