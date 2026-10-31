import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { devices } from "../db/schema";

export async function sendPush(userId: string, title: string, body: string): Promise<void> {
    const rows = await db
        .select({ pushToken: devices.pushToken })
        .from(devices)
        .where(eq(devices.userId, userId));
    const tokens = rows.map((r) => r.pushToken).filter((t): t is string => !!t);
    if (tokens.length === 0) {
        return;
    }
    try {
        await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tokens.map((to) => ({
                to,
                title,
                body,
                sound: "default",
            }))),
            signal: AbortSignal.timeout(10000),
        });
    }
    catch (err) {
        console.warn(`[push] send failed: ${err instanceof Error ? err.message : err}`);
    }
}
