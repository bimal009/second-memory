from typing import Annotated
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


class MeOut(BaseModel):
    id: UUID
    assistant_name: str
    timezone: str


class MeOnboard(BaseModel):
    assistant_name: str = Field(min_length=1, max_length=30)
    timezone: Timezone = "UTC"


class MeOnboardOut(BaseModel):
    user_id: UUID
    assistant_name: str
    timezone: str
    api_key: str


class MePatch(BaseModel):
    assistant_name: str | None = Field(None, min_length=1, max_length=30)
    timezone: Timezone | None = None
