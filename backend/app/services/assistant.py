"""Answer security questions: TF-IDF retrieval over the knowledge base, optionally rewritten by Gemini."""

from __future__ import annotations

import json
import logging
import os
import re
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from functools import lru_cache

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.services.knowledge import Entry, knowledge_base

log = logging.getLogger(__name__)

MIN_SCORE = 0.08
FOLLOW_UP_RE = re.compile(
    r"^(tell me more|more|go on|continue|explain (that|it|more)|why\??|how\??|what else|example|"
    r"can you elaborate|elaborate|and\??|more detail[s]?|what do you mean|how does (that|it) work\??|"
    r"what about .{0,30})[.!?]*$",
    re.I,
)
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
SYSTEM_PROMPT = (
    "You are Shield, the security assistant on the SpamShield AI course website. Answer computer-security "
    "questions clearly for a non-expert in under 170 words, with practical advice. Use the provided context about "
    "this website's assignments when relevant and do not invent assignment details that are not in the context. "
    "If the question is not about security or this website, briefly say what you can help with. Plain text only, "
    "no markdown headings."
)


class _Index:
    def __init__(self, entries: tuple[Entry, ...]):
        self.entries = entries
        self.vec = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True)
        docs = [f"{e.title} {e.title} {e.tags} {e.tags} {e.answer}" for e in entries]
        self.matrix = self.vec.fit_transform(docs)

    def search(self, query: str, k: int = 3) -> list[tuple[Entry, float]]:
        scores = cosine_similarity(self.vec.transform([query]), self.matrix).ravel()
        order = scores.argsort()[::-1][:k]
        return [(self.entries[i], float(scores[i])) for i in order]


@lru_cache
def _index() -> _Index:
    return _Index(knowledge_base())


def _last_user_turn(history: list[dict]) -> str:
    return next((h["content"] for h in reversed(history) if h["role"] == "user"), "")


def _local(question: str, history: list[dict]) -> dict:
    follow_up = bool(FOLLOW_UP_RE.match(question.strip())) and bool(history)
    query = f"{_last_user_turn(history)} {question}" if follow_up else question
    hits = _index().search(query)
    top, score = hits[0]
    if score < MIN_SCORE:
        return {
            "answer": "I'm not sure about that one. I can explain security topics like phishing, strong passwords, "
            "DoS and DDoS, malware, SQL injection, XSS, MFA, or what to do if you've been hacked, answer "
            "questions about this site's assignments, or control the site (try 'switch to dark mode' or "
            "'play the training video').",
            "sources": [],
            "topic": None,
        }
    answer = top.more if follow_up and top.more else top.answer
    if not follow_up and top.more:
        answer += " Ask 'tell me more' for details."
    return {"answer": answer, "sources": _sources([h for h in hits if h[1] >= MIN_SCORE]), "topic": top.id}


def _sources(hits: list[tuple[Entry, float]]) -> list[dict]:
    return [{"title": e.title, "link": e.link} for e, _ in hits[:3]]


def _gemini(question: str, history: list[dict], key: str) -> str | None:
    hits = _index().search(f"{_last_user_turn(history)} {question}", k=4)
    context = "\n\n".join(f"[{e.title}]\n{e.answer}\n{e.more}" for e, s in hits if s > 0.02)
    contents = [
        {"role": "model" if h["role"] == "assistant" else "user", "parts": [{"text": h["content"]}]}
        for h in history[-6:]
    ]
    contents.append({"role": "user", "parts": [{"text": f"Context:\n{context}\n\nQuestion: {question}"}]})
    body = json.dumps({
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 400},
    }).encode()
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    req = urllib.request.Request(
        GEMINI_URL.format(model=model), data=body, method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            data = json.loads(res.read())
        return "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"]).strip() or None
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, ValueError) as exc:
        log.warning("Gemini request failed, using local answer: %s", exc)
        return None


def answer(question: str, history: list[dict]) -> dict:
    local = _local(question, history)
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        text = _gemini(question, history, key)
        if text:
            return {**local, "answer": text, "mode": "gemini"}
    return {**local, "mode": "local"}


class RateLimiter:
    """Per-client sliding window. In-memory, so it is per server instance (good enough for a demo site)."""

    def __init__(self, limit: int = 20, window_s: float = 60):
        self.limit, self.window = limit, window_s
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, client: str) -> bool:
        now = time.monotonic()
        q = self.hits[client]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True


rate_limiter = RateLimiter()
