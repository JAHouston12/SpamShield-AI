from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

METRICS = ["accuracy", "precision", "recall", "f1", "roc_auc"]
RANKING_WEIGHTS = {"f1": 0.4, "roc_auc": 0.2, "precision": 0.2, "recall": 0.2}


def _downsample_roc(fpr: np.ndarray, tpr: np.ndarray, points: int = 60) -> list[dict[str, float]]:
    grid = np.linspace(0, 1, points)
    tpr_interp = np.interp(grid, fpr, tpr)
    tpr_interp[0] = 0.0
    return [{"fpr": round(float(f), 4), "tpr": round(float(t), 4)} for f, t in zip(grid, tpr_interp, strict=True)]


def evaluate(y_true: np.ndarray, y_pred: np.ndarray, y_score: np.ndarray) -> dict:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    fpr, tpr, _ = roc_curve(y_true, y_score)
    report = classification_report(y_true, y_pred, target_names=["ham", "spam"], output_dict=True, zero_division=0)

    return {
        "metrics": {
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "precision": float(precision_score(y_true, y_pred, zero_division=0)),
            "recall": float(recall_score(y_true, y_pred, zero_division=0)),
            "f1": float(f1_score(y_true, y_pred, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_true, y_score)),
        },
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "false_positive_rate": float(fp / (fp + tn)) if (fp + tn) else 0.0,
        "false_negative_rate": float(fn / (fn + tp)) if (fn + tp) else 0.0,
        "roc_curve": _downsample_roc(fpr, tpr),
        "classification_report": {
            label: {
                "precision": float(report[label]["precision"]),
                "recall": float(report[label]["recall"]),
                "f1": float(report[label]["f1-score"]),
                "support": int(report[label]["support"]),
            }
            for label in ["ham", "spam", "macro avg", "weighted avg"]
        },
    }


def tune_threshold(y_true: np.ndarray, y_score: np.ndarray) -> float:
    """Pick the decision threshold maximizing F1 on out-of-fold training predictions."""
    grid = np.round(np.arange(0.10, 0.91, 0.01), 2)
    scores = [f1_score(y_true, (y_score >= t).astype(int), zero_division=0) for t in grid]
    best = float(max(scores))
    candidates = [t for t, s in zip(grid, scores, strict=True) if s >= best - 1e-9]
    return float(min(candidates, key=lambda t: abs(t - 0.5)))


def composite_score(metrics: dict[str, float]) -> float:
    return sum(metrics[k] * w for k, w in RANKING_WEIGHTS.items())


def rank(results: list[dict]) -> list[dict]:
    """Rank by weighted composite of F1, ROC-AUC, precision, recall (F1 weighted highest)."""
    scored = sorted(results, key=lambda r: composite_score(r["metrics"]), reverse=True)
    return [
        {"rank": i + 1, "key": r["key"], "name": r["name"], "score": round(composite_score(r["metrics"]), 4)}
        for i, r in enumerate(scored)
    ]
