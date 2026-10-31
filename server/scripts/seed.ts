import { config } from "dotenv";
config({ path: ".env" });
import { db, closeDb } from "../src/db/index";
import { users, captures } from "../src/db/schema";
import { generateApiKey, hashApiKey } from "../src/lib/hash";

const key = generateApiKey();
const [user] = await db
    .insert(users)
    .values({
        assistantName: process.env.ASSISTANT_NAME ?? "Muse",
        timezone: process.env.DEMO_TIMEZONE ?? "Asia/Kathmandu",
        apiKeyHash: hashApiKey(key),
    })
    .returning({ id: users.id });
await db.insert(captures).values({ userId: user!.id, status: "recording" });

console.log("user_id:", user!.id);
console.log("api_key (sha256 stored):", key);
console.log("put this in the phone app env as X-API-Key; delete the row to reset.");
await closeDb();
