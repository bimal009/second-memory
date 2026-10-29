from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class Clip(BaseModel):
    pre_seconds: int = Field(20, ge=0, le=120)
    post_seconds: int = Field(10, ge=0, le=60)


class CapturePlan(BaseModel):
    intent: Literal["quick_memory", "reminder", "clarify"] = "quick_memory"
    clip: Clip = Clip()
    location: bool = True
    note: str = Field("", max_length=500)
    tags: list[str] = Field(default_factory=list, max_length=10)
    reminder_due_at: datetime | None = None


class CaptureAccepted(BaseModel):
    id: UUID
    status: str


class CaptureStatus(BaseModel):
    id: UUID
    status: str
    error: str | None = None
