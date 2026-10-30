import type { AskResult } from "./index";
export type AssistantCommand =
  | { intent: "bookmark"; note: string }
  | { intent: "reminder"; text: string; due: string }
  | { intent: "ask"; question: string; result: AskResult }
  | { intent: "control"; action: "pause" | "resume" | "stop" };
