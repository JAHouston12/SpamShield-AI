/**
 * Documentation page content. Uses the same block format as the report so both pages share one renderer.
 * Values that change with training (record counts, model list) are passed in from the artifacts.
 */
import type { DocSection } from "@/content/report";
import { PROJECT, TECH_STACK } from "@/content/site";
import { SITE } from "@/lib/config";
import { num, pct } from "@/lib/format";
import type { DatasetArtifact, EvaluationArtifact, ModelsArtifact } from "@/types/artifacts";

export const API_ENDPOINTS = [
  { method: "GET", path: "/api/v1/health", description: "Liveness probe and API version" },
  { method: "GET", path: "/api/v1/manifest", description: "Training run metadata and library versions" },
  { method: "GET", path: "/api/v1/dataset/summary", description: "Dataset statistics and feature documentation" },
  { method: "GET", path: "/api/v1/dataset/sample?limit=20&label=spam", description: "Random labeled messages" },
  { method: "GET", path: "/api/v1/eda", description: "Distributions, duplicates, correlations" },
  { method: "GET", path: "/api/v1/preprocessing", description: "Cleaning, TF-IDF, scaling, selection, split" },
  { method: "GET", path: "/api/v1/models", description: "Registered models, roles, hyperparameters" },
  { method: "GET", path: "/api/v1/evaluation", description: "Metrics, ROC curves, confusion matrices, ranking" },
  { method: "GET", path: "/api/v1/evaluation/{model_key}", description: "Evaluation for one model" },
  { method: "GET", path: "/api/v1/explain", description: "Global importance and SHAP summaries" },
  { method: "POST", path: "/api/v1/predict", description: "Classify one message with one model" },
  { method: "POST", path: "/api/v1/predict/compare", description: "Classify one message with every model" },
] as const;

