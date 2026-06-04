from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .config import PERIOD_MAP, TOPIC_MAP


class DigestRequest(BaseModel):
    division: str = Field(..., description="Business unit")
    topic: str = Field(..., description="Digest topic")
    period: Literal["24h", "7d", "30d"] = Field(..., description="Relative period")
    comment: str = Field(default="", description="Optional user note")

    @field_validator("division")
    @classmethod
    def validate_division(cls, value: str) -> str:
        if value not in TOPIC_MAP:
            raise ValueError("Unknown division")
        return value

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, value: str, info) -> str:
        division = info.data.get("division")
        if division and value not in TOPIC_MAP[division]:
            raise ValueError("Topic does not belong to selected division")
        return value

    @field_validator("period")
    @classmethod
    def validate_period(cls, value: str) -> str:
        if value not in PERIOD_MAP:
            raise ValueError("Unknown period")
        return value


class SourceItem(BaseModel):
    title: str
    url: str
    snippet: str = ""
    published_at: datetime | None = None
    source_name: str = ""
    source_type: str = "web"
    trusted: bool = True


class DigestPlan(BaseModel):
    topic_label: str
    period_label: str
    search_goal: str
    trusted_domains: list[str]
    rss_feeds: list[str]
    telegram_channels: list[str]
    queries: list[str]


class DigestResult(BaseModel):
    markdown: str
    sources: list[SourceItem]
