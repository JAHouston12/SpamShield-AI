"""Read-only endpoints that serve training artifacts."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.services.artifact_store import ArtifactStore, get_artifact_store

router = APIRouter()


@router.get("/manifest", tags=["meta"])
def manifest(store: ArtifactStore = Depends(get_artifact_store)) -> dict:
    return {**store.get("manifest"), "artifacts": store.available()}


@router.get("/dataset/summary", tags=["dataset"])
def dataset_summary(store: ArtifactStore = Depends(get_artifact_store)) -> dict:
    data = store.get("dataset")
    return {k: v for k, v in data.items() if k != "sample"}


@router.get("/dataset/sample", tags=["dataset"])
def dataset_sample(
    limit: int = Query(20, ge=1, le=50),
    label: str | None = Query(None, pattern="^(ham|spam)$"),
    store: ArtifactStore = Depends(get_artifact_store),
) -> dict:
    rows = store.get("dataset")["sample"]
    if label:
        rows = [r for r in rows if r["label"] == label]
    return {"rows": rows[:limit]}


@router.get("/eda", tags=["analysis"])
def eda(store: ArtifactStore = Depends(get_artifact_store)) -> dict:
    return store.get("eda")


@router.get("/preprocessing", tags=["analysis"])
def preprocessing(store: ArtifactStore = Depends(get_artifact_store)) -> dict:
    return store.get("preprocessing")


@router.get("/models", tags=["models"])
def models(store: ArtifactStore = Depends(get_artifact_store)) -> dict:
    return store.get("models")


@router.get("/evaluation", tags=["models"])
def evaluation(store: ArtifactStore = Depends(get_artifact_store)) -> dict:
    return store.get("evaluation")


@router.get("/evaluation/{model_key}", tags=["models"])
def evaluation_for_model(model_key: str, store: ArtifactStore = Depends(get_artifact_store)) -> dict:
    for result in store.get("evaluation")["results"]:
        if result["key"] == model_key:
            return result
    raise HTTPException(404, f"Unknown model '{model_key}'")


@router.get("/explain", tags=["explainability"])
def explain(store: ArtifactStore = Depends(get_artifact_store)) -> dict:
    return store.get("explain")


@router.get("/explain/features", tags=["explainability"])
def explain_features(model: str = Query("random_forest"), store: ArtifactStore = Depends(get_artifact_store)) -> dict:
    importance = store.get("explain")["global_importance"]
    if model not in importance:
        raise HTTPException(404, f"Unknown model '{model}'")
    if importance[model] is None:
        raise HTTPException(422, f"Model '{model}' does not expose native feature importance")
    return {"model": model, **importance[model]}
