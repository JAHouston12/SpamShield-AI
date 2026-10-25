.PHONY: install install-backend install-frontend train ddos snapshot api web dev test lint build

BACKEND_PORT ?= 8417
FRONTEND_PORT ?= 3417

install: install-backend install-frontend

install-backend:
	cd backend && uv sync

install-frontend:
	cd frontend && npm install

## Train all models and write artifacts, then copy the JSON snapshot into the frontend.
train:
	cd backend && uv run python -m ml.train
	$(MAKE) snapshot

## Assignment 7: download CIC-IDS2017 (Friday DDoS), analyse it, and refresh the frontend snapshot.
ddos:
	cd backend && uv run python -m ml.ddos
	$(MAKE) snapshot

snapshot:
	mkdir -p frontend/src/data/generated
	cp backend/artifacts/*.json frontend/src/data/generated/

api:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port $(BACKEND_PORT)

web:
	cd frontend && npm run dev -- --hostname 0.0.0.0 --port $(FRONTEND_PORT)

dev:
	$(MAKE) -j2 api web

test:
	cd backend && uv run pytest -q

lint:
	cd backend && uv run ruff check .
	cd frontend && npm run lint

build:
	cd frontend && npm run build
