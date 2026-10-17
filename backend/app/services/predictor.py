from __future__ import annotations

import math
import threading
import time
from functools import lru_cache
from pathlib import Path
from typing import Literal

import joblib
from sklearn.pipeline import Pipeline

from app.core.config import get_settings
from app.services.artifact_store import ArtifactStore, get_artifact_store
from app.services.signals import extract_signals, heuristic_logit
from ml.explain import LinearExplainer
from ml.preprocessing import clean_text

Mode = Literal["hybrid", "ml"]
EPS = 1e-4


class ModelUnavailableError(RuntimeError):
    pass


class UnknownModelError(KeyError):
    pass


def risk_level(p: float) -> str:
    if p >= 0.9:
        return "critical"
    if p >= 0.6:
        return "high"
    if p >= 0.3:
        return "elevated"
    return "low"


def combine(ml_p: float, boost: float) -> float:
    p = min(max(ml_p, EPS), 1 - EPS)
    return 1 / (1 + math.exp(-(math.log(p / (1 - p)) + boost)))


class Predictor:
    """Lazily loads persisted pipelines and produces explained predictions for raw messages."""

    def __init__(self, store: ArtifactStore, model_dir: Path, default_model: str):
        self.store = store
        self.model_dir = model_dir
        self.default_model = default_model
        self._models: dict[str, Pipeline] = {}
        self._explainer: LinearExplainer | None = None
        self._lock = threading.Lock()

    def catalog(self) -> dict[str, dict]:
        return {m["key"]: m for m in self.store.get("models")["models"]}

    def _load(self, key: str) -> Pipeline:
        with self._lock:
            if key not in self._models:
                path = self.model_dir / f"{key}.joblib"
                if not path.exists():
                    raise ModelUnavailableError(f"Model file {path.name} is missing. Run `make train`.")
                self._models[key] = joblib.load(path)
            return self._models[key]

    def _load_explainer(self) -> LinearExplainer | None:
        with self._lock:
            if self._explainer is None:
                path = self.model_dir / "linear_explainer.joblib"
                if path.exists():
                    self._explainer = joblib.load(path)
            return self._explainer

    def _score(self, key: str, text: str, signals: list[dict], mode: Mode) -> tuple[float, float, float]:
        ml_p = float(self._load(key).predict_proba([text])[0, 1])
        boost = heuristic_logit(signals) if mode == "hybrid" else 0.0
        return ml_p, boost, combine(ml_p, boost) if boost else ml_p

    def predict(self, text: str, model_key: str | None = None, mode: Mode = "hybrid") -> dict:
        key = model_key or self.default_model
        catalog = self.catalog()
        if key not in catalog:
            raise UnknownModelError(key)
        meta = catalog[key]
        threshold = float(meta.get("threshold", 0.5))

        start = time.perf_counter()
        signals = extract_signals(text)
        ml_p, boost, p_spam = self._score(key, text, signals, mode)
        latency_ms = (time.perf_counter() - start) * 1000

        is_spam = p_spam >= threshold
        confidence = p_spam if is_spam else 1 - p_spam
        contributions = self._contributions(self._load(key), text)
        flipped = mode == "hybrid" and (ml_p >= threshold) != is_spam

        return {
            "label": "spam" if is_spam else "ham",
            "is_spam": is_spam,
            "spam_probability": round(p_spam, 4),
            "ml_probability": round(ml_p, 4),
            "heuristic_boost": round(boost, 3),
            "mode": mode,
            "confidence": round(confidence, 4),
            "threshold": threshold,
            "risk_level": risk_level(p_spam),
            "model": {"key": key, "name": meta["name"], "family": meta["family"]},
            "cleaned_text": clean_text(text),
            "contributions": contributions,
            "signals": signals,
            "explanation": self._summarize(is_spam, confidence, meta["name"], contributions, signals, flipped),
            "latency_ms": round(latency_ms, 2),
        }

    def compare(self, text: str, mode: Mode = "hybrid") -> list[dict]:
        signals = extract_signals(text)
        out = []
        for key, meta in self.catalog().items():
            ml_p, _, p = self._score(key, text, signals, mode)
            t = float(meta.get("threshold", 0.5))
            out.append(
                {
                    "key": key,
                    "name": meta["name"],
                    "spam_probability": round(p, 4),
                    "ml_probability": round(ml_p, 4),
                    "threshold": t,
                    "label": "spam" if p >= t else "ham",
                }
            )
        return out

    def _contributions(self, pipe: Pipeline, text: str) -> list[dict]:
        explainer = self._load_explainer()
        if explainer is None:
            return []
        x = pipe[:-1].transform([text])
        return explainer.explain_row(x, top_k=10)

    @staticmethod
    def _summarize(
        is_spam: bool,
        confidence: float,
        model_name: str,
        contribs: list[dict],
        signals: list[dict],
        flipped: bool,
    ) -> str:
        hits = [s["label"].lower() for s in signals if s["detected"]]
        drivers = [c["feature"] for c in contribs if c["direction"] == ("spam" if is_spam else "ham")][:3]
        pct = f"{confidence:.0%}" if confidence < 0.995 else f"{math.floor(confidence * 1000) / 10}%"
        quoted = ", ".join(f"“{d}”" for d in drivers)

        if is_spam:
            lead = f"Classified as spam with {pct} confidence."
            why = f" The strongest learned spam indicators were {quoted}." if drivers else ""
            sig = f" Threat signals present: {', '.join(hits)}." if hits else ""
            drift = (
                f" {model_name} alone scored it below the spam threshold; the threat-signal layer escalated it "
                "because these patterns are under-represented in the 2011 training corpus."
                if flipped
                else ""
            )
            return lead + why + sig + drift + " Treat any links or numbers in it as untrusted."

        lead = f"Classified as legitimate (ham) with {pct} confidence."
        why = f" Conversational terms such as {quoted} pushed {model_name} toward ham." if drivers else ""
        sig = (
            f" It still contains {', '.join(hits)}, so stay cautious if it came from an unknown sender."
            if hits
            else " No common threat signals were found."
        )
        return lead + why + sig


@lru_cache
def get_predictor() -> Predictor:
    settings = get_settings()
    return Predictor(get_artifact_store(), settings.artifacts_dir / "models", settings.default_model)
