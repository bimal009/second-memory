import { and, cosineDistance, eq, isNotNull, sql } from "drizzle-orm";
import {
  ASK_COSINE_DISTANCE_MAX,
  ASK_RRF_K,
  ASK_TOP_K,
  ASK_USUALLY_MIN_SIGHTINGS,
  type AskAnswer,
} from "@repo/types";
import { db } from "../db/index";
import { memories, objects } from "../db/schema";
import { embed } from "./embed";
import { chat } from "./meta";

async function frameCitation(memoryId: string): Promise<AskAnswer["frame"]> {
  const frame = await db.query.media.findFirst({
    where: { memoryId, kind: "frame" },
    orderBy: { offsetMs: "asc" },
    columns: { id: true, offsetMs: true },
    with: { children: { where: { kind: "thumbnail" }, columns: { id: true } } },
  });
  if (!frame) return null;
  return {
    media_id: frame.id,
    thumbnail_id: frame.children[0]?.id ?? null,
    offset_ms: frame.offsetMs,
  };
}

async function objectAnswer(userId: string, question: string): Promise<AskAnswer | null> {
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
    question,
    known: true,
    answer,
    memory_id: last.memoryId,
    frame: null,
    lat: last.memory.lat,
    lng: last.memory.lng,
    last_seen_at: when,
    usually_here: object.sightings.length >= ASK_USUALLY_MIN_SIGHTINGS,
  };
}

type Hit = { id: string; note: string; occurredAt: Date };

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
  lat: null,
  lng: null,
  last_seen_at: null,
  usually_here: false,
});

export const answerAsk = async (userId: string, question: string): Promise<AskAnswer> => {
  const byObject = await objectAnswer(userId, question);
  if (byObject) {
    return { ...byObject, frame: await frameCitation(byObject.memory_id!) };
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

  return {
    question,
    known: true,
    answer: composed,
    memory_id: hits[0].id,
    frame: await frameCitation(hits[0].id),
    lat: null,
    lng: null,
    last_seen_at: hits[0].occurredAt.toISOString(),
    usually_here: false,
  };
};
