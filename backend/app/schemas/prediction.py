from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.config import get_settings

EXAMPLE = "Congratulations! You've won a free iPhone. Click now."


def _validate_text(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("Message text must not be empty")
    limit = get_settings().max_message_chars
    if len(v) > limit:
        raise ValueError(f"Message exceeds {limit} characters")
    return v


class CompareRequest(BaseModel):
    text: str = Field(..., description="Raw message to classify", examples=[EXAMPLE])
    mode: Literal["hybrid", "ml"] = Field(
        "hybrid", description="'ml' uses the model alone; 'hybrid' adds capped threat-signal log-odds"
    )

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        return _validate_text(v)


class PredictRequest(CompareRequest):
    model: str | None = Field(None, description="Model key from GET /models (defaults to random_forest)")


class ModelRef(BaseModel):
    key: str
    name: str
    family: str


class Contribution(BaseModel):
    feature: str
    kind: str
    value: float
    contribution: float
    direction: Literal["spam", "ham"]


class ThreatSignal(BaseModel):
    id: str
    label: str
    detected: bool
    detail: str
    severity: Literal["low", "medium", "high"]
    weight: float


class PredictResponse(BaseModel):
    label: Literal["spam", "ham"]
    is_spam: bool
    spam_probability: float
    ml_probability: float
    heuristic_boost: float
    mode: Literal["hybrid", "ml"]
    confidence: float
    threshold: float
    risk_level: Literal["low", "elevated", "high", "critical"]
    model: ModelRef
    cleaned_text: str
    contributions: list[Contribution]
    signals: list[ThreatSignal]
    explanation: str
    latency_ms: float


class ModelVote(BaseModel):
    key: str
    name: str
    spam_probability: float
    ml_probability: float
    threshold: float
    label: Literal["spam", "ham"]


class CompareResponse(BaseModel):
    votes: list[ModelVote]
    spam_votes: int
    total: int
    consensus: Literal["spam", "ham"]
