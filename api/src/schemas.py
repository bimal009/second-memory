from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import AfterValidator, BaseModel, Field


def _check_tz(v: str) -> str:
    try:
        ZoneInfo(v)
    except Exception:
        raise ValueError("Unknown timezone")
    return v


Timezone = Annotated[str, AfterValidator(_check_tz)]


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


class ReminderIn(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    due_at: datetime


class ReminderPatch(BaseModel):
    status: Literal["pending", "done", "dismissed"]


class ReminderOut(BaseModel):
    id: UUID
    text: str
    due_at: datetime
    status: str
    memory_id: UUID | None


class MeOut(BaseModel):
    id: UUID
    assistant_name: str
    timezone: str


class MeOnboard(BaseModel):
    assistant_name: str = Field(min_length=1, max_length=30)
    timezone: Timezone = "UTC"


class MePatch(BaseModel):
    assistant_name: str | None = Field(None, min_length=1, max_length=30)
    timezone: Timezone | None = None


class DeviceIn(BaseModel):
    push_token: str = Field(min_length=10, max_length=200)
    platform: Literal["android", "ios"]


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