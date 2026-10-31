import { and, cosineDistance, eq, isNotNull, sql } from "drizzle-orm";
import { join } from "node:path";
import {
  ASK_COSINE_DISTANCE_MAX,
  ASK_RRF_K,
  ASK_TOP_K,
  ASK_USUALLY_MIN_SIGHTINGS,
  type AskAnswer,
  type AskHighlight,
} from "@repo/types";
import { db } from "../db/index";
import { memories, objects } from "../db/schema";
import { embed } from "./embed";
import { chat, segment, vision } from "./meta";
import { STORAGE_ROOT } from "./storage";

export type AskAnswerFrame = { media_id: string; thumbnail_id: string | null; offset_ms: number | null };
type Hit = { id: string; note: string; occurredAt: Date };

async function frameCitation(memoryId: string): Promise<{ frame: AskAnswerFrame; frameKey: string } | null> {
  const frame = await db.query.media.findFirst({
    where: { memoryId, kind: "frame" },
    orderBy: { offsetMs: "asc" },
    columns: { id: true, offsetMs: true, storageKey: true },
    with: { children: { where: { kind: "thumbnail" }, columns: { id: true } } },
  });
  if (!frame) return null;
  return {
    frame: {
      media_id: frame.id,
      thumbnail_id: frame.children[0]?.id ?? null,
      offset_ms: frame.offsetMs,
    },
    frameKey: frame.storageKey,
  };
}

export async function locateHighlight(frameKey: string, prompt: string): Promise<AskHighlight | null> {
  const abs = join(STORAGE_ROOT, frameKey);
  const promptShort = prompt.slice(0, 120);
  try {
    const boxes = await segment(abs, promptShort);
    if (boxes[0]) return { ...boxes[0], approx: false };
  }
  catch (err) {
    console.warn(`[ask] SAM highlight failed: ${err instanceof Error ? err.message : err}`);
  }
  try {
    const raw = await vision(abs, [
      'Find this in the image: "' + promptShort + '"',
      "A face must be located when the frame shows a person (privacy) and the subject itself is absent.",
      "If nothing above fits, return x=0,y=0,w=0,h=0.",
      'Return ONLY a JSON object like {"x":0.31,"y":0.22,"w":0.2,"h":0.4} with values in 0..1.',
    ].join("\n"));
    const parsed = JSON.parse(
      raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(),
    ) as { x?: number; y?: number; w?: number; h?: number };
    if (
      !parsed.x ||
      !parsed.y ||
      !parsed.w ||
      !parsed.h ||
      parsed.x === 0 ||
      parsed.w === 0
    ) {
      return null;
    }
    return {
      x: parsed.x,
      y: parsed.y,
      w: parsed.w,
      h: parsed.h,
      approx: true,
    };
  } catch {
    return null;
  }
}

async function objectAnswer(userId: string, question: string): Promise<{ answer: AskAnswer; label: string } | null> {
  const labels = await db.query.objects.findMany({
    where: { userId },
    columns: { label: true },
    with: {
      sightings: {
        orderBy: { seenAt: "desc" },
        columns: { memoryId: true, seenAt: true },
        with: { memory: { columns: { lat: true, lng: true } } },
      },
    },
  });

  const words = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  const found = labels
    .filter((o) => words.includes(o.label) && o.sightings.length > 0)
    .filter((o) => o.sightings[0].memory.lat !== null)
    .sort((a, b) => (a.sightings[0].seenAt < b.sightings[0].seenAt ? 1 : -1));
  const object = found[0];
  if (!object) return null;

  const last = object.sightings[0];
  const when = last.seenAt.toISOString();
  const answer =
    object.sightings.length >= ASK_USUALLY_MIN_SIGHTINGS
      ? `Last seen ${when}. It usually shows up around there too.`
      : `Last seen ${when}.`;

  return {
    answer: {
      question,
      known: true,
      answer,
      memory_id: last.memoryId,
      frame: null,
      highlight: null,
      lat: last.memory.lat,
      lng: last.memory.lng,
      last_seen_at: when,
      usually_here: object.sightings.length >= ASK_USUALLY_MIN_SIGHTINGS,
    },
    label: object.label,
  };
}

