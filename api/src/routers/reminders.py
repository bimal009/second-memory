from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row
from src.db import pool
from src.deps import current_user
from src.schemas import ReminderIn, ReminderOut, ReminderPatch

router = APIRouter(prefix="/reminders", tags=["reminders"])
COLS = "id, text, due_at, status, memory_id"


@router.get("", response_model=list[ReminderOut])
def list_reminders(status: str | None = Query(None, pattern="^(pending|sent|done|dismissed)$"),
                   user=Depends(current_user)):
    with pool.connection() as conn:
        return conn.cursor(row_factory=dict_row).execute(
            f"""SELECT {COLS} FROM reminders
                WHERE user_id = %s AND (%s::text IS NULL OR status = %s)
                ORDER BY due_at LIMIT 200""",
            (user["id"], status, status),
        ).fetchall()


@router.post("", status_code=201, response_model=ReminderOut)
def create_reminder(body: ReminderIn, user=Depends(current_user)):
    with pool.connection() as conn:
        return conn.cursor(row_factory=dict_row).execute(
            f"INSERT INTO reminders (user_id, text, due_at) VALUES (%s, %s, %s) RETURNING {COLS}",
            (user["id"], body.text, body.due_at),
        ).fetchone()


@router.patch("/{reminder_id}", response_model=ReminderOut)
def patch_reminder(reminder_id: UUID, body: ReminderPatch, user=Depends(current_user)):
    with pool.connection() as conn:
        row = conn.cursor(row_factory=dict_row).execute(
            f"UPDATE reminders SET status = %s WHERE id = %s AND user_id = %s RETURNING {COLS}",
            (body.status, reminder_id, user["id"]),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Reminder not found")
    return row


@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: UUID, user=Depends(current_user)):
    with pool.connection() as conn:
        row = conn.execute(
            "DELETE FROM reminders WHERE id = %s AND user_id = %s RETURNING id",
            (reminder_id, user["id"]),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Reminder not found")