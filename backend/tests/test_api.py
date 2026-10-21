import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

client = TestClient(app)
MODELS_PRESENT = (get_settings().artifacts_dir / "models" / "random_forest.joblib").exists()
needs_models = pytest.mark.skipif(not MODELS_PRESENT, reason="trained models missing; run `make train`")


def test_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.parametrize(
    "path",
    [
        "/manifest",
        "/dataset/summary",
        "/dataset/sample",
        "/eda",
        "/preprocessing",
        "/models",
        "/evaluation",
        "/explain",
    ],
)
def test_artifact_endpoints(path):
    res = client.get(f"/api/v1{path}")
    assert res.status_code == 200, res.text
    assert res.json()


def test_evaluation_has_all_models():
    data = client.get("/api/v1/evaluation").json()
    assert len(data["results"]) == 10
    assert {r["rank"] for r in data["ranking"]} == set(range(1, 11))
    for r in data["results"]:
        assert set(r["metrics"]) == {"accuracy", "precision", "recall", "f1", "roc_auc"}


def test_unknown_model_evaluation_404():
    assert client.get("/api/v1/evaluation/nope").status_code == 404


def test_sample_filter():
    rows = client.get("/api/v1/dataset/sample?label=spam").json()["rows"]
    assert rows and all(r["label"] == "spam" for r in rows)


@needs_models
def test_predict_spam():
    res = client.post("/api/v1/predict", json={"text": "Congratulations! You've won a free iPhone. Click now."})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["label"] == "spam"
    assert body["threshold"] <= body["spam_probability"] <= 1
    assert body["explanation"]
    assert any(s["detected"] for s in body["signals"])


@needs_models
def test_predict_delivery_smishing_signal():
    text = "Your parcel could not be delivered. Reschedule here: dhl-parcel.top/x8k2 before it is returned."
    body = client.post("/api/v1/predict", json={"text": text}).json()
    hits = {s["id"] for s in body["signals"] if s["detected"]}
    assert {"link", "delivery"} <= hits
    assert body["label"] == "spam"


@needs_models
def test_predict_ham():
    res = client.post("/api/v1/predict", json={"text": "Hey, are we still meeting for lunch at 1? I'll be a bit late."})
    assert res.status_code == 200
    assert res.json()["label"] == "ham"


@needs_models
@pytest.mark.parametrize("model", ["logistic_regression", "naive_bayes", "svm", "xgboost", "mlp", "knn"])
def test_predict_each_model(model):
    res = client.post(
        "/api/v1/predict", json={"text": "WINNER! Claim your £1000 prize, call 09061701461", "model": model}
    )
    assert res.status_code == 200, res.text
    assert res.json()["model"]["key"] == model


@needs_models
def test_ml_mode_reports_raw_probability():
    body = client.post("/api/v1/predict", json={"text": "Hey, lunch at 1?", "mode": "ml"}).json()
    assert body["mode"] == "ml"
    assert body["heuristic_boost"] == 0
    assert body["spam_probability"] == body["ml_probability"]


@needs_models
def test_hybrid_flags_modern_phishing():
    body = client.post(
        "/api/v1/predict", json={"text": "URGENT! Your account is locked, verify at bit.ly/x now"}
    ).json()
    assert body["label"] == "spam"
    assert body["heuristic_boost"] > 0


@needs_models
def test_compare():
    body = client.post(
        "/api/v1/predict/compare", json={"text": "URGENT! Your account is locked, verify at bit.ly/x"}
    ).json()
    assert body["total"] == 10
    assert len(body["votes"]) == 10


def test_predict_validation():
    assert client.post("/api/v1/predict", json={"text": "   "}).status_code == 422
    assert client.post("/api/v1/predict", json={"text": "x" * 6000}).status_code == 422


@needs_models
def test_predict_unknown_model():
    assert client.post("/api/v1/predict", json={"text": "hello", "model": "nope"}).status_code == 404
