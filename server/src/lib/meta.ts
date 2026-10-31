import { readFile } from "node:fs/promises";
import OpenAI from "openai";
import { describeSystemPrompt } from "../prompts/describe";
import { summarySystemPrompt } from "../prompts/summary";
import { intentSystemPrompt } from "../prompts/intent";
const client = new OpenAI({
    baseURL: process.env.META_API_BASE_URL ?? "https://api.meta.ai/v1",
    apiKey: process.env.MODEL_API_KEY ?? process.env.META_API_KEY ?? "",
    timeout: 90000,
});
const CHAT_MODEL = process.env.CHAT_MODEL ?? "muse-spark-1.3";
const SPEECH_MODEL = process.env.SPEECH_MODEL ?? "muse-voice-transcribe-1.0";
const SAM_MODEL = process.env.SEGMENT_MODEL ?? "sam-3.1";
export type SegmentBox = { x: number; y: number; w: number; h: number };
export const chat = async (prompt: string): Promise<string> => {
    const raw = await client.chat.completions.create({
        model: CHAT_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
    });
    return raw.choices?.[0]?.message?.content ?? "";
};
export const vision = async (frame: string, question = "Describe the scene in one short sentence."): Promise<string> => {
    const url = frame.startsWith("data:")
        ? frame
        : /\.(jpe?g|png)$/i.test(frame)
            ? `data:image/jpeg;base64,${(await readFile(frame)).toString("base64")}`
            : `data:image/jpeg;base64,${frame}`;
    const raw = await client.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: question },
                    { type: "image_url", image_url: { url } },
                ],
            },
        ],
        temperature: 0,
    });
    return raw.choices?.[0]?.message?.content ?? "";
};
export const segment = async (framePath: string, prompt: string): Promise<SegmentBox[]> => {
    const url = `data:image/jpeg;base64,${(await readFile(framePath)).toString("base64")}`;
    const stream = client.responses.stream({
        model: SAM_MODEL,
        input: [
            {
                type: "message",
                role: "user",
                content: [
                    { type: "input_text", text: prompt },
                    { type: "input_image", image_url: url, detail: "auto" },
                ],
            },
        ],
    });
    let text = "";
    for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
            text += event.delta;
        }
    }
    const boxes: SegmentBox[] = [];
    const re = /<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)[^|]*\|>/g;
    for (const match of text.matchAll(re)) {
        const x1 = Number(match[1]);
        const y1 = Number(match[2]);
        const x2 = Number(match[3]);
        const y2 = Number(match[4]);
        const w = Number(match[5]);
        const h = Number(match[6]);
        if (w === 0 || h === 0 || x2 <= x1 || y2 <= y1) {
            continue;
        }
        boxes.push({
            x: x1 / w,
            y: y1 / h,
            w: (x2 - x1) / w,
            h: (y2 - y1) / h,
        });
    }
    return boxes;
};
export const transcribe = async (wavPath: string): Promise<string> => {
    const form = new FormData();
    form.append("request", new Blob([
        JSON.stringify({
            model: SPEECH_MODEL,
            audioEncoding: "WAV",
            mode: "PUSH_TO_TALK",
        }),
    ], { type: "application/json" }));
    form.append("audio", new Blob([await readFile(wavPath)], { type: "audio/wav" }), "audio.wav");
    const res = await fetch(`${process.env.META_API_BASE_URL ?? "https://api.meta.ai/v1"}/asr/transcribe`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.MODEL_API_KEY ?? process.env.META_API_KEY ?? ""}`,
            Accept: "application/json",
        },
        signal: AbortSignal.timeout(90000),
        body: form,
    });
    if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`meta /asr/transcribe ${res.status}: ${errorText.slice(0, 500)}`);
    }
    const raw: unknown = await res.json();
    const transcript = typeof raw === "string"
        ? raw
        : ((raw as {
            transcript?: string;
            text?: string;
        }).transcript ??
            (raw as {
                text?: string;
            }).text ??
            "");
    return transcript.trim();
};
export const describeChunk = async (transcript: string, framePaths: string[]): Promise<string> => {
    const images = await Promise.all(framePaths.map(async (path) => ({
        type: "image_url" as const,
        image_url: {
            url: `data:image/jpeg;base64,${(await readFile(path)).toString("base64")}`,
        },
    })));
    const raw = await client.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
            { role: "system", content: describeSystemPrompt() },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `The user's spoken words in this chunk (may be empty):\n"""\n${transcript}\n"""`,
                    },
                    ...images,
                ],
            },
        ],
        temperature: 0,
    });
    return raw.choices?.[0]?.message?.content ?? "";
};
export const intentPlan = async (transcript: string, now: string, tz: string): Promise<string> => {
    const raw = await client.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
            { role: "system", content: intentSystemPrompt({ now, tz }) },
            { role: "user", content: `The command was:\n"""${transcript}"""` },
        ],
        temperature: 0,
    });
    return raw.choices?.[0]?.message?.content ?? "";
};
export const summarizeCapture = async (content: string): Promise<string> => {
    const raw = await client.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
            { role: "system", content: summarySystemPrompt() },
            { role: "user", content },
        ],
        temperature: 0,
    });
    return raw.choices?.[0]?.message?.content ?? "";
};
