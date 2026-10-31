import { describe, expect, it } from "vitest";
import {
    askAnswerSchema,
    capturePlanSchema,
    commandPlanSchema,
    routerRequestSchema,
} from "@repo/types";

describe("plan schemas", () => {
    it("accepts all six intents", () => {
        const plan = {
            actions: [
                { intent: "bookmark", note: "parking", tags: ["car"], duration_sec: 30 },
                { intent: "reminder", text: "call mom", due_at: "2026-05-02T10:00:00+05:45" },
                { intent: "track", label: "keys", enabled: true },
                { intent: "ask", question: "where did I park?" },
            ],
        };
        expect(commandPlanSchema.safeParse(plan).success).toBe(true);
        for (const action of [
            { intent: "control", command: "pause" },
            { intent: "clarify", question: "what?" },
        ]) {
            expect(capturePlanSchema.safeParse(action).success).toBe(true);
        }
    });

    it("rejects more than MAX_ACTIONS actions", () => {
        const plan = {
            actions: Array.from({ length: 5 }, () => ({ intent: "clarify", question: "x" })),
        };
        expect(commandPlanSchema.safeParse(plan).success).toBe(false);
    });

    it("rejects an unknown control command and a bad reminder time", () => {
        expect(
            capturePlanSchema.safeParse({ intent: "control", command: "fast-forward" }).success,
        ).toBe(false);
        expect(
            capturePlanSchema.safeParse({ intent: "reminder", text: "x", due_at: "tomorrow" })
                .success,
        ).toBe(false);
    });

    it("accepts +05:45 offsets on reminder times", () => {
        expect(
            capturePlanSchema.safeParse({
                intent: "reminder",
                text: "x",
                due_at: "2026-11-01T09:00:00+05:45",
            }).success,
        ).toBe(true);
    });

    it("requires lat and lng together on the router request", () => {
        const base = { command_id: "00000000-0000-4000-8000-000000000001" };
        expect(routerRequestSchema.safeParse({ ...base, lat: 27.7, lng: 85.3 }).success).toBe(true);
        expect(routerRequestSchema.safeParse({ ...base, lat: 27.7 }).success).toBe(false);
    });

    it("asks require a question and answers carry the citation fields", () => {
        expect(capturePlanSchema.safeParse({ intent: "ask" }).success).toBe(false);
        const answer = {
            question: "where did I park?",
            known: true,
            answer: "last seen",
            memory_id: "00000000-0000-4000-8000-000000000002",
            frame: null,
            lat: 27.7,
            lng: 85.3,
            last_seen_at: "2026-10-31T10:00:00+05:45",
            usually_here: false,
        };
        expect(askAnswerSchema.safeParse(answer).success).toBe(true);
    });
});
