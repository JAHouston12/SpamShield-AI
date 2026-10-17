from __future__ import annotations

from collections import Counter

import numpy as np
import pandas as pd

from ml.data import RawDataset
from ml.preprocessing import META_FEATURES, SPECIAL_TOKENS, clean_text, meta_features

LENGTH_BIN = 20
LENGTH_MAX = 300


def _r(x: float, nd: int = 2) -> float:
    return round(float(x), nd)


def class_distribution(df: pd.DataFrame) -> list[dict]:
    counts = df["label"].value_counts()
    total = int(counts.sum())
    return [
        {"label": lbl, "count": int(counts.get(lbl, 0)), "percent": _r(100 * counts.get(lbl, 0) / total, 2)}
        for lbl in ["ham", "spam"]
    ]


def length_histogram(df: pd.DataFrame) -> list[dict]:
    lengths = df["message"].str.len().clip(upper=LENGTH_MAX - 1)
    bins = list(range(0, LENGTH_MAX + LENGTH_BIN, LENGTH_BIN))
    cats = pd.cut(lengths, bins=bins, right=False, include_lowest=True)
    table = pd.crosstab(cats, df["label"]).reindex(columns=["ham", "spam"], fill_value=0)
    rows = []
    for interval, row in table.iterrows():
        left = int(interval.left)
        label = f"{left}+" if left >= LENGTH_MAX - LENGTH_BIN else f"{left}-{left + LENGTH_BIN - 1}"
        rows.append({"bin": label, "start": left, "ham": int(row["ham"]), "spam": int(row["spam"])})
    return rows


def length_stats(df: pd.DataFrame) -> list[dict]:
    out = []
    for lbl in ["ham", "spam"]:
        sub = df[df["label"] == lbl]["message"]
        chars = sub.str.len()
        words = sub.str.split().str.len()
        out.append(
            {
                "label": lbl,
                "mean_chars": _r(chars.mean(), 1),
                "median_chars": _r(chars.median(), 1),
                "max_chars": int(chars.max()),
                "mean_words": _r(words.mean(), 1),
                "median_words": _r(words.median(), 1),
            }
        )
    return out


def top_words(df: pd.DataFrame, n: int = 20) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for lbl in ["ham", "spam"]:
        counter: Counter[str] = Counter()
        for msg in df[df["label"] == lbl]["message"]:
            counter.update(t for t in clean_text(msg).split() if t not in SPECIAL_TOKENS)
        out[lbl] = [{"word": w, "count": c} for w, c in counter.most_common(n)]
    return out


def pattern_prevalence(df: pd.DataFrame) -> list[dict]:
    cleaned = df["message"].map(clean_text)
    rows = []
    for token, desc in SPECIAL_TOKENS.items():
        has = cleaned.str.contains(rf"\b{token}\b", regex=True)
        rows.append(
            {
                "pattern": desc,
                "token": token,
                "ham_percent": _r(100 * has[df["label"] == "ham"].mean(), 1),
                "spam_percent": _r(100 * has[df["label"] == "spam"].mean(), 1),
            }
        )
    return rows


def missing_values(raw: RawDataset) -> list[dict]:
    frame = raw.frame
    total = len(frame)
    rename = {raw.label_col: "label", raw.text_col: "message"}
    return [
        {
            "column": rename.get(col, str(col)),
            "missing": int(frame[col].isna().sum()),
            "present": int(total - frame[col].isna().sum()),
            "percent_missing": _r(100 * frame[col].isna().mean(), 2),
            "used": col in rename,
        }
        for col in frame.columns
    ]


def duplicates(df: pd.DataFrame) -> dict:
    dup_mask = df.duplicated(subset=["message"], keep="first")
    top = df[df.duplicated(subset=["message"], keep=False)].groupby(["message", "label"]).size()
    top = top.sort_values(ascending=False).head(6)
    return {
        "total_records": int(len(df)),
        "duplicate_records": int(dup_mask.sum()),
        "unique_records": int(len(df) - dup_mask.sum()),
        "percent_duplicate": _r(100 * dup_mask.mean(), 2),
        "by_class": [
            {
                "label": lbl,
                "duplicates": int((dup_mask & (df["label"] == lbl)).sum()),
                "unique": int((~dup_mask & (df["label"] == lbl)).sum()),
            }
            for lbl in ["ham", "spam"]
        ],
        "most_repeated": [{"message": msg[:140], "label": lbl, "count": int(c)} for (msg, lbl), c in top.items()],
    }


def meta_frame(df: pd.DataFrame) -> pd.DataFrame:
    meta = pd.DataFrame([meta_features(m) for m in df["message"]])
    meta["is_spam"] = (df["label"].values == "spam").astype(int)
    return meta


def correlation(meta: pd.DataFrame) -> dict:
    corr = meta.corr(method="pearson").fillna(0.0)
    cols = list(corr.columns)
    return {
        "features": cols,
        "matrix": [[_r(corr.loc[r, c], 3) for c in cols] for r in cols],
        "target_correlation": sorted(
            [{"feature": c, "r": _r(corr.loc[c, "is_spam"], 3)} for c in cols if c != "is_spam"],
            key=lambda d: -abs(d["r"]),
        ),
    }


def feature_by_class(meta: pd.DataFrame) -> list[dict]:
    rows = []
    for feat, desc in META_FEATURES.items():
        rows.append(
            {
                "feature": feat,
                "description": desc,
                "ham_mean": _r(meta.loc[meta["is_spam"] == 0, feat].mean(), 3),
                "spam_mean": _r(meta.loc[meta["is_spam"] == 1, feat].mean(), 3),
            }
        )
    return rows


def sample_rows(df: pd.DataFrame, n: int = 24, seed: int = 7) -> list[dict]:
    spam = df[df["label"] == "spam"].sample(n // 3, random_state=seed)
    ham = df[df["label"] == "ham"].sample(n - n // 3, random_state=seed)
    sample = pd.concat([spam, ham]).sample(frac=1, random_state=seed)
    return [
        {"id": int(i), "label": r.label, "message": r.message, "length": len(r.message)} for i, r in sample.iterrows()
    ]


def build_eda(raw: RawDataset, df: pd.DataFrame) -> dict:
    meta = meta_frame(df)
    return {
        "class_distribution": class_distribution(df),
        "length_histogram": length_histogram(df),
        "length_stats": length_stats(df),
        "top_words": top_words(df),
        "pattern_prevalence": pattern_prevalence(df),
        "missing_values": missing_values(raw),
        "duplicates": duplicates(df),
        "correlation": correlation(meta),
        "feature_by_class": feature_by_class(meta),
    }


def build_dataset_summary(raw: RawDataset, df: pd.DataFrame) -> dict:
    words = df["message"].str.split().str.len()
    counts = df["label"].value_counts()
    return {
        "name": "SMS Spam Collection Dataset",
        "source": raw.source,
        "records": int(len(raw.frame)),
        "records_usable": int(len(df)),
        "raw_columns": [str(c) for c in raw.frame.columns],
        "num_raw_features": 1,
        "num_engineered_features": len(META_FEATURES),
        "target": "label",
        "classes": {"ham": int(counts.get("ham", 0)), "spam": int(counts.get("spam", 0))},
        "spam_ratio": _r(counts.get("spam", 0) / len(df), 4),
        "avg_chars": _r(df["message"].str.len().mean(), 1),
        "avg_words": _r(words.mean(), 1),
        "vocabulary_size": int(len({t for m in df["message"] for t in clean_text(m).split()})),
        "language": "English",
        "engineered_features": [{"name": k, "description": v} for k, v in META_FEATURES.items()],
        "sample": sample_rows(df),
        "length_quantiles": {
            q: int(np.quantile(df["message"].str.len(), float(q))) for q in ["0.25", "0.5", "0.75", "0.95"]
        },
    }
