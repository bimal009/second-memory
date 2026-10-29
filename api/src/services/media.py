from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from psycopg.rows import dict_row
from src.db import pool
from src.deps import current_user
from src.services import storage

router = APIRouter(tags=["media"])


@router.get("/media/{media_id}")
def get_media(media_id: UUID, user=Depends(current_user)):
    with pool.connection() as conn:
        row = conn.cursor(row_factory=dict_row).execute(
            "SELECT storage_key FROM media WHERE id = %s AND user_id = %s",
            (media_id, user["id"]),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    path = storage.path_for(row["storage_key"])
    if not path.exists():
        raise HTTPException(404, "File missing")
    return FileResponse(path, headers={"Cache-Control": "private, max-age=86400"})