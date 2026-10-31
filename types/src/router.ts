import { z } from "zod";
import { askAnswerSchema } from "./ask";
import {
  DEFAULT_DURATION_S,
  MAX_ACTIONS,
  MAX_DURATION_S,
  MIN_DURATION_S,
} from "./constants";
import { apiResponse } from "./responses";

/** media for a bookmark: frames (key frames), audio (transcript text only) */
export const planMedia = z.enum(["frames", "audio"]);
export type PlanMedia = z.infer<typeof planMedia>;

const bookmarkPlan = z.object({
  intent: z.literal("bookmark"),
  note: z.string().min(1),
  tags: z.array(z.string()),
  duration_sec: z
    .number()
    .int()
    .min(MIN_DURATION_S)
    .max(MAX_DURATION_S)
    .optional(),
  media: z.array(planMedia).min(1).optional(),
  location: z.boolean().optional(),
});

const reminderPlan = z.object({
  intent: z.literal("reminder"),
  text: z.string().min(1),
  due_at: z.string().datetime({ offset: true }),
});

const trackPlan = z.object({
  intent: z.literal("track"),
  label: z.string().min(1),
  enabled: z.boolean(),
});

const askPlan = z.object({
  intent: z.literal("ask"),
  question: z.string().min(1),
});

const controlPlan = z.object({
  intent: z.literal("control"),
  command: z.enum(["pause", "resume", "stop"]),
});

const clarifyPlan = z.object({
  intent: z.literal("clarify"),
  question: z.string().min(1),
});

export const capturePlanSchema = z.discriminatedUnion("intent", [
  bookmarkPlan,
  reminderPlan,
  trackPlan,
  askPlan,
  controlPlan,
  clarifyPlan,
]);
export type CapturePlan = z.infer<typeof capturePlanSchema>;

export const commandPlanSchema = z.object({
  actions: z.array(capturePlanSchema).min(1).max(MAX_ACTIONS),
});
export type CommandPlan = z.infer<typeof commandPlanSchema>;

export const routerTrigger = z.enum(["button", "wake_word"]);
export type RouterTrigger = z.infer<typeof routerTrigger>;

/**
 * Text-mode request (tests, and the no-audio fallback). The endpoint also
 * accepts multipart with an `audio` file instead of `transcript`.
 */
export const routerRequestSchema = z
  .object({
    command_id: z.string().uuid(),
    transcript: z.string().min(1).optional(),
    trigger: routerTrigger.optional().default("button"),
    lat: z.number().min(-90).max(90).nullish(),
    lng: z.number().min(-180).max(180).nullish(),
  })
  .refine((v) => (v.lat == null) === (v.lng == null), {
    message: "lat and lng must be sent together",
  });
export type RouterRequest = z.infer<typeof routerRequestSchema>;

/** Per-action outcome, in plan order. One failing action does not cancel the rest. */
export const executedActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("bookmark"),
    memory_id: z.string().uuid().nullable(),
    status: z.string(),
    error: z.string().nullable(),
  }),
  z.object({
    intent: z.literal("reminder"),
    reminder_id: z.string().uuid().nullable(),
    error: z.string().nullable(),
  }),
  z.object({
    intent: z.literal("track"),
    label: z.string(),
    tracked: z.boolean(),
    error: z.string().nullable(),
  }),
  z.object({
    intent: z.literal("ask"),
    answer: askAnswerSchema.nullable(),
    error: z.string().nullable(),
  }),
  z.object({
    intent: z.literal("control"),
    command: controlPlan.shape.command,
    error: z.string().nullable(),
  }),
  z.object({
    intent: z.literal("clarify"),
    question: z.string(),
    error: z.string().nullable(),
  }),
]);
export type ExecutedAction = z.infer<typeof executedActionSchema>;

export const routerResultSchema = z.object({
  command_id: z.string().uuid(),
  plan: commandPlanSchema,
  executed: z.array(executedActionSchema),
});
export type RouterResult = z.infer<typeof routerResultSchema>;

export const routerResponseSchema = apiResponse(routerResultSchema);

/** resolvePlan() defaults, applied after validation (model sets them only when the words imply it). */
export const planDefaults = {
  duration_sec: DEFAULT_DURATION_S,
  media: ["frames", "audio"] as PlanMedia[],
  location: true,
};
