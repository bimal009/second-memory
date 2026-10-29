import json
from datetime import datetime
from pathlib import Path
from uuid import UUID, uuid4
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from psycopg.rows import dict_row
from pydantic import ValidationError
from src.config import settings
from src.db import pool
from src.deps import current_user
from src.schemas import CaptureAccepted, CapturePlan, CaptureStatus
from src.services import storage
from src.services.pipeline import process_capture

router = APIRouter(tags=["capture"])
ALLOWED = {".mp4", ".mov", ".m4a", ".aac", ".wav", ".webm", ".jpg", ".jpeg", ".png"}
MAX_FILES = 20


@router.post("/capture", status_code=202, response_model=CaptureAccepted)
def create_capture(
    background: BackgroundTasks,
    plan: str = Form(...),
    command_text: str | None = Form(None, max_length=1000),
    lat: float | None = Form(None, ge=-90, le=90),
    lng: float | None = Form(None, ge=-180, le=180),
    accuracy_m: float | None = Form(None),
    clip_start: datetime | None = Form(None),
    clip_end: datetime | None = Form(None),
    files: list[UploadFile] = File(...),
    user=Depends(current_user),
):
    try:
        parsed = CapturePlan.model_validate_json(plan)
    except ValidationError as e:
        raise HTTPException(422, json.loads(e.json()))
    if not files or len(files) > MAX_FILES:
        raise HTTPException(422, f"Send 1-{MAX_FILES} files")

    capture_id = uuid4()
    total, limit = 0, settings.max_upload_mb * 1024 * 1024
    try:
        for i, f in enumerate(files):
            ext = Path(f.filename or "").suffix.lower()
            if ext not in ALLOWED:
                raise HTTPException(415, f"Unsupported file type: {ext or 'none'}")
            total += storage.save_stream(f"tmp/{capture_id}/{i:03d}{ext}", f.file)
            if total > limit:
                raise HTTPException(413, "Upload too large")
    except Exception:
        storage.delete_prefix(f"tmp/{capture_id}")
        raise

    with pool.connection() as conn:
        conn.execute(
            """INSERT INTO captures (id, user_id, command_text, plan, clip_start, clip_end,
                                     lat, lng, accuracy_m)
               VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s)""",
            (capture_id, user["id"], command_text, parsed.model_dump_json(),
             clip_start, clip_end, lat, lng, accuracy_m),
        )
    background.add_task(process_capture, capture_id)
    return {"id": capture_id, "status": "processing"}


@router.get("/captures/{capture_id}", response_model=CaptureStatus)
def get_capture(capture_id: UUID, user=Depends(current_user)):
    with pool.connection() as conn:
        row = conn.cursor(row_factory=dict_row).execute(
            "SELECT id, status, error FROM captures WHERE id = %s AND user_id = %s",
            (capture_id, user["id"]),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Capture not found")
    return row