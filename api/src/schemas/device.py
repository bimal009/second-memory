from typing import Literal

from pydantic import BaseModel, Field


class DeviceIn(BaseModel):
    push_token: str = Field(min_length=10, max_length=200)
    platform: Literal["android", "ios"]
