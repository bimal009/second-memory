import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { type ApiResponse, type Reminder } from "@repo/types";
import { db } from "../db/index";
import { reminders } from "../db/schema";

type Env = {
    Variables: {
        userId: string;
    };
};

export const remindersRouter = new Hono<Env>();

const statusSchema = z.object({
    status: z.enum(["done", "dismissed"]),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const toReminder = (row: {
    id: string;
    text: string;
    dueAt: Date;
    source: string;
    status: string;
    memoryId: string | null;
    createdAt: Date;
}): Reminder => ({
    id: row.id,
    text: row.text,
    due_at: row.dueAt.toISOString(),
    source: row.source as Reminder["source"],
    status: row.status as Reminder["status"],
    memory_id: row.memoryId,
    created_at: row.createdAt.toISOString(),
});

remindersRouter.get("/", async (c) => {
    const rows = await db
        .select({
            id: reminders.id,
            text: reminders.text,
            dueAt: reminders.dueAt,
            source: reminders.source,
            status: reminders.status,
            memoryId: reminders.memoryId,
            createdAt: reminders.createdAt,
        })
        .from(reminders)
        .where(eq(reminders.userId, c.get("userId")))
        .orderBy(asc(reminders.status), asc(reminders.dueAt));
    return c.json<ApiResponse<Reminder[]>>({
        status: 200,
        message: "OK",
        data: rows.map(toReminder),
        error: null,
    });
});

remindersRouter.patch("/:id", async (c) => {
    const idParse = idParamSchema.safeParse({ id: c.req.param("id") });
    if (!idParse.success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid param",
            data: null,
            error: { code: "INVALID_PARAM", message: idParse.error.message },
        }, 400);
    }
    const bodyParse = statusSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!bodyParse.success) {
        return c.json<ApiResponse<null>>({
            status: 400,
            message: "Invalid body",
            data: null,
            error: { code: "INVALID_BODY", message: bodyParse.error.message },
        }, 400);
    }
    const [row] = await db
        .update(reminders)
        .set({ status: bodyParse.data.status })
        .where(and(eq(reminders.id, idParse.data.id), eq(reminders.userId, c.get("userId"))))
        .returning({
            id: reminders.id,
            text: reminders.text,
            dueAt: reminders.dueAt,
            source: reminders.source,
            status: reminders.status,
            memoryId: reminders.memoryId,
            createdAt: reminders.createdAt,
        });
    if (!row) {
        return c.json<ApiResponse<null>>({
            status: 404,
            message: "Not found",
            data: null,
            error: { code: "REMINDER_NOT_FOUND", message: "reminder not found" },
        }, 404);
    }
    return c.json<ApiResponse<Reminder>>({
        status: 200,
        message: "OK",
        data: toReminder(row),
        error: null,
    });
});
