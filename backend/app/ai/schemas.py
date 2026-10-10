from typing import Literal

from pydantic import BaseModel

Locale = Literal["ar", "fr", "en"]


class InsightsRequest(BaseModel):
    locale: Locale = "ar"


class Insight(BaseModel):
    title: str
    text: str
    tone: Literal["positive", "warning", "info"] = "info"


class InsightsResponse(BaseModel):
    source: Literal["deepseek", "demo"]
    model: str | None = None
    notice: str | None = None  # why we fell back to demo mode, if we did
    insights: list[Insight]
