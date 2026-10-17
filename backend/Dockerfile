FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# libgomp is required by XGBoost and scikit-learn's OpenMP estimators.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app
COPY ml ./ml
COPY artifacts ./artifacts

# Committed models are served as-is. Set TRAIN=1 to retrain inside the image (downloads the dataset).
ARG TRAIN=0
RUN if [ "$TRAIN" = "1" ]; then uv run --no-dev python -m ml.train; fi

EXPOSE 8417
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8417/api/v1/health')"

CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8417"]
