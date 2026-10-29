import type {
  AppSettings,
  AskResult,
  CapturePlan,
  Memory,
  MemoryFilterKey,
  Point,
  TodayPayload,
} from "@/types";
import type { SecondMemoryClient } from "@/api/client";
import { exampleQuestions, mockMemories, mockRecap, mockReminders } from "@/mocks/data";

const MOCK_LATENCY_MS = 450;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let memories: Memory[] = structuredClone(mockMemories);
let reminders = structuredClone(mockReminders);
let recap = structuredClone(mockRecap);

const defaultSettings: AppSettings = {
  assistantName: "Ev",
  appearance: "system",
  alwaysOnIndicator: true,
  recordingPaused: false,
  bufferMinutes: 2,
  faceBlur: false,
  connectedSources: [
    { id: "phone-camera", name: "Phone camera", enabled: true },
    { id: "glasses", name: "Glasses", enabled: false, comingSoon: true },
  ],
};

let settings: AppSettings = structuredClone(defaultSettings);

function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

/** Rough keyword scoring against mock data — the backend does the real work. */
function mockAsk(question: string): AskResult {
  const q = question.toLowerCase();

  if (q.includes("passport") || q.includes("blue drawer")) {
    const m = memories.find((x) => x.id === "memory-passport-drawer")!;
    return {
      kind: "answer",
      answer: {
        question,
        text: `Your passport is in the blue drawer — second from the top of the hallway dresser. You put it there this morning at ${m.startedAtLabel}.`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: (m.highlight!.mask as Point[]).map((p) => ({ ...p })),
      },
    };
  }
  if (q.includes("car") || q.includes("parked")) {
    const m = memories.find((x) => x.id === "memory-car-level3")!;
    return {
      kind: "answer",
      answer: {
        question,
        text: `Level 3, next to pillar C4 — two rows from the elevator. Captured at ${m.startedAtLabel}.`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: (m.highlight!.mask as Point[]).map((p) => ({ ...p })),
      },
    };
  }
  if (q.includes("toolbox") || q.includes("screwdriver")) {
    const m = memories.find((x) => x.id === "memory-toolbox")!;
    return {
      kind: "answer",
      answer: {
        question,
        text: `At ${m.startedAtLabel} the toolbox had a screwdriver, tape measure and two hex keys. Here is the screwdriver:`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: (m.highlight!.mask as Point[]).map((p) => ({ ...p })),
      },
    };
  }
  if (q.includes("keys")) {
    const m = memories.find((x) => x.id === "memory-keys-shelf")!;
    return {
      kind: "answer",
      answer: {
        question,
        text: `Your keys are on the hallway shelf by the door — from ${m.startedAtLabel} today.`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: (m.highlight!.mask as Point[]).map((p) => ({ ...p })),
      },
    };
  }
  if (q.includes("library") || q.includes("book")) {
    const m = memories.find((x) => x.id === "memory-library-book")!;
    return {
      kind: "answer",
      answer: {
        question,
        text: `"The Design of Everyday Things" is due back Friday at the Northgate branch.`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: (m.highlight!.mask as Point[]).map((p) => ({ ...p })),
      },
    };
  } else {
    // No memory of that — surface baseline suggestions.
  return {
    kind: "not-found",
    suggestions: [
      exampleQuestions[0],
      exampleQuestions[1],
      exampleQuestions[2],
    ],
  };
}

/** Mock voice-command parser → capture plan + freshly saved memory. */
function mockCapture(command: string): { plan: CapturePlan; savedMemory: Memory } {
  const seed = 100 + memories.length * 7;
  const plan: CapturePlan = { clip: true, includeLocation: true, note: null };
  const savedMemory: Memory = {
    id: `memory-mock-${Date.now()}`,
    kind: "clip",
    title: command,
    summary: `Kept from the last moment: “${command}”.`,
    transcript: command,
    createdAt: new Date().toISOString(),
    startedAtLabel: new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
    frameSeed: seed,
    tags: ["today"],
    location: { label: "Home — Hallway", lat: 40.7412, lng: -73.9896 },
    clipDurationSec: 24,
  };
  memories = [savedMemory, ...memories];
  return { plan, savedMemory };
}

export const mockClient: SecondMemoryClient = {
  async listMemories(params) {
    await delay(MOCK_LATENCY_MS);
    let list = [...memories];

    const filter = params?.filter ?? "all";
    if (filter === "today") list = list.filter((m) => isToday(m.createdAt));
    if (filter === "places") list = list.filter((m) => !!m.location);
    if (filter === "clips") list = list.filter((m) => m.kind === "clip");
    // "reminders" is intentionally empty here — reminders live on the Today
    // tab; the chip exists for future mixed timelines.

    const query = params?.query?.trim().toLowerCase();
    if (query) {
      list = list.filter((m) =>
        [m.title, m.summary, m.transcript, ...m.tags]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    // Newest first.
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getMemory(id) {
    await delay(MOCK_LATENCY_MS / 3);
    return memories.find((m) => m.id === id) ?? null;
  },

  async deleteMemory(id) {
    await delay(MOCK_LATENCY_MS / 3);
    memories = memories.filter((m) => m.id !== id);
  },

  async deleteAllMemories() {
    await delay(MOCK_LATENCY_MS);
    memories = [];
  },

  async ask(question) {
    await delay(MOCK_LATENCY_MS + 250);
    return mockAsk(question, settings.assistantName);
  },

  async getToday() {
    await delay(MOCK_LATENCY_MS);
    return { recap: recap, reminders: [...reminders] };
  },

  async setReminderDone(id, done) {
    await delay(120);
    reminders = reminders.map((r) => (r.id === id ? { ...r, done } : r));
  },

  async getSettings() {
    await delay(100);
    return structuredClone(settings);
  },

  async updateSettings(patch) {
    await delay(100);
    settings = { ...settings, ...patch };
    return structuredClone(settings);
  },

  async sendCaptureCommand({ command }) {
    await delay(MOCK_LATENCY_MS + 300);
    return mockCapture(command);
  },
};
