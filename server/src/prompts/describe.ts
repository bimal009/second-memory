// Per-chunk vision/understanding prompt (impl.md 3.1). One Muse Spark call
// per processed chunk: transcript + kept frames -> strict ChunkUnderstanding.
export type DescribePromptInput = {
  /** Transcript of the chunk's audio, may be empty (no speech). */
  transcript: string;
};

export const describeSystemPrompt = (): string =>
  `
You condense one chunk of a continuous, first-person wearable capture (the phone stands in for Meta AI glasses).
You receive the user's spoken words in this chunk (may be empty) and up to 8 sampled frames (one every 4 seconds, so frames alone skip visually identical moments — do not read anything into sampling gaps).

Return ONLY a JSON object of this exact shape:
{
  "note": "one sentence, past tense, third person ('The user parked the car.')",
  "tags": ["lowercase", "keywords"],
  "objects": ["lowercase", "nouns"],
  "commitments": [{"text":"...","due_at":"ISO-8601 or null"}]
}

Rules:
- "note" describes what happened in this chunk as a memory: events, places, people, actions. Combine speech and frames into one view; the transcript says what the user DID or SAID, the frames show what they SAW. Prefer the more informative moment, not a transcript of both.
- "tags": 2-5 lowercase keywords for recall (place names, object types, activity).
- "objects": only objects you can clearly see in the frames (passport, keys, laptop, car). List each object once. Wrong sightings are worse than missing ones — when unsure, leave it out. Never list people by name.
- "commitments": promises or plans the user says out loud ("I'll send the file tomorrow", "let's meet at 5"). Extract text plus a resolved due time if the words state one; null when no time is stated. An empty array if none.
- Do not mention the camera, frames, or the recording. Do not speculate about things not visible or spoken.
- Output raw JSON only: no markdown, no commentary.
`.trim();
