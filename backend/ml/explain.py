"""Global and local explanations.

- Global importance is model-native: linear coefficients, tree impurity importances, Naive Bayes
  log-probability ratios, or first-layer weight magnitude for the MLP. Direction (spam vs ham) for unsigned
  importances comes from the class-conditional mean of each feature in the training set.
- Local attributions use the exact linear SHAP formulation for the logistic regression baseline:
  phi_i = w_i * (x_i - E[x_i]). The sum of phi plus the base value equals the model's log-odds.
- Tree SHAP for ensemble models is exposed as a placeholder structure with the same schema, ready to be
  filled by the `shap` package without frontend changes.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import sparse
from sklearn.pipeline import Pipeline

from ml.preprocessing import META_FEATURES, SPECIAL_TOKENS
from ml.registry import base_estimator

TOP_N = 25


def feature_kind(name: str) -> str:
    if name in META_FEATURES:
        return "engineered"
    if name in SPECIAL_TOKENS:
        return "pattern"
    return "bigram" if " " in name else "token"


def display_name(name: str) -> str:
    if name in SPECIAL_TOKENS:
        return f"<{name.removesuffix('token').upper()}>"
    return name


def _dense_mean(x) -> np.ndarray:
    return np.asarray(x.mean(axis=0)).ravel()


def class_means(x_train, y_train: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    y = np.asarray(y_train)
    return _dense_mean(x_train[y == 1]), _dense_mean(x_train[y == 0])


def global_importance(
    pipeline: Pipeline, names: np.ndarray, spam_mean: np.ndarray, ham_mean: np.ndarray
) -> dict | None:
    clf = base_estimator(pipeline.named_steps["clf"])
    direction = np.sign(spam_mean - ham_mean)
    signed = True

    if hasattr(clf, "coef_") and getattr(clf, "kernel", "linear") == "linear":
        coef = clf.coef_
        weights = np.asarray(coef.toarray() if sparse.issparse(coef) else coef).ravel()
        method = "Model coefficients (log-odds weight per feature)"
    elif hasattr(clf, "feature_log_prob_"):
        weights = clf.feature_log_prob_[1] - clf.feature_log_prob_[0]
        method = "Log-probability ratio log P(feature|spam) / P(feature|ham)"
    elif hasattr(clf, "feature_importances_"):
        weights = np.asarray(clf.feature_importances_) * np.where(direction == 0, 1, direction)
        signed = False
        method = "Impurity / gain importance, signed by class-conditional mean"
    elif hasattr(clf, "coefs_"):
        weights = np.abs(clf.coefs_[0]).sum(axis=1) * np.where(direction == 0, 1, direction)
        signed = False
        method = "Sum of absolute first-layer weights, signed by class-conditional mean"
    else:
        return None

    order = np.argsort(-np.abs(weights))[:TOP_N]
    scale = float(np.abs(weights[order]).max()) or 1.0
    return {
        "method": method,
        "signed_by_model": signed,
        "features": [
            {
                "feature": display_name(str(names[i])),
                "raw": str(names[i]),
                "kind": feature_kind(str(names[i])),
                "weight": round(float(weights[i]), 6),
                "normalized": round(float(abs(weights[i]) / scale), 4),
                "direction": "spam" if weights[i] > 0 else "ham",
            }
            for i in order
        ],
    }


@dataclass
class LinearExplainer:
    """Exact SHAP values for a linear model over (possibly sparse) features."""

    names: np.ndarray
    coef: np.ndarray
    background_mean: np.ndarray
    intercept: float

    @property
    def base_value(self) -> float:
        return float(self.intercept + self.coef @ self.background_mean)

    def shap_values(self, x) -> np.ndarray:
        dense = x.toarray() if sparse.issparse(x) else np.asarray(x)
        return (dense - self.background_mean) * self.coef

    def explain_row(self, x_row, top_k: int = 10, present_only: bool = True) -> list[dict]:
        phi = self.shap_values(x_row).ravel()
        dense = (x_row.toarray() if sparse.issparse(x_row) else np.asarray(x_row)).ravel()
        idx = np.where(dense > 0)[0] if present_only else np.arange(len(phi))
        if len(idx) == 0:
            idx = np.arange(len(phi))
        order = idx[np.argsort(-np.abs(phi[idx]))][:top_k]
        return [
            {
                "feature": display_name(str(self.names[i])),
                "kind": feature_kind(str(self.names[i])),
                "value": round(float(dense[i]), 4),
                "contribution": round(float(phi[i]), 4),
                "direction": "spam" if phi[i] > 0 else "ham",
            }
            for i in order
        ]


def build_linear_explainer(pipeline: Pipeline, names: np.ndarray, x_train) -> LinearExplainer:
    clf = pipeline.named_steps["clf"]
    return LinearExplainer(
        names=names,
        coef=np.asarray(clf.coef_).ravel(),
        background_mean=_dense_mean(x_train),
        intercept=float(np.asarray(clf.intercept_).ravel()[0]),
    )


def global_shap_summary(explainer: LinearExplainer, x_test, top_k: int = 20) -> list[dict]:
    phi = explainer.shap_values(x_test)
    mean_abs = np.abs(phi).mean(axis=0)
    mean_signed = phi.mean(axis=0)
    order = np.argsort(-mean_abs)[:top_k]
    return [
        {
            "feature": display_name(str(explainer.names[i])),
            "kind": feature_kind(str(explainer.names[i])),
            "mean_abs_shap": round(float(mean_abs[i]), 5),
            "mean_shap": round(float(mean_signed[i]), 5),
            "direction": "spam" if explainer.coef[i] > 0 else "ham",
        }
        for i in order
    ]


def tree_shap_placeholder(model_key: str, model_name: str) -> dict:
    return {
        "model": model_key,
        "name": model_name,
        "status": "placeholder",
        "explainer": "shap.TreeExplainer",
        "note": "Install `shap` and enable TREE_SHAP in ml/explain.py to populate per-feature SHAP values.",
        "base_value": None,
        "features": [],
    }
