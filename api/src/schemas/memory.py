from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MemoryOut(BaseModel):
    id: UUID
    note: str
    description: str | None
    transcript: str | None
    tags: list[str]
    lat: float | None
    lng: float | None
    occurred_at: datetime
    thumbnail_url: str | None = None
    mask_url: str | None = None
