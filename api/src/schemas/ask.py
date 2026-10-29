from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class Citation(BaseModel):
    memory_id: UUID
    note: str
    occurred_at: datetime
    thumbnail_url: str | None = None
    mask_url: str | None = None
    lat: float | None = None
    lng: float | None = None


class AskOut(BaseModel):
    found: bool
    answer: str
    citations: list[Citation] = []
