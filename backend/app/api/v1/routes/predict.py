from fastapi import APIRouter, Depends, HTTPException

from app.schemas.prediction import CompareRequest, CompareResponse, PredictRequest, PredictResponse
from app.services.predictor import ModelUnavailableError, Predictor, UnknownModelError, get_predictor

router = APIRouter(tags=["detection"])


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, predictor: Predictor = Depends(get_predictor)) -> dict:
    try:
        return predictor.predict(req.text, req.model, req.mode)
    except UnknownModelError as exc:
        raise HTTPException(404, f"Unknown model '{exc.args[0]}'") from exc
    except ModelUnavailableError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post("/predict/compare", response_model=CompareResponse)
def compare(req: CompareRequest, predictor: Predictor = Depends(get_predictor)) -> dict:
    try:
        votes = predictor.compare(req.text, req.mode)
    except ModelUnavailableError as exc:
        raise HTTPException(503, str(exc)) from exc
    spam_votes = sum(v["label"] == "spam" for v in votes)
    return {
        "votes": votes,
        "spam_votes": spam_votes,
        "total": len(votes),
        "consensus": "spam" if spam_votes > len(votes) / 2 else "ham",
    }