export async function hybridSearch(
  userId: string,
  question: string,
): Promise<(Hit & { score: number })[]> {
  const embedding = await embed(question);
  const distance = cosineDistance(memories.embedding, embedding);
  const [vec, lex] = await Promise.all([
    db
      .select({ id: memories.id, note: memories.note, occurredAt: memories.occurredAt, distance })
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.status, "ready"),
          isNotNull(memories.embedding),
        ),
      )
      .orderBy(distance)
      .limit(ASK_TOP_K),
    db
      .select({ id: memories.id, note: memories.note, occurredAt: memories.occurredAt })
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.status, "ready"),
          sql`${memories.search} @@ plainto_tsquery('english', ${question})`,
        ),
      )
      .orderBy(sql`ts_rank(${memories.search}, plainto_tsquery('english', ${question})) desc`)
      .limit(ASK_TOP_K),
  ]);

  const retrieval = vec.filter((h) => Number(h.distance) <= ASK_COSINE_DISTANCE_MAX);
  if (retrieval.length === 0 && lex.length === 0) return [];

  const scores = new Map<string, { hit: Hit; score: number }>();
  for (const list of [retrieval, lex]) {
    list.forEach((hit, i) => {
      const cur = scores.get(hit.id) ?? { hit, score: 0 };
      cur.score += 1 / (ASK_RRF_K + i + 1);
      scores.set(hit.id, cur);
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ ...s.hit, score: s.score }));
}

const noMemory = (question: string): AskAnswer => ({
  question,
  known: false,
  answer: "I have no memory of that.",
  memory_id: null,
  frame: null,
  highlight: null,
  lat: null,
  lng: null,
  last_seen_at: null,
  usually_here: false,
});

export const answerAsk = async (userId: string, question: string): Promise<AskAnswer> => {
  const byObject = await objectAnswer(userId, question);
  if (byObject) {
    const cited = await frameCitation(byObject.answer.memory_id!);
    return {
      ...byObject.answer,
      frame: cited?.frame ?? null,
      highlight: cited ? await locateHighlight(cited.frameKey, byObject.label) : null,
    };
  }

  const hits = await hybridSearch(userId, question);
  if (hits.length === 0) {
    return noMemory(question);
  }

  let composed = `${hits[0].occurredAt.toISOString()}: ${hits[0].note}`;
  try {
    const raw = await chat(
      [
        "Answer the user's question ONLY from these memory notes.",
        "If they do not answer it, set known=false and answer 'I have no memory of that.'",
        'Return ONLY a JSON object like {"known":true,"answer":"..."}.',
        "",
        `Question: ${question}`,
        ...hits.map((h) => `- ${h.occurredAt.toISOString()}: ${h.note}`),
      ].join("\n"),
    );
    const parsed = JSON.parse(
      raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(),
    ) as { known?: boolean; answer?: unknown };
    if (parsed.known === true && typeof parsed.answer === "string" && parsed.answer.length > 0) {
      composed = parsed.answer;
    } else {
      return noMemory(question);
    }
  } catch {
    composed = `${hits[0].occurredAt.toISOString()}: ${hits[0].note}`;
  }

  const cited = await frameCitation(hits[0].id);
  const memory = await db.query.memories.findFirst({
    where: { id: hits[0].id },
    columns: { tags: true },
  });
  return {
    question,
    known: true,
    answer: composed,
    memory_id: hits[0].id,
    frame: cited?.frame ?? null,
    highlight: cited ? await locateHighlight(cited.frameKey, memory?.tags[0] ?? question) : null,
    lat: null,
    lng: null,
    last_seen_at: hits[0].occurredAt.toISOString(),
    usually_here: false,
  };
};
