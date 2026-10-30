import type { AskResult, Memory } from "@/types";
import { exampleQuestions } from "@/mocks/data";
export function mockAsk(question: string, memories: Memory[]): AskResult {
  const q = question.toLowerCase();

  if (q.includes("passport") || q.includes("blue drawer")) {
    const m = memories.find((x) => x.id === "memory-passport-drawer");
    if (!m) return { kind: "not-found", suggestions: [...exampleQuestions] };
    return {
      kind: "answer",
      answer: {
        question,
        text: `Your passport is in the blue drawer — second from the top of the hallway dresser. You put it there at ${m.startedAtLabel}.`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: m.highlight?.mask.map(p => ({ ...p })) ?? [],
      },
    };
  }
  if (q.includes("car") || q.includes("parked")) {
    const m = memories.find((x) => x.id === "memory-car-level3");
    if (!m) return { kind: "not-found", suggestions: [...exampleQuestions] };
    return {
      kind: "answer",
      answer: {
        question,
        text: `Level 3, next to pillar C4 — two rows from the elevator. Captured at ${m.startedAtLabel}.`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: m.highlight?.mask.map(p => ({ ...p })) ?? [],
      },
    };
  }
  if (q.includes("toolbox") || q.includes("screwdriver")) {
    const m = memories.find((x) => x.id === "memory-toolbox");
    if (!m) return { kind: "not-found", suggestions: [...exampleQuestions] };
    return {
      kind: "answer",
      answer: {
        question,
        text: `At ${m.startedAtLabel} the toolbox had a screwdriver, tape measure and two hex keys. Here is the screwdriver:`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: m.highlight?.mask.map(p => ({ ...p })) ?? [],
      },
    };
  }
  if (q.includes("keys")) {
    const m = memories.find((x) => x.id === "memory-keys-shelf");
    if (!m) return { kind: "not-found", suggestions: [...exampleQuestions] };
    return {
      kind: "answer",
      answer: {
        question,
        text: `Your keys are on the hallway shelf by the door — from ${m.startedAtLabel} today.`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: m.highlight?.mask.map(p => ({ ...p })) ?? [],
      },
    };
  }
  if (q.includes("library") || q.includes("book")) {
    const m = memories.find((x) => x.id === "memory-library-book");
    if (!m) return { kind: "not-found", suggestions: [...exampleQuestions] };
    return {
      kind: "answer",
      answer: {
        question,
        text: `"The Design of Everyday Things" is due back Friday at the Northgate branch.`,
        citedMemoryId: m.id,
        timeLabel: m.startedAtLabel,
        frameSeed: m.frameSeed,
        highlightMask: m.highlight?.mask.map(p => ({ ...p })) ?? [],
      },
    };
  } else {
    // No memory of that — surface baseline suggestions.
    return {
      kind: "not-found",
      suggestions: [exampleQuestions[0], exampleQuestions[1], exampleQuestions[2]],
    };
  }
}

