import { readFile } from "node:fs/promises";
import OpenAI from "openai";
import { describeSystemPrompt } from "../prompts/describe";
import { summarySystemPrompt } from "../prompts/summary";

// Meta Model API is OpenAI-compatible (OpenAI SDK against their base URL):
// https://api.meta.ai/v1 — chat, vision via /chat/completions.
const client = new OpenAI({
  baseURL: process.env.META_API_BASE_URL ?? "https://api.meta.ai/v1",
  apiKey: process.env.MODEL_API_KEY ?? process.env.META_API_KEY ?? "",
  timeout: 90_000,
});

const CHAT_MODEL = process.env.CHAT_MODEL ?? "muse-spark-1.3";
const SPEECH_MODEL = process.env.SPEECH_MODEL ?? "muse-voice-transcribe-1.0";

/** Basic text chat: prompt in, completion text out. */
export const chat = async (prompt: string): Promise<string> => {
  const raw = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });
  return raw.choices?.[0]?.message?.content ?? "";
};

/** Basic vision: one image (file path, data URL, or raw base64), question in, answer out. */
export const vision = async (
  frame: string,
  question = "Describe the scene in one short sentence.",
): Promise<string> => {
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

/**
 * Basic audio: 16 kHz mono WAV path in, transcript text out. The ASR
 * endpoint has no OpenAI SDK surface, so it stays raw multipart.
 */
export const transcribe = async (wavPath: string): Promise<string> => {
  const form = new FormData();
  form.append(
    "request",
    new Blob(
      [
        JSON.stringify({
          model: SPEECH_MODEL,
          audioEncoding: "WAV",
          mode: "PUSH_TO_TALK",
        }),
      ],
      { type: "application/json" },
    ),
  );
  form.append(
    "audio",
    new Blob([await readFile(wavPath)], { type: "audio/wav" }),
    "audio.wav",
  );
  const res = await fetch(
    `${process.env.META_API_BASE_URL ?? "https://api.meta.ai/v1"}/asr/transcribe`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MODEL_API_KEY ?? process.env.META_API_KEY ?? ""}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(90_000),
      body: form,
    },
  );
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`meta /asr/transcribe ${res.status}: ${errorText.slice(0, 500)}`);
  }
  const raw: unknown = await res.json();
  const transcript =
    typeof raw === "string"
      ? raw
      : ((raw as { transcript?: string; text?: string }).transcript ??
        (raw as { text?: string }).text ??
        "");
  return transcript.trim();
};

/**
 * One Muse Spark vision call per processed chunk: transcript + all kept
 * frames -> strict ChunkUnderstanding JSON as text (Zod-parsed by the
 * caller with one retry on failure).
 */
export const describeChunk = async (
  transcript: string,
  framePaths: string[],
): Promise<string> => {
  const images = await Promise.all(
    framePaths.map(async (path) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${(await readFile(path)).toString("base64")}`,
      },
    })),
  );

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

/**
 * Capture summary: all chunk notes + transcripts -> strict JSON with the
 * summary, highlights and (time-stated) action items.
 */
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
