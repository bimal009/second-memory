import { readFile } from "node:fs/promises";

// Meta Model API (OpenAI-compatible): https://api.meta.ai/v1
const BASE_URL = process.env.META_API_BASE_URL ?? "https://api.meta.ai/v1";
const apiKey = process.env.MODEL_API_KEY ?? process.env.META_API_KEY ?? "";
const CHAT_MODEL = process.env.CHAT_MODEL ?? "muse-spark-1.3";
const SPEECH_MODEL = process.env.SPEECH_MODEL ?? "muse-voice-transcribe-1.0";

const post = async (path: string, init: RequestInit): Promise<unknown> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers as Record<string, string> | undefined),
    },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`meta ${path} ${res.status}: ${errorText.slice(0, 500)}`);
  }
  return res.json();
};

/** Basic text chat: prompt in, completion text out. */
export const chat = async (prompt: string): Promise<string> => {
  const raw = (await post("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    }),
  })) as { choices?: { message?: { content?: string } }[] };
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
  const raw = (await post("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
    }),
  })) as { choices?: { message?: { content?: string } }[] };
  return raw.choices?.[0]?.message?.content ?? "";
};

/** Basic audio: 16 kHz mono WAV path in, transcript text out. */
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
  const raw = await post("/asr/transcribe", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  });
  const transcript =
    typeof raw === "string"
      ? raw
      : ((raw as { transcript?: string; text?: string }).transcript ??
        (raw as { text?: string }).text ??
        "");
  return transcript.trim();
};
