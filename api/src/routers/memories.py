from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row
from src.db import pool
from src.deps import current_user
from src.schemas import MemoryOut
from src.services import storage

router = APIRouter(prefix="/memories", tags=["memories"])

_SELECT = """
SELECT m.id, m.note, m.description, m.transcript, m.tags, m.lat, m.lng, m.occurred_at,
  (SELECT id FROM media WHERE memory_id = m.id AND kind = 'thumbnail' LIMIT 1) AS thumbnail_id,
  (SELECT id FROM media WHERE memory_id = m.id AND kind = 'mask' LIMIT 1) AS mask_id
FROM memories m
"""


def to_out(r: dict) -> dict:
    r["thumbnail_url"] = f"/media/{r.pop('thumbnail_id')}" if r["thumbnail_id"] else None
    r["mask_url"] = f"/media/{r.pop('mask_id')}" if r["mask_id"] else None
    return r


@router.get("", response_model=list[MemoryOut])
def list_memories(
    limit: int = Query(30, ge=1, le=100),
    before: datetime | None = None,
    tag: str | None = None,
    user=Depends(current_user),
):
    with pool.connection() as conn:
        rows = conn.cursor(row_factory=dict_row).execute(
            _SELECT + """
            WHERE m.user_id = %(u)s
              AND (%(before)s::timestamptz IS NULL OR m.occurred_at < %(before)s)
              AND (%(tag)s::text IS NULL OR %(tag)s = ANY(m.tags))
            ORDER BY m.occurred_at DESC LIMIT %(limit)s""",
            {"u": user["id"], "before": before, "tag": tag, "limit": limit},
        ).fetchall()
    return [to_out(r) for r in rows]


@router.get("/{memory_id}", response_model=MemoryOut)
def get_memory(memory_id: UUID, user=Depends(current_user)):
    with pool.connection() as conn:
        row = conn.cursor(row_factory=dict_row).execute(
            _SELECT + "WHERE m.id = %s AND m.user_id = %s", (memory_id, user["id"])
        ).fetchone()
    if not row:
        raise HTTPException(404, "Memory not found")
    return to_out(row)


@router.delete("/{memory_id}", status_code=204)
def delete_memory(memory_id: UUID, user=Depends(current_user)):
    with pool.connection() as conn:
        cur = conn.cursor(row_factory=dict_row)
        keys = [r["storage_key"] for r in cur.execute(
            "SELECT storage_key FROM media WHERE memory_id = %s AND user_id = %s",
            (memory_id, user["id"])).fetchall()]
        deleted = cur.execute(
            "DELETE FROM memories WHERE id = %s AND user_id = %s RETURNING id",
            (memory_id, user["id"])).fetchone()
        if not deleted:
            raise HTTPException(404, "Memory not found")
    storage.delete_many(keys)  # only after the DB commit


@router.delete("", status_code=204)
def delete_all(user=Depends(current_user)):
    with pool.connection() as conn:
        cur = conn.cursor(row_factory=dict_row)
        keys = [r["storage_key"] for r in cur.execute(
            "SELECT storage_key FROM media WHERE user_id = %s", (user["id"],)).fetchall()]
        for table in ("memories", "captures", "reminders", "daily_recaps"):
            cur.execute(f"DELETE FROM {table} WHERE user_id = %s", (user["id"],))
    storage.delete_many(keys)
    storage.delete_prefix("tmp")