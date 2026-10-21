"""Train every registered model and write the JSON artifacts consumed by the API and frontend.

Usage: `uv run python -m ml.train` (or `make train` from the repo root).
"""

from __future__ import annotations

import json
import platform
import time
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
import xgboost
from sklearn.base import clone
from sklearn.model_selection import StratifiedKFold, cross_val_predict, cross_validate
from sklearn.pipeline import Pipeline

from app.core.config import get_settings
from ml import eda as eda_mod
from ml import explain as xai
from ml.data import load_raw, quality_report, to_canonical
from ml.evaluate import METRICS, evaluate, rank, tune_threshold
from ml.preprocessing import (
    META_FEATURES,
    RANDOM_STATE,
    SELECT_K,
    TEST_SIZE,
    TFIDF_MAX_FEATURES,
    class_weights,
    clean_text,
    make_feature_pipeline,
    selected_feature_names,
    split,
)
from ml.registry import MODEL_REGISTRY, describe_params

CV_MODELS = ("logistic_regression", "random_forest")


def log(msg: str) -> None:
    print(f"[train] {msg}", flush=True)


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    log(f"wrote {path.name} ({path.stat().st_size / 1024:.1f} KB)")


def build_preprocessing_report(raw, canonical, deduped, feats, x_train, y_train, y_test, ratio) -> dict:
    vec = feats.named_steps["features"].named_transformers_["tfidf"]
    scaler = feats.named_steps["features"].named_transformers_["meta"]
    selector = feats.named_steps["select"]
    all_names = np.array([n.split("__", 1)[1] for n in feats.named_steps["features"].get_feature_names_out()])
    scores = np.nan_to_num(selector.scores_)
    top_idx = np.argsort(-scores)[:15]

    examples = deduped[deduped["label"] == "spam"]["message"].head(2).tolist()
    examples += deduped[deduped["label"] == "ham"]["message"].iloc[[3, 10]].tolist()

    tfidf_msg = examples[0]
    tfidf_vec = vec.transform([clean_text(tfidf_msg)])
    vocab_inv = vec.get_feature_names_out()
    nz = tfidf_vec.nonzero()[1]
    tfidf_terms = sorted(
        [{"term": str(vocab_inv[i]), "weight": round(float(tfidf_vec[0, i]), 4)} for i in nz],
        key=lambda d: -d["weight"],
    )[:12]

    weights = class_weights(y_train)
    return {
        "missing": {
            "raw_records": int(len(raw.frame)),
            "records_after": int(len(canonical)),
            "removed": int(len(raw.frame) - len(canonical)),
            "merged_columns": [str(c) for c in raw.frame.columns if c not in (raw.label_col, raw.text_col)],
            **quality_report(raw),
        },
        "duplicates": {
            "before": int(len(canonical)),
            "after": int(len(deduped)),
            "removed": int(len(canonical) - len(deduped)),
        },
        "cleaning_examples": [{"original": m, "cleaned": clean_text(m)} for m in examples],
        "tfidf": {
            "ngram_range": [1, 2],
            "min_df": 2,
            "max_df": 0.95,
            "max_features": TFIDF_MAX_FEATURES,
            "sublinear_tf": True,
            "vocabulary_size": int(len(vec.vocabulary_)),
            "example_message": tfidf_msg,
            "example_terms": tfidf_terms,
        },
        "scaling": {
            "method": "MinMaxScaler(clip=True) on engineered numeric features; TF-IDF rows are L2-normalized",
            "features": [
                {
                    "feature": f,
                    "min": round(float(scaler.data_min_[i]), 3),
                    "max": round(float(scaler.data_max_[i]), 3),
                }
                for i, f in enumerate(META_FEATURES)
            ],
        },
        "selection": {
            "method": "SelectKBest(chi2)",
            "features_before": int(len(all_names)),
            "features_after": int(SELECT_K),
            "top_scores": [
                {"feature": xai.display_name(str(all_names[i])), "chi2": round(float(scores[i]), 2)} for i in top_idx
            ],
        },
        "imbalance": {
            "spam_ratio": round(float(y_train.mean()), 4),
            "ham_to_spam_ratio": round(float(ratio), 3),
            "class_weights": {"ham": round(weights[0], 3), "spam": round(weights[1], 3)},
            "strategies": [{"key": s.key, "name": s.name, "strategy": s.imbalance_strategy} for s in MODEL_REGISTRY],
        },
        "split": {
            "test_size": TEST_SIZE,
            "random_state": RANDOM_STATE,
            "stratified": True,
            "train": {"total": int(len(y_train)), "ham": int((y_train == 0).sum()), "spam": int((y_train == 1).sum())},
            "test": {"total": int(len(y_test)), "ham": int((y_test == 0).sum()), "spam": int((y_test == 1).sum())},
        },
        "feature_matrix_shape": [int(x_train.shape[0]), int(x_train.shape[1])],
    }


