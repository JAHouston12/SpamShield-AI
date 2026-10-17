# SpamShield AI

**Spam Detection Using Machine Learning.** A full-stack cybersecurity research project that trains ten classifiers on the SMS Spam Collection Dataset, compares an improved model (Random Forest) against a baseline (Logistic Regression), and presents the results in an interactive dashboard with a live spam detector.

> **Research question:** Can machine learning techniques improve spam detection accuracy compared to a baseline classification model?

| Page | What it shows |
| --- | --- |
| Home | Project overview, research question, objectives, headline results |
| Dataset | Source, statistics, engineered features, labeled sample browser |
| EDA | Class balance, length distributions, top words, duplicates, correlation heatmap |
| Preprocessing | Cleaning, TF-IDF, scaling, chi² selection, imbalance handling, split |
| ML Models | The ten classifiers: how they work, strengths, limits, security relevance |
| Evaluation | Metric comparison, ranking, ROC curves, confusion matrices, cross-validation |
| Security Analysis | Threat taxonomy, false-positive vs false-negative cost, deployment flow |
| Explainable AI | Global feature importance, exact linear SHAP waterfall, reasoning |
| Live Detector | Classify any message, with hybrid threat signals, word attribution, and the votes of all ten models |
| Docs | Installation, API reference, extending the project |
| Report | Proposal, final report, and presentation outline (printable to PDF) |
| Assignments | Course assignments with the original PDFs, newest first |

## Quick start

