import { config } from "dotenv";
config({ path: ".env" });
import { eq } from "drizzle-orm";
import { db, closeDb } from "../src/db/index";
import { users, captures, memories } from "../src/db/schema";
import { hybridSearch } from "../src/lib/ask";
import { embed } from "../src/lib/embed";
import { hashApiKey } from "../src/lib/hash";

type Case = { question: string; expectNote?: string };

const caseList: Case[] = [
    { question: "where did I park my car?", expectNote: "blue sedan parked by gate B" },
    { question: "who brought the camembert?", expectNote: "Camembert arrived from Switzerland" },
    { question: "did I ever see the whale skeleton?", expectNote: "Whale skeleton in London museum" },
    { question: "quantum computing stock prices" },
    { question: "recipe for tiramisu" },
];

const seedNotes = [
    ...caseList.filter((c) => c.expectNote).map((c) => c.expectNote!),
    "posters in the lab basement",
];

async function main() {
    const [user] = await db
        .insert(users)
        .values({ assistantName: "Muse", timezone: "UTC", apiKeyHash: hashApiKey(crypto.randomUUID()) })
        .returning({ id: users.id });
    const [capture] = await db
        .insert(captures)
        .values({ userId: user!.id, status: "ready" })
        .returning({ id: captures.id });
    for (const [i, note] of seedNotes.entries()) {
        await db.insert(memories).values({
            userId: user!.id,
            captureId: capture!.id,
            kind: "session_chunk",
            status: "ready",
            note,
            embedding: await embed(`${note} ${i}`),
            occurredAt: new Date(Date.now() - (seedNotes.length - i) * 3600_000),
        });
    }

    let hits = 0;
    for (const c of caseList) {
        const ranked = await hybridSearch(user!.id, c.question);
        const ok = c.expectNote ? ranked[0]?.note === c.expectNote : ranked.length === 0;
        if (ok) hits++;
        const hit = ranked[0];
        console.log(
            `${ok ? "PASS" : "FAIL"}  "${c.question}"  ->  "${hit?.note ?? "(nothing found)"}" (rrf ${hit ? hit.score.toFixed(4) : "-"})`,
        );
    }
    console.log(`retrieval eval: ${hits}/${caseList.length}`);

    await db.delete(users).where(eq(users.id, user!.id));
};

main();
