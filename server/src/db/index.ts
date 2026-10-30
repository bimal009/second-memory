import { neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { config } from "dotenv";
import ws from "ws";
import { relations } from "./schema/relation";

config({ path: ".env" });

neonConfig.webSocketConstructor = ws;

export const db = drizzle({
  connection: process.env.DATABASE_URL!,
  relations,
  ws,
});

export type TransactionClient = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function closeDb(): Promise<void> {
  await db.$client.end();
}
