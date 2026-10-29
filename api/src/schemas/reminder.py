from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


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
