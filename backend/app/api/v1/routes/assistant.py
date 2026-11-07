from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.services.assistant import answer, rate_limiter

router = APIRouter(tags=["assistant"])


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class AssistantRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    history: list[Turn] = Field(default_factory=list, max_length=12)


class Source(BaseModel):
    title: str
    link: str = ""


class AssistantResponse(BaseModel):
    answer: str
    sources: list[Source]
    topic: str | None
    mode: Literal["local", "gemini"]


@router.post("/assistant", response_model=AssistantResponse)
def ask(req: AssistantRequest, request: Request) -> dict:
    client = request.headers.get("x-forwarded-for", request.client.host if request.client else "anon").split(",")[0]
    if not rate_limiter.allow(client):
        raise HTTPException(429, "Too many questions; please wait a minute.")
    return answer(req.question.strip(), [t.model_dump() for t in req.history[-6:]])
