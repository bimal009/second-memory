import type { MemoryLocation } from "./index";
export type SessionChunk = { id: string; seconds: number; text: string; frameSeed: number };
export type Session = {
  id: string; title: string; summary: string; createdAt: string; durationSec: number; frameSeed: number;
  actionItems: string[]; bookmarks: { seconds: number; label: string }[]; chunks: SessionChunk[]; localCopyUri?: string;
};
export type Sighting = { id: string; frameSeed: number; timeLabel: string; location?: MemoryLocation };
export type PrivacyReceipt = { id: string; title: string; files: number; sizeMb: number; audioSec: number; frames: number; rawDeleted: true };
export type PreviewState = "normal" | "offline" | "empty" | "error" | "denied";
