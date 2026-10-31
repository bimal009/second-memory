import { Hono } from "hono";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { capturePlanSchema, commandPlanSchema, DEFAULT_DURATION_S, FAST_PATH_CONTROL_COMMANDS, PRE_ROLL_S, WAKE_PREFIX_WORDS, routerRequestSchema, type ApiResponse, type CapturePlan, type CommandPlan, type ExecutedAction, type RouterResult, } from "@repo/types";
import { db } from "../db/index";
import { memories, objects, reminders, routerCommands } from "../db/schema";
import { intentPlan, transcribe } from "../lib/meta";
import { convertMono } from "../services/ffmpeg";
type Env = {
    Variables: {
        userId: string;
    };
};
export const routerRouter = new Hono<Env>();
async function planWithRetry(transcript: string, now: string, tz: string): Promise<CommandPlan> {
    let retryHint = "";
    for (let attempt = 0; attempt < 2; attempt++) {
        const raw = await intentPlan(retryHint
            ? `${transcript}\nYour previous answer was not a valid plan (${retryHint}). Return ONLY the JSON object.`
            : transcript, now, tz);
        try {
            const stripped = raw
                .trim()
                .replace(/^```(?:json)?/i, "")
                .replace(/```$/, "")
                .trim();
            return commandPlanSchema.parse(JSON.parse(stripped));
        }
        catch (err) {
            retryHint = (err instanceof Error ? err.message : String(err)).slice(0, 300);
        }
    }
    return {
        actions: [
            { intent: "clarify", question: `I heard: "${transcript}". What should I do?` },
        ],
    };
}
function resolvePlan(plan: CommandPlan): CommandPlan {
    return {
        actions: plan.actions.map((a) => a.intent === "bookmark"
            ? {
                ...a,
                duration_sec: a.duration_sec ?? DEFAULT_DURATION_S,
                media: a.media ?? ["frames", "audio"],
                location: a.location ?? true,
            }
            : a),
    };
}
function fastPathPlan(transcript: string): CommandPlan | null {
    const t = transcript.trim().toLowerCase();
    const control = t.match(new RegExp(`^(${FAST_PATH_CONTROL_COMMANDS.join("|")})[\\s.,!]*$`));
    if (control) {
        return {
            actions: [{ intent: "control", command: control[1] as "pause" | "resume" | "stop" }],
        };
    }
    return null;
}
async function commandAudioTranscript(bytes: ArrayBuffer): Promise<string> {
    const stamp = Date.now().toString(36);
    const src = join(tmpdir(), `cmd_${stamp}.m4a`);
    const wav = join(tmpdir(), `cmd_${stamp}.wav`);
    await writeFile(src, Buffer.from(bytes));
    try {
        await convertMono(src, wav);
        return (await transcribe(wav)).trim();
    }
    finally {
        await rm(src, { force: true }).catch(() => { });
        await rm(wav, { force: true }).catch(() => { });
    }
}
routerRouter.post("/", async (c) => {
    const userId = c.get("userId");
    const contentType = c.req.header("content-type") ?? "";
    let parsed;
    let audioBytes: ArrayBuffer | null = null;
    if (contentType.includes("multipart/form-data")) {
        const form = await c.req.parseBody();
        audioBytes =
            form["audio"] instanceof File ? await (form["audio"] as File).arrayBuffer() : null;
        parsed = routerRequestSchema.safeParse({
            command_id: form["command_id"],
            transcript: form["transcript"] || undefined,
            trigger: form["trigger"] || undefined,
            lat: form["lat"] ? Number(form["lat"]) : undefined,
            lng: form["lng"] ? Number(form["lng"]) : undefined,
        });
    }
    else {
        parsed = routerRequestSchema.safeParse(await c.req.json().catch(() => ({})));
    }
    if (!parsed.success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid body",
            data: null,
            error: { code: "INVALID_BODY", message: parsed.error.message },
        }, 400);
    }
    const body = parsed.data;
    const existing = await db.query.routerCommands.findFirst({
        where: { userId, commandId: body.command_id },
    });
    if (existing) {
        return c.json<ApiResponse<RouterResult>>({
            status: 200,
            message: "Command replayed",
            data: existing.result as RouterResult,
            error: null,
        });
    }
    let transcript = body.transcript?.trim() ?? "";
    if (!transcript && audioBytes)
        transcript = await commandAudioTranscript(audioBytes);
    if (!transcript) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid body",
            data: null,
            error: { code: "TRANSCRIPT_REQUIRED", message: "send transcript text or an audio file" },
        }, 400);
    }
    const user = await db.query.users.findFirst({
        where: { id: userId },
        columns: { timezone: true, assistantName: true },
    });
    const tz = user?.timezone ?? "Asia/Kathmandu";
    transcript = transcript.replace(new RegExp(`^(?:${WAKE_PREFIX_WORDS.join("|")})\\s+${user?.assistantName ?? ""}\\b[\\s,]*`, "i"), "");
    const now = new Date().toISOString();
    const plan = resolvePlan(fastPathPlan(transcript) ?? (await planWithRetry(transcript, now, tz)));
    const active = await db.query.captures.findFirst({
        where: { userId, status: "recording" },
        orderBy: { createdAt: "desc" },
        columns: { id: true },
    });
    const executed: ExecutedAction[] = [];
    for (const action of plan.actions) {
        executed.push(await runAction(action, {
            userId,
            lat: body.lat ?? null,
            lng: body.lng ?? null,
            captureId: active?.id ?? null,
        }));
    }
    const result: RouterResult = { command_id: body.command_id, plan, executed };
    await db.insert(routerCommands).values({
        userId,
        commandId: body.command_id,
        plan: plan as unknown as Record<string, unknown>,
        result: result as unknown as Record<string, unknown>,
    });
    return c.json<ApiResponse<RouterResult>>({
        status: 200,
        message: "Command executed",
        data: result,
        error: null,
    });
});
type ActionContext = {
    userId: string;
    lat: number | null;
    lng: number | null;
    captureId: string | null;
};
async function runAction(action: CapturePlan, ctx: ActionContext): Promise<ExecutedAction> {
    try {
        if (action.intent === "control") {
            return { intent: "control", command: action.command, error: null };
        }
        if (action.intent === "ask") {
            return { intent: "ask", answer: null, error: "ask answering lands in the ask phase" };
        }
        if (action.intent === "bookmark") {
            if (!ctx.captureId) {
                return { intent: "bookmark", memory_id: null, status: "no active recording", error: "no active capture" };
            }
            const now = new Date();
            const [memory] = await db
                .insert(memories)
                .values({
                userId: ctx.userId,
                captureId: ctx.captureId,
                kind: "moment",
                status: "pending",
                windowStart: new Date(now.getTime() - PRE_ROLL_S * 1000),
                windowEnd: new Date(now.getTime() + (action.duration_sec ?? DEFAULT_DURATION_S) * 1000),
                note: action.note,
                tags: action.tags,
                mediaPlan: action.media?.join(",") ?? "frames,audio",
                lat: action.location ? ctx.lat : null,
                lng: action.location ? ctx.lng : null,
            })
                .returning({ id: memories.id });
            return { intent: "bookmark", memory_id: memory?.id ?? null, status: "pending", error: null };
        }
        if (action.intent === "reminder") {
            const [reminder] = await db
                .insert(reminders)
                .values({
                userId: ctx.userId,
                source: "voice",
                text: action.text,
                dueAt: new Date(action.due_at),
            })
                .returning({ id: reminders.id });
            return { intent: "reminder", reminder_id: reminder?.id ?? null, error: null };
        }
        if (action.intent === "track") {
            const label = action.label.trim().toLowerCase();
            await db
                .insert(objects)
                .values({ userId: ctx.userId, label, tracked: action.enabled })
                .onConflictDoUpdate({
                target: [objects.userId, objects.label],
                set: { tracked: action.enabled },
            });
            return { intent: "track", label, tracked: action.enabled, error: null };
        }
        return { intent: "clarify", question: action.question, error: null };
    }
    catch (err) {
        return {
            intent: action.intent,
            error: (err instanceof Error ? err.message : String(err)).slice(0, 300),
        } as ExecutedAction;
    }
}
