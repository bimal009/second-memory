import logging
from uuid import UUID
from src.db import pool

log = logging.getLogger("pipeline")


def process_capture(capture_id: UUID) -> None:
    try:
        # TODO ffmpeg split into audio + key frames (media.py)
        # TODO transcribe, describe, embed, insert memory + media rows
        log.info("process_capture %s (stub)", capture_id)
    except Exception as e:
        log.exception("capture %s failed", capture_id)
        with pool.connection() as conn:
            conn.execute(
                "UPDATE captures SET status='failed', error=%s, processed_at=now() WHERE id=%s",
                (str(e)[:500], capture_id),
            )