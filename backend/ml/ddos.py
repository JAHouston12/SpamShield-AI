"""Assignment 7: DoS/DDoS traffic analysis on CIC-IDS2017 (Friday afternoon DDoS capture).

Downloads one public CSV (~77 MB, gitignored), compares benign vs attack flows, evaluates a statistical
threshold rule plus two ML models, and writes a small JSON summary for the website.

Usage: `uv run python -m ml.ddos` (or `make ddos` from the repo root).
"""

from __future__ import annotations

import json
import time
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "cic" / "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv"
OUT_PATH = ROOT / "artifacts" / "ddos.json"

DOWNLOAD_URL = (
    "https://huggingface.co/datasets/c01dsnap/CIC-IDS2017/resolve/main/Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv"
)
SOURCE_LINKS = {
    "huggingface": "https://huggingface.co/datasets/c01dsnap/CIC-IDS2017",
    "kaggle": "https://www.kaggle.com/datasets/chethuhn/network-intrusion-dataset",
    "original": "https://www.unb.ca/cic/datasets/ids-2017.html",
}

RANDOM_STATE = 42
SAMPLE_SIZE = 60_000
TEST_SIZE = 0.2

# Interpretable flow features. Destination Port is analysed but excluded from the models: every DDoS flow in
# this capture targets port 80, so including it would let a model "detect" the attack by memorising the port.
FEATURES = [
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Fwd Packet Length Mean",
    "Bwd Packet Length Mean",
    "Bwd Packet Length Std",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Flow IAT Mean",
    "Flow IAT Std",
    "Flow IAT Max",
    "Fwd IAT Mean",
    "Packet Length Mean",
    "Packet Length Std",
    "Average Packet Size",
    "SYN Flag Count",
    "ACK Flag Count",
    "PSH Flag Count",
    "Init_Win_bytes_forward",
    "Init_Win_bytes_backward",
]

VOLUME_FEATURES = {
    "Flow Packets/s": "packets/s",
    "Flow Bytes/s": "bytes/s",
    "Flow Duration": "microseconds",
    "Total Fwd Packets": "packets",
    "Total Backward Packets": "packets",
    "Total Length of Fwd Packets": "bytes",
    "Packet Length Mean": "bytes",
}

HIST_FEATURES = ["Flow Packets/s", "Flow Duration", "Total Length of Fwd Packets", "Packet Length Mean"]


def download() -> None:
    if DATA_PATH.exists():
        return
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {DOWNLOAD_URL} ...")
    urllib.request.urlretrieve(DOWNLOAD_URL, DATA_PATH)


def load() -> tuple[pd.DataFrame, dict]:
    df = pd.read_csv(DATA_PATH, low_memory=False)
    df.columns = [c.strip() for c in df.columns]
    df = df.loc[:, ~df.columns.duplicated()]
    df["Label"] = df["Label"].astype(str).str.strip()
    raw_rows, raw_cols = df.shape

    numeric = df.drop(columns="Label").apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan)
    bad = numeric.isna().any(axis=1)
    df = pd.concat([numeric, df["Label"]], axis=1).loc[~bad]
    dupes = int(df.duplicated().sum())
    df = df.drop_duplicates().reset_index(drop=True)
    df["is_attack"] = (df["Label"] != "BENIGN").astype(int)

    prep = {
        "raw_rows": int(raw_rows),
        "raw_columns": int(raw_cols),
        "dropped_nan_inf": int(bad.sum()),
        "dropped_duplicates": dupes,
        "clean_rows": int(len(df)),
    }
    return df, prep


def r(x: float, n: int = 4) -> float:
    return float(round(float(x), n))


def volume_stats(df: pd.DataFrame) -> list[dict]:
    rows = []
    for feat, unit in VOLUME_FEATURES.items():
        b = df.loc[df.is_attack == 0, feat]
        a = df.loc[df.is_attack == 1, feat]
        rows.append(
            {
                "feature": feat,
                "unit": unit,
                "benign_median": r(b.median(), 2),
                "attack_median": r(a.median(), 2),
                "benign_mean": r(b.mean(), 2),
                "attack_mean": r(a.mean(), 2),
                "benign_p90": r(b.quantile(0.9), 2),
                "attack_p90": r(a.quantile(0.9), 2),
            }
        )
    return rows


def _human(v: float) -> str:
    for div, suffix in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if v >= div:
            return f"{v / div:g}{suffix}"
    return f"{v:g}"


def histograms(df: pd.DataFrame) -> dict:
    """Share of each class per log10 bin, so classes of different sizes are comparable."""
    out = {}
    for feat in HIST_FEATURES:
        vals = np.log10(df[feat].clip(lower=0) + 1)
        edges = np.arange(0, np.ceil(vals.max()) + 1)
        bins = []
        for lo, hi in zip(edges[:-1], edges[1:], strict=True):
            in_bin = (vals >= lo) & ((vals < hi) if hi < edges[-1] else (vals <= hi))
            bins.append(
                {
                    "bin": f"{_human(10**lo)}-{_human(10**hi)}",
                    "benign": r(in_bin[df.is_attack == 0].mean()),
                    "attack": r(in_bin[df.is_attack == 1].mean()),
                }
            )
        out[feat] = bins
    return out


def top_ports(df: pd.DataFrame, k: int = 6) -> dict:
    out = {}
    for name, flag in (("benign", 0), ("attack", 1)):
        counts = df.loc[df.is_attack == flag, "Destination Port"].astype(int).value_counts(normalize=True).head(k)
        out[name] = [{"port": int(p), "share": r(s)} for p, s in counts.items() if s >= 0.001]
    return out


def correlations(df: pd.DataFrame, k: int = 10) -> list[dict]:
    corr = df[FEATURES].corrwith(df.is_attack).dropna()
    corr = corr.reindex(corr.abs().sort_values(ascending=False).index).head(k)
    return [{"feature": f, "corr": r(c)} for f, c in corr.items()]


def scores(y_true, y_pred, y_score=None) -> dict:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    out = {
        "accuracy": r(accuracy_score(y_true, y_pred)),
        "precision": r(precision_score(y_true, y_pred, zero_division=0)),
        "recall": r(recall_score(y_true, y_pred, zero_division=0)),
        "f1": r(f1_score(y_true, y_pred, zero_division=0)),
        "cm": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }
    if y_score is not None:
        out["roc_auc"] = r(roc_auc_score(y_true, y_score))
    return out


def best_stump(train: pd.DataFrame) -> tuple[str, str, float]:
    """Single feature + cutoff that maximises training F1 (a one-rule statistical detector)."""
    best = ("", "above", 0.0, -1.0)
    for feat in FEATURES:
        for thr in np.unique(train[feat].quantile(np.linspace(0.02, 0.98, 49))):
            for direction in ("above", "below"):
                pred = (train[feat] > thr) if direction == "above" else (train[feat] <= thr)
                f1 = f1_score(train.is_attack, pred, zero_division=0)
                if f1 > best[3]:
                    best = (feat, direction, float(thr), f1)
    return best[0], best[1], best[2]


def detectors(train: pd.DataFrame, test: pd.DataFrame) -> list[dict]:
    """Non-supervised baselines: a naive volume threshold, a learned single-feature rule, and an anomaly detector."""
    out = []
    benign = train.loc[train.is_attack == 0]

    thr = float(benign["Flow Packets/s"].quantile(0.99))
    out.append(
        {
            "name": "Volume threshold",
            "family": "Statistical",
            "rule": f"Flow Packets/s > {thr:,.0f} (99th percentile of benign)",
            **scores(test.is_attack, (test["Flow Packets/s"] > thr).astype(int)),
        }
    )

    feat, direction, thr = best_stump(train)
    pred = (test[feat] > thr) if direction == "above" else (test[feat] <= thr)
    out.append(
        {
            "name": "Single-feature rule",
            "family": "Statistical",
            "rule": f"{feat} {'>' if direction == 'above' else '<='} {thr:,.1f}",
            **scores(test.is_attack, pred.astype(int)),
        }
    )

    iso = IsolationForest(n_estimators=200, contamination=0.05, random_state=RANDOM_STATE)
    iso.fit(np.log1p(benign[FEATURES].clip(lower=0)))
    x_te = np.log1p(test[FEATURES].clip(lower=0))
    out.append(
        {
            "name": "Isolation Forest",
            "family": "Anomaly detection",
            "rule": "Trained on benign flows only; flags the 5% least typical",
            **scores(test.is_attack, (iso.predict(x_te) == -1).astype(int), -iso.score_samples(x_te)),
        }
    )
    return out


def run_models(train: pd.DataFrame, test: pd.DataFrame) -> tuple[list[dict], list[dict]]:
    models = {
        "Logistic Regression": make_pipeline(
            StandardScaler(), LogisticRegression(max_iter=2000, random_state=RANDOM_STATE)
        ),
        "Random Forest": RandomForestClassifier(n_estimators=100, n_jobs=-1, random_state=RANDOM_STATE),
    }
    x_tr = np.log1p(train[FEATURES].clip(lower=0))
    x_te = np.log1p(test[FEATURES].clip(lower=0))
    results, importances = [], []
    for name, model in models.items():
        t0 = time.perf_counter()
        model.fit(x_tr, train.is_attack)
        secs = time.perf_counter() - t0
        proba = model.predict_proba(x_te)[:, 1]
        results.append(
            {
                "name": name,
                "family": "Supervised ML",
                "rule": "22 log-scaled flow features, threshold 0.5",
                "train_seconds": r(secs, 2),
                **scores(test.is_attack, (proba >= 0.5).astype(int), proba),
            }
        )
        if name == "Random Forest":
            imp = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False).head(10)
            importances = [{"feature": f, "importance": r(v)} for f, v in imp.items()]
    return results, importances


def main() -> None:
    download()
    df, prep = load()
    counts = df.Label.value_counts()
    print(f"Clean rows: {len(df):,} | {counts.to_dict()}")

    sample = df.groupby("is_attack", group_keys=False).sample(
        n=None, frac=min(1.0, SAMPLE_SIZE / len(df)), random_state=RANDOM_STATE
    )
    train, test = train_test_split(sample, test_size=TEST_SIZE, stratify=sample.is_attack, random_state=RANDOM_STATE)

    rules = detectors(train, test)
    models, importances = run_models(train, test)

    out = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "dataset": {
            "name": "CIC-IDS2017 (Friday afternoon DDoS capture)",
            "file": DATA_PATH.name,
            "publisher": "Canadian Institute for Cybersecurity, University of New Brunswick",
            "links": SOURCE_LINKS,
            "capture": "Friday 7 July 2017, afternoon; DDoS generated with LOIC against an Ubuntu web server",
        },
        "preprocessing": {
            **prep,
            "features_used": FEATURES,
            "sample_rows": int(len(sample)),
            "train_rows": int(len(train)),
            "test_rows": int(len(test)),
        },
        "class_counts": [{"label": str(k), "count": int(v)} for k, v in counts.items()],
        "volume": volume_stats(df),
        "histograms": histograms(df),
        "ports": top_ports(df),
        "correlations": correlations(df),
        "detectors": rules,
        "models": models,
        "importances": importances,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, indent=2))
    for row in rules + models:
        print(f"{row['name']:<22} P={row['precision']:.4f} R={row['recall']:.4f} F1={row['f1']:.4f} {row['cm']}")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
