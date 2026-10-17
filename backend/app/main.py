from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.services.artifact_store import ArtifactNotFoundError


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="Spam detection API backed by TF-IDF features and ten scikit-learn / XGBoost classifiers.",
        docs_url="/docs",
        openapi_url=f"{settings.api_prefix}/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.exception_handler(ArtifactNotFoundError)
    async def artifact_missing(_: Request, exc: ArtifactNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