export function buildDocs({
  dataset,
  models,
  evaluation,
}: {
  dataset: DatasetArtifact;
  models: ModelsArtifact;
  evaluation: EvaluationArtifact;
}): DocSection[] {
  const byKey = Object.fromEntries(evaluation.results.map((r) => [r.key, r]));

  return [
    {
      id: "overview",
      title: "Project Overview",
      blocks: [
        { type: "p", text: `${PROJECT.title} is a full-stack research project on ${PROJECT.topic.toLowerCase()}. Its objective: ${PROJECT.objective.charAt(0).toLowerCase()}${PROJECT.objective.slice(1)}` },
        { type: "callout", title: "Research question", text: PROJECT.researchQuestion },
        {
          type: "table",
          head: ["Layer", "Technology"],
          rows: TECH_STACK.map((t) => [t.group, t.items.join(", ")]),
        },
        {
          type: "code",
          title: "repository layout",
          lang: "text",
          code: `backend/
  app/            FastAPI service (routes, schemas, predictor, threat signals)
  ml/             Training pipeline: data, preprocessing, registry, evaluate, explain, eda, train
  artifacts/      JSON results (committed) and models/*.joblib (generated)
  tests/          pytest suite for the API
frontend/
  src/app/        One folder per page (Next.js App Router)
  src/content/    All narrative copy: edit text here, not in components
  src/components/ charts/, sections/, evaluation/, xai/, detector/, report/, ui/ (shadcn)
  src/data/generated/  Snapshot of backend/artifacts used when the API is offline
Makefile          install, train, api, web, dev, test, lint, build`,
        },
      ],
    },
    {
      id: "installation",
      title: "Installation",
      blocks: [
        { type: "p", text: "Requirements: Python 3.12+, uv (Python package manager), Node.js 20+, and npm. Docker is optional." },
        {
          type: "code",
          title: "install",
          code: `git clone <your-repo-url> spamshield-ai
cd spamshield-ai
make install          # uv sync (backend) + npm install (frontend)`,
        },
        {
          type: "code",
          title: "train the models (≈45 s)",
          code: `make train            # downloads the dataset, trains 10 models, writes backend/artifacts/
                      # and copies the JSON snapshot to frontend/src/data/generated/`,
        },
      ],
    },
    {
      id: "dataset",
      title: "Dataset",
      blocks: [
        {
          type: "p",
          text: `${PROJECT.dataset}: ${num(dataset.records)} English SMS messages labeled ham or spam (${pct(dataset.spam_ratio)} spam). The trainer downloads the UCI release automatically. To use the Kaggle CSV instead, place it at backend/data/raw/spam.csv (columns v1 = label, v2 = message) and retrain.`,
        },
        {
          type: "list",
          items: [`UCI: ${SITE.uciUrl}`, `Kaggle: ${SITE.kaggleUrl}`, "Raw data is git-ignored; only derived statistics are committed."],
        },
      ],
    },
    {
      id: "models",
      title: "Models",
      blocks: [
        {
          type: "table",
          caption: "Registered models with their tuned decision threshold and hold-out F1.",
          head: ["Key", "Model", "Family", "Role", "Threshold", "F1"],
          rows: models.models.map((m) => [m.key, m.name, m.family, m.role, m.threshold.toFixed(2), byKey[m.key] ? byKey[m.key].metrics.f1.toFixed(4) : "–"]),
        },
        {
          type: "p",
          text: "Each saved model is a complete scikit-learn Pipeline (feature frame → TF-IDF + scaled meta features → chi² selection → classifier), so it accepts raw message strings directly.",
        },
        {
          type: "code",
          title: "add a model: backend/ml/registry.py",
          lang: "python",
          code: `ModelSpec(
    key="extra_trees",
    name="Extra Trees",
    family="Ensemble (bagging)",
    role="comparison",
    imbalance="class_weight='balanced'",
    build=lambda: ExtraTreesClassifier(n_estimators=300, class_weight="balanced", n_jobs=-1, random_state=SEED),
),`,
        },
        {
          type: "p",
          text: "Then run make train and add a matching entry to frontend/src/content/models.ts. Every chart, table, ranking, and the live detector pick the new model up automatically.",
        },
      ],
    },
    {
      id: "running",
      title: "Running Locally",
      blocks: [
        {
          type: "code",
          title: "development",
          code: `make dev              # API on http://127.0.0.1:8417, web on http://127.0.0.1:3417
# or in two terminals
make api
make web`,
        },
        {
          type: "code",
          title: "quality checks",
          code: `make test             # pytest (API + prediction contract)
make lint             # ruff + next lint
make build            # production Next.js build`,
        },
        {
          type: "code",
          title: "docker",
          code: `docker compose up --build   # trains inside the backend image, then serves both apps`,
        },
        {
          type: "kv",
          items: [
            { label: "API_URL", value: "Frontend → backend origin used by the /api/v1 proxy (default http://127.0.0.1:8417)" },
            { label: "SPAMSHIELD_DEFAULT_MODEL", value: "Model used when a request omits one (default random_forest)" },
            { label: "SPAMSHIELD_CORS_ORIGINS", value: "JSON list of allowed browser origins" },
            { label: "SPAMSHIELD_MAX_MESSAGE_CHARS", value: "Request size limit (default 5000)" },
          ],
        },
        {
          type: "p",
          text: "If the API is offline, every research page falls back to the bundled training snapshot (shown by a Snapshot badge). Only the live detector requires the API.",
        },
      ],
    },
    {
      id: "api",
      title: "API Usage",
      blocks: [
        { type: "p", text: "Interactive OpenAPI docs are served at http://127.0.0.1:8417/docs. All endpoints are versioned under /api/v1." },
        { type: "table", head: ["Method", "Path", "Description"], rows: API_ENDPOINTS.map((e) => [e.method, e.path, e.description]) },
        {
          type: "code",
          title: "classify a message",
          code: `curl -s -X POST http://127.0.0.1:8417/api/v1/predict \\
  -H "Content-Type: application/json" \\
  -d '{"text": "URGENT! Your account is locked. Verify now", "model": "random_forest", "mode": "hybrid"}'`,
        },
        {
          type: "code",
          title: "response (abridged)",
          lang: "json",
          code: `{
  "label": "spam",
  "is_spam": true,
  "spam_probability": 0.61,
  "ml_probability": 0.045,
  "heuristic_boost": 3.5,
  "mode": "hybrid",
  "threshold": 0.37,
  "risk_level": "high",
  "model": { "key": "random_forest", "name": "Random Forest" },
  "contributions": [{ "feature": "account", "contribution": 0.45, "direction": "spam" }],
  "signals": [{ "id": "credentials", "label": "Account / credential lure", "detected": true, "detail": "account, verify", "severity": "high", "weight": 1.5 }],
  "explanation": "Classified as spam with 61% confidence...",
  "latency_ms": 12.4
}`,
        },
        {
          type: "list",
          items: [
            'mode: "hybrid" (default) adds capped threat-signal evidence to the model\'s log-odds; "ml" returns the model score alone.',
            "Errors: 422 for empty or oversized text, 404 for an unknown model key, 503 when artifacts have not been trained yet.",
          ],
        },
      ],
    },
    {
      id: "future",
      title: "Future Improvements",
      blocks: [
        {
          type: "list",
          items: [
            ...PROJECT.futureWork,
            "Retrain on a modern smishing corpus to address concept drift since 2011",
            "Add sender-reputation and URL-intelligence features (domain age, shortener expansion)",
            "Adversarial robustness testing with obfuscated and padded variants",
            "Persist predictions and analyst feedback (PostgreSQL) for continuous retraining",
            "Exact tree SHAP values for ensemble models in the Explainable AI page",
          ],
        },
      ],
    },
  ];
}
