"""Text cleaning, engineered features, and the shared feature pipeline.

Every model pipeline begins with `FunctionTransformer(build_feature_frame)`, so saved models accept raw
message strings directly. That keeps training-time and inference-time preprocessing identical.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, MinMaxScaler

RANDOM_STATE = 42
TEST_SIZE = 0.2
TFIDF_MAX_FEATURES = 6000
SELECT_K = 3000

URL_RE = re.compile(r"(https?://\S+|www\.\S+|\b\S+\.(?:com|net|org|co\.uk|biz|info)\b\S*)", re.I)
EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]+\b")
PHONE_RE = re.compile(r"\b\d{5,}\b")
CURRENCY_RE = re.compile(r"[£$€]|\b(?:gbp|usd|pounds?|dollars?)\b", re.I)
NUMBER_RE = re.compile(r"\b\d+\b")
NON_ALPHA_RE = re.compile(r"[^a-z\s]")
WS_RE = re.compile(r"\s+")

# Placeholder tokens survive cleaning so the vectorizer can learn from link/phone/currency presence.
SPECIAL_TOKENS = {
    "urltoken": "Contains a URL",
    "emailtoken": "Contains an email address",
    "phonetoken": "Contains a long phone / short-code number",
    "currencytoken": "Mentions money or a currency symbol",
    "numtoken": "Contains a number",
}

STOP_WORDS = frozenset(ENGLISH_STOP_WORDS) - {"free", "call", "now"}

META_FEATURES: dict[str, str] = {
    "char_length": "Total characters in the message",
    "word_count": "Number of whitespace-separated tokens",
    "digit_count": "Number of digit characters",
    "uppercase_ratio": "Share of letters that are uppercase",
    "exclamation_count": "Number of '!' characters",
    "special_char_count": "Non-alphanumeric, non-space characters",
    "has_url": "1 if the message contains a link",
    "currency_count": "Currency symbols or money words",
}


def clean_text(text: str) -> str:
    text = text.lower()
    text = URL_RE.sub(" urltoken ", text)
    text = EMAIL_RE.sub(" emailtoken ", text)
    text = PHONE_RE.sub(" phonetoken ", text)
    text = CURRENCY_RE.sub(" currencytoken ", text)
    text = NUMBER_RE.sub(" numtoken ", text)
    text = NON_ALPHA_RE.sub(" ", text)
    tokens = [t for t in WS_RE.split(text) if len(t) > 1 and t not in STOP_WORDS]
    return " ".join(tokens)


def meta_features(text: str) -> dict[str, float]:
    letters = [c for c in text if c.isalpha()]
    upper = sum(1 for c in letters if c.isupper())
    return {
        "char_length": float(len(text)),
        "word_count": float(len(text.split())),
        "digit_count": float(sum(c.isdigit() for c in text)),
        "uppercase_ratio": upper / len(letters) if letters else 0.0,
        "exclamation_count": float(text.count("!")),
        "special_char_count": float(sum(not c.isalnum() and not c.isspace() for c in text)),
        "has_url": 1.0 if URL_RE.search(text) else 0.0,
        "currency_count": float(len(CURRENCY_RE.findall(text))),
    }


def build_feature_frame(messages: Iterable[str]) -> pd.DataFrame:
    if isinstance(messages, pd.DataFrame):
        messages = messages.iloc[:, 0]
    msgs = [str(m) for m in messages]
    frame = pd.DataFrame([meta_features(m) for m in msgs])
    frame.insert(0, "clean_text", [clean_text(m) for m in msgs])
    return frame


def make_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.95,
        max_features=TFIDF_MAX_FEATURES,
        sublinear_tf=True,
    )


def make_feature_pipeline(select_k: int = SELECT_K) -> Pipeline:
    """Raw messages -> engineered frame -> [TF-IDF | MinMax(meta)] -> chi2 top-k."""
    columns = ColumnTransformer(
        [
            ("tfidf", make_vectorizer(), "clean_text"),
            ("meta", MinMaxScaler(clip=True), list(META_FEATURES)),
        ],
        sparse_threshold=1.0,
    )
    return Pipeline(
        [
            ("prep", FunctionTransformer(build_feature_frame)),
            ("features", columns),
            ("select", SelectKBest(chi2, k=select_k)),
        ]
    )


def selected_feature_names(feature_pipeline: Pipeline) -> np.ndarray:
    names = feature_pipeline.named_steps["features"].get_feature_names_out()
    names = np.array([n.split("__", 1)[1] for n in names])
    mask = feature_pipeline.named_steps["select"].get_support()
    return names[mask]


def split(df: pd.DataFrame):
    x = df["message"]
    y = (df["label"] == "spam").astype(int)
    return train_test_split(x, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE)


def class_weights(y: pd.Series) -> dict[int, float]:
    counts = y.value_counts().to_dict()
    total = len(y)
    return {int(k): total / (len(counts) * v) for k, v in counts.items()}