def error_examples(x_test: pd.Series, y_test: pd.Series, proba: np.ndarray, threshold: float, limit: int = 6) -> dict:
    df = pd.DataFrame({"message": x_test.values, "actual": y_test.values, "spam_probability": proba})
    fn = df[(df.actual == 1) & (df.spam_probability < threshold)].sort_values("spam_probability").head(limit)
    fp = df[(df.actual == 0) & (df.spam_probability >= threshold)]
    fp = fp.sort_values("spam_probability", ascending=False)
    fp = fp.head(limit)

    def rows(frame):
        return [
            {"message": r.message, "spam_probability": round(float(r.spam_probability), 4)} for r in frame.itertuples()
        ]

    return {"false_negatives": rows(fn), "false_positives": rows(fp)}


def main() -> None:
    settings = get_settings()
    out_dir = settings.artifacts_dir
    model_dir = out_dir / "models"
    model_dir.mkdir(parents=True, exist_ok=True)

    t0 = time.perf_counter()
    raw = load_raw()
    canonical = to_canonical(raw)
    deduped = canonical.drop_duplicates(subset=["message"]).reset_index(drop=True)
    log(f"loaded {len(raw.frame)} rows from {raw.source}; {len(deduped)} unique after cleaning")

    write_json(out_dir / "dataset.json", eda_mod.build_dataset_summary(raw, canonical))
    write_json(out_dir / "eda.json", eda_mod.build_eda(raw, canonical))

    x_train_raw, x_test_raw, y_train, y_test = split(deduped)
    ratio = float((y_train == 0).sum() / (y_train == 1).sum())

    feats = make_feature_pipeline()
    x_train = feats.fit_transform(x_train_raw, y_train)
    x_test = feats.transform(x_test_raw)
    names = selected_feature_names(feats)
    spam_mean, ham_mean = xai.class_means(x_train, y_train.values)
    log(f"feature matrix {x_train.shape}, ham:spam = {ratio:.2f}")

    write_json(
        out_dir / "preprocessing.json",
        build_preprocessing_report(raw, canonical, deduped, feats, x_train, y_train, y_test, ratio),
    )

    results, models_meta, importances = [], [], {}
    pipelines: dict[str, Pipeline] = {}
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    for spec in MODEL_REGISTRY:
        oof = cross_val_predict(spec.build(ratio), x_train, y_train.values, cv=skf, method="predict_proba")[:, 1]
        threshold = tune_threshold(y_train.values, oof)

        clf = spec.build(ratio)
        start = time.perf_counter()
        clf.fit(x_train, y_train.values)
        train_time = time.perf_counter() - start

        start = time.perf_counter()
        proba = clf.predict_proba(x_test)[:, 1]
        infer_ms = (time.perf_counter() - start) * 1000 / x_test.shape[0]
        pred = (proba >= threshold).astype(int)

        pipe = Pipeline([*feats.steps, ("clf", clf)])
        pipelines[spec.key] = pipe
        joblib.dump(pipe, model_dir / f"{spec.key}.joblib", compress=3)

        ev = evaluate(y_test.values, pred, proba)
        default_ev = evaluate(y_test.values, (proba >= 0.5).astype(int), proba)
        results.append(
            {
                "key": spec.key,
                "name": spec.name,
                "family": spec.family,
                "role": spec.role,
                "threshold": threshold,
                **ev,
                "default_threshold": {
                    "metrics": default_ev["metrics"],
                    "confusion_matrix": default_ev["confusion_matrix"],
                },
                "train_time_s": round(train_time, 3),
                "inference_ms": round(infer_ms, 4),
                "errors": error_examples(x_test_raw, y_test, proba, threshold),
            }
        )
        models_meta.append(
            {
                "key": spec.key,
                "name": spec.name,
                "family": spec.family,
                "role": spec.role,
                "imbalance_strategy": spec.imbalance_strategy,
                "threshold": threshold,
                "params": describe_params(clf),
                "train_time_s": round(train_time, 3),
            }
        )
        importances[spec.key] = xai.global_importance(pipe, names, spam_mean, ham_mean)
        m = ev["metrics"]
        log(f"{spec.name:<24} acc={m['accuracy']:.4f} f1={m['f1']:.4f} auc={m['roc_auc']:.4f} ({train_time:.1f}s)")

    cv = {}
    for spec in MODEL_REGISTRY:
        if spec.key not in CV_MODELS:
            continue
        pipe = Pipeline([*clone(make_feature_pipeline()).steps, ("clf", spec.build(ratio))])
        scores = cross_validate(
            pipe, x_train_raw, y_train, cv=skf, scoring=["accuracy", "precision", "recall", "f1", "roc_auc"], n_jobs=1
        )
        cv[spec.key] = {
            metric: {
                "mean": round(float(scores[f"test_{metric}"].mean()), 4),
                "std": round(float(scores[f"test_{metric}"].std()), 4),
            }
            for metric in METRICS
        }
        log(f"cv {spec.key}: f1 {cv[spec.key]['f1']['mean']:.4f} ± {cv[spec.key]['f1']['std']:.4f}")

    by_key = {r["key"]: r for r in results}
    baseline = next(s.key for s in MODEL_REGISTRY if s.role == "baseline")
    improved = next(s.key for s in MODEL_REGISTRY if s.role == "improved")
    ranking = rank(results)

    def comparison(a: str, b: str) -> dict:
        ma, mb = by_key[a]["metrics"], by_key[b]["metrics"]
        ca, cb = by_key[a]["confusion_matrix"], by_key[b]["confusion_matrix"]
        return {
            "baseline": a,
            "challenger": b,
            "metric_deltas": {k: round(mb[k] - ma[k], 4) for k in METRICS},
            "false_positives": {"baseline": ca["fp"], "challenger": cb["fp"]},
            "false_negatives": {"baseline": ca["fn"], "challenger": cb["fn"]},
            "true_positives": {"baseline": ca["tp"], "challenger": cb["tp"]},
        }

    write_json(
        out_dir / "evaluation.json",
        {
            "test_size": int(len(y_test)),
            "threshold": 0.5,
            "results": results,
            "ranking": ranking,
            "best_model": ranking[0]["key"],
            "baseline": baseline,
            "improved": improved,
            "baseline_vs_improved": comparison(baseline, improved),
            "baseline_vs_best": comparison(baseline, ranking[0]["key"]),
            "cross_validation": cv,
        },
    )
    write_json(out_dir / "models.json", {"models": models_meta, "feature_count": int(x_train.shape[1])})

    explainer = xai.build_linear_explainer(pipelines[baseline], names, x_train)
    joblib.dump(explainer, model_dir / "linear_explainer.joblib", compress=3)

    sample_df = pd.DataFrame({"message": x_test_raw.values, "y": y_test.values})
    local_examples = []
    picks = pd.concat(
        [sample_df[sample_df.y == 1].head(2), sample_df[sample_df.y == 0].iloc[[0, 5]]], ignore_index=True
    )
    for row in picks.itertuples():
        xrow = feats.transform([row.message])
        logit = explainer.base_value + float(explainer.shap_values(xrow).sum())
        local_examples.append(
            {
                "message": row.message,
                "actual": "spam" if row.y == 1 else "ham",
                "spam_probability": round(float(1 / (1 + np.exp(-logit))), 4),
                "base_value": round(explainer.base_value, 4),
                "output_value": round(logit, 4),
                "contributions": explainer.explain_row(xrow, top_k=8),
            }
        )

    write_json(
        out_dir / "explain.json",
        {
            "feature_names_count": int(len(names)),
            "global_importance": importances,
            "shap": {
                "linear": {
                    "model": baseline,
                    "status": "computed",
                    "explainer": "Exact linear SHAP (w * (x - E[x]))",
                    "base_value": round(explainer.base_value, 4),
                    "global_summary": xai.global_shap_summary(explainer, x_test),
                    "local_examples": local_examples,
                },
                "tree": [
                    xai.tree_shap_placeholder(s.key, s.name)
                    for s in MODEL_REGISTRY
                    if s.key in ("random_forest", "xgboost", "gradient_boosting")
                ],
            },
        },
    )

    write_json(
        out_dir / "manifest.json",
        {
            "trained_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "dataset_source": raw.source,
            "default_model": settings.default_model,
            "models": [s.key for s in MODEL_REGISTRY],
            "versions": {
                "python": platform.python_version(),
                "scikit_learn": sklearn.__version__,
                "xgboost": xgboost.__version__,
                "pandas": pd.__version__,
            },
            "duration_s": round(time.perf_counter() - t0, 1),
        },
    )
    log(f"done in {time.perf_counter() - t0:.1f}s")


if __name__ == "__main__":
    main()