Requirements: **Python 3.12+** with [uv](https://docs.astral.sh/uv/), **Node.js 20+**.

```bash
make install   # backend deps (uv sync) + frontend deps (npm install)
make train     # download dataset, train 10 models (~45 s), write artifacts + frontend snapshot
make dev       # API → http://127.0.0.1:8417  ·  Web → http://127.0.0.1:3417
```

Or run each half in its own terminal with `make api` and `make web`. Interactive API docs: <http://127.0.0.1:8417/api/v1/docs>.

With Docker:

```bash
docker compose up --build
```

Other targets: `make test` (pytest), `make lint` (ruff + ESLint), `make build` (production Next.js build), `make snapshot` (re-copy JSON artifacts into the frontend).

## Results

All numbers in the UI, report, and slides are read from the training artifacts, so they update after every `make train`. From the committed run (1,035-message hold-out set):

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC | False positives |
| --- | --- | --- | --- | --- | --- | --- |
| Logistic Regression (baseline) | 0.9903 | 0.9764 | 0.9466 | 0.9612 | 0.9980 | 3 |
| Random Forest (improved) | 0.9894 | 0.9839 | 0.9313 | 0.9569 | 0.9982 | 2 |

Random Forest reduces false positives and raises precision and ROC-AUC. The tuned baseline stays slightly ahead on recall and F1, so the dashboard reports the research answer as **"partially"**. The margins are a handful of messages, within cross-validation spread. The narrative is generated from the metrics (`frontend/src/lib/findings.ts`), so it changes automatically if a retrain flips the outcome.

## Architecture

```text
backend/                       Python · FastAPI · scikit-learn · XGBoost
  ml/
    data.py                    Load Kaggle CSV or auto-download UCI release
    preprocessing.py           clean_text, engineered features, TF-IDF + scaling + chi² pipeline
    registry.py                ★ The 10 models (one ModelSpec each)
    evaluate.py                Metrics, OOF threshold tuning, composite ranking
    explain.py                 Global importance, exact linear SHAP explainer
    eda.py                     Statistics for the EDA/Dataset pages
    train.py                   Orchestrates everything → artifacts/
  app/
    api/v1/routes/             health · insights (read-only artifacts) · predict
    services/predictor.py      Model loading, hybrid scoring, explanations
    services/signals.py        Threat-signal heuristics (links, credential lures, urgency…)
    schemas/                   Pydantic request/response models
  artifacts/                   *.json results and models/*.joblib (both committed; regenerate with make train)
  tests/                       API contract tests

frontend/                      Next.js 14 App Router · TypeScript · Tailwind · shadcn/ui · Recharts
  src/app/<page>/page.tsx      One folder per page (server components)
  src/content/                 ★ All narrative copy: edit text here, not in components
  src/components/
    charts/                    Bar, donut, ROC, radar, heatmap (shared theme)
    sections/                  Section, StatCard, ChartCard, Insight… page building blocks
    evaluation/ xai/ detector/ report/   Feature-specific components
    ui/                        shadcn/ui primitives
  src/lib/api.ts               Server fetch with automatic snapshot fallback
  src/lib/findings.ts          Generates conclusions from metrics
  src/data/generated/          Snapshot of backend/artifacts (used when the API is offline)
```

**Data flow.** `make train` writes JSON artifacts and serialized pipelines. The API serves both. Pages fetch from the API on the server and fall back to the bundled snapshot when it's unreachable (shown by a *Snapshot* badge), so every research page renders without the backend. Only the live detector needs the API. Browser calls go through a same-origin Next.js rewrite (`/api/v1/*`), which avoids CORS.

**Fair comparison.** Every model is a full scikit-learn `Pipeline` over identical features and an identical stratified 80/20 split, de-duplicated before splitting. Each decision threshold is chosen from 5-fold out-of-fold training predictions, never from the test set.

**Hybrid detection.** The 2011 corpus predates modern smishing (courier and bank impersonation, URL shorteners). In `hybrid` mode the detector adds capped, weighted threat-signal evidence in log-odds space, and the explanation states when that layer changed the verdict. Use `"mode": "ml"` for the pure model score.

## Extending the project

The structure is designed so each kind of update touches one obvious place.

| To… | Do this |
| --- | --- |
| **Add a model** | Add a `ModelSpec` to `backend/ml/registry.py`, run `make train`, add copy to `frontend/src/content/models.ts`. Charts, ranking, the detector, and the report pick it up automatically. |
| **Change the baseline / improved model** | Set `role` in the registry and update `PROJECT.baseline/improved` in `frontend/src/content/site.ts`. |
| **Edit any text** | `frontend/src/content/*.ts` (site, preprocessing, models, security, explainability, detector, docs, report). |
| **Add a report section or slide** | Append a `DocSection` / `Slide` in `frontend/src/content/report.ts`. |
| **Add an assignment** | Put the PDF in `frontend/public/assignments/` and append an entry to `frontend/src/content/assignments.ts`. The list and detail pages are generated from it. |
| **Add a page** | Create `frontend/src/app/<route>/page.tsx` and add one entry to `NAV_ITEMS` in `frontend/src/lib/nav.ts` (sidebar, mobile nav, and home cards update). |
| **Add an API endpoint** | Add a route module under `backend/app/api/v1/routes/` and include it in `router.py`. Add a test in `backend/tests/`. |
| **Add a threat signal** | Add one `sig(...)` line in `backend/app/services/signals.py`. |
| **Use the Kaggle CSV** | Place it at `backend/data/raw/spam.csv` and run `make train`. |

## Configuration

| Variable | Used by | Default |
| --- | --- | --- |
| `API_URL` | Frontend (server fetch + rewrite proxy, **build-time** for the proxy) | `http://127.0.0.1:8417` |
| `SPAMSHIELD_DEFAULT_MODEL` | Backend | `random_forest` |
| `SPAMSHIELD_CORS_ORIGINS` | Backend (JSON list) | `["http://localhost:3417","http://127.0.0.1:3417"]` |
| `SPAMSHIELD_MAX_MESSAGE_CHARS` | Backend | `5000` |

No secrets are required.

## Deployment notes

### Vercel (recommended)

`vercel.json` deploys both halves as one project using Vercel Services. `/api/*` goes to the FastAPI service in `backend/`, and everything else goes to the Next.js service in `frontend/`. Both share one domain, so there's no CORS and no `API_URL` to set.

1. In Vercel, **Add New → Project** and import the GitHub repository. Leave the Root Directory as the repository root, since `vercel.json` defines the services.
2. Deploy. No environment variables or secrets are required.

Things to know:

- **Committed models.** The trained models in `backend/artifacts/models/` (about 16 MB) are committed, so Vercel serves predictions without a training step. After `make train`, commit the updated artifacts and models.
- **Bundle size.** The backend uses `xgboost-cpu` rather than `xgboost`, which keeps the Python bundle around 320 MB. The standard `xgboost` wheel pulls in about 345 MB of CUDA libraries and exceeds Vercel's 500 MB function limit.
- **Previews.** On protected preview deployments, server-rendered pages can't call their own API, so they show the bundled snapshot (same data). The live detector still works, because it calls the API from the browser.
- **API docs.** The interactive API docs are at `/api/v1/docs` on the deployed domain.

### Containers

- **Frontend:** `frontend/Dockerfile` builds a Node server using `output: "standalone"`. Set `API_URL` at build time.
- **Backend:** `backend/Dockerfile` serves the committed models. Pass `--build-arg TRAIN=1` to retrain inside the image (about 45 s). It runs on Fly.io, Render, Railway, Cloud Run, or any container host. It is stateless, so it scales horizontally.
- **Database (future):** none is needed today; all state is read-only artifacts. To log predictions and analyst feedback for retraining, add PostgreSQL (e.g. Neon or Supabase) behind a `services/` repository module. Store decisions and scores rather than message bodies, to limit personal data retention.
- **Model storage:** for larger models, move `artifacts/models/` to object storage (S3/GCS) and load at startup, keyed by the manifest's `trained_at`.

## Dataset

Almeida, T. A., Gómez Hidalgo, J. M., & Yamakami, A. (2011). *Contributions to the study of SMS spam filtering: New collection and results.* ACM DocEng '11. Available from the [UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/228/sms+spam+collection) and [Kaggle](https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset). Raw data is downloaded on demand and not committed.
