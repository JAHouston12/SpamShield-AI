"""Model registry: the single place to add, remove, or tune a classifier.

Each entry produces an unfitted estimator. `ml.train` wraps it with the shared feature pipeline, so a new
model only needs a `ModelSpec` here, and every API response and frontend chart picks it up after retraining.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from sklearn.base import BaseEstimator
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import AdaBoostClassifier, GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

from ml.preprocessing import RANDOM_STATE


@dataclass(frozen=True)
class ModelSpec:
    key: str
    name: str
    family: str
    build: Callable[[float], BaseEstimator]
    """Factory receiving the negative/positive class ratio (for imbalance-aware estimators)."""
    role: str = "candidate"
    imbalance_strategy: str = "none"
    params: dict[str, Any] = field(default_factory=dict)


def _params(est: BaseEstimator, keys: list[str]) -> dict[str, Any]:
    p = est.get_params()
    return {k: p[k] for k in keys if k in p}


MODEL_REGISTRY: list[ModelSpec] = [
    ModelSpec(
        key="logistic_regression",
        name="Logistic Regression",
        family="Linear",
        role="baseline",
        imbalance_strategy="class_weight='balanced'",
        build=lambda _r: LogisticRegression(
            C=10.0, max_iter=2000, class_weight="balanced", solver="liblinear", random_state=RANDOM_STATE
        ),
    ),
    ModelSpec(
        key="naive_bayes",
        name="Naive Bayes",
        family="Probabilistic",
        imbalance_strategy="Class priors learned from data",
        build=lambda _r: MultinomialNB(alpha=0.1),
    ),
    ModelSpec(
        key="decision_tree",
        name="Decision Tree",
        family="Tree",
        imbalance_strategy="class_weight='balanced'",
        build=lambda _r: DecisionTreeClassifier(
            max_depth=None, min_samples_leaf=2, class_weight="balanced", random_state=RANDOM_STATE
        ),
    ),
    ModelSpec(
        key="random_forest",
        name="Random Forest",
        family="Ensemble (bagging)",
        role="improved",
        imbalance_strategy="class_weight='balanced_subsample'",
        build=lambda _r: RandomForestClassifier(
            n_estimators=400,
            max_features="sqrt",
            min_samples_leaf=1,
            class_weight="balanced_subsample",
            n_jobs=-1,
            random_state=RANDOM_STATE,
        ),
    ),
    ModelSpec(
        key="knn",
        name="K-Nearest Neighbors",
        family="Instance-based",
        imbalance_strategy="Distance weighting",
        build=lambda _r: KNeighborsClassifier(n_neighbors=5, weights="distance", metric="cosine"),
    ),
    ModelSpec(
        key="svm",
        name="Support Vector Machine",
        family="Kernel",
        imbalance_strategy="class_weight='balanced'",
        build=lambda _r: CalibratedClassifierCV(
            SVC(kernel="linear", C=1.0, class_weight="balanced", random_state=RANDOM_STATE),
            method="sigmoid",
            ensemble=False,
        ),
    ),
    ModelSpec(
        key="adaboost",
        name="AdaBoost",
        family="Ensemble (boosting)",
        imbalance_strategy="Sample re-weighting on errors",
        build=lambda _r: AdaBoostClassifier(n_estimators=300, learning_rate=0.5, random_state=RANDOM_STATE),
    ),
    ModelSpec(
        key="gradient_boosting",
        name="Gradient Boosting",
        family="Ensemble (boosting)",
        imbalance_strategy="none",
        build=lambda _r: GradientBoostingClassifier(
            n_estimators=200, learning_rate=0.1, max_depth=3, subsample=0.9, random_state=RANDOM_STATE
        ),
    ),
    ModelSpec(
        key="xgboost",
        name="XGBoost",
        family="Ensemble (boosting)",
        imbalance_strategy="scale_pos_weight",
        build=lambda ratio: XGBClassifier(
            n_estimators=400,
            learning_rate=0.1,
            max_depth=6,
            subsample=0.9,
            colsample_bytree=0.5,
            scale_pos_weight=ratio,
            eval_metric="logloss",
            tree_method="hist",
            n_jobs=-1,
            random_state=RANDOM_STATE,
        ),
    ),
    ModelSpec(
        key="mlp",
        name="MLP Neural Network",
        family="Neural network",
        imbalance_strategy="none",
        build=lambda _r: MLPClassifier(
            hidden_layer_sizes=(128,),
            alpha=1e-4,
            max_iter=60,
            early_stopping=True,
            random_state=RANDOM_STATE,
        ),
    ),
]

PARAM_KEYS = [
    "C",
    "alpha",
    "max_depth",
    "n_estimators",
    "learning_rate",
    "n_neighbors",
    "kernel",
    "hidden_layer_sizes",
    "class_weight",
    "max_features",
    "subsample",
    "colsample_bytree",
    "metric",
    "weights",
]


def get_spec(key: str) -> ModelSpec:
    for spec in MODEL_REGISTRY:
        if spec.key == key:
            return spec
    raise KeyError(key)


def base_estimator(est: BaseEstimator) -> BaseEstimator:
    """Unwrap calibration wrappers so introspection reaches the underlying model."""
    if isinstance(est, CalibratedClassifierCV):
        fitted = getattr(est, "calibrated_classifiers_", None)
        return fitted[0].estimator if fitted else est.estimator
    return est


def describe_params(est: BaseEstimator) -> dict[str, Any]:
    est = base_estimator(est)
    out = {}
    for k, v in _params(est, PARAM_KEYS).items():
        out[k] = list(v) if isinstance(v, tuple) else v
    return out
