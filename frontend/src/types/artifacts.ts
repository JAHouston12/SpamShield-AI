import type datasetJson from "@/data/generated/dataset.json";
import type edaJson from "@/data/generated/eda.json";
import type evaluationJson from "@/data/generated/evaluation.json";
import type explainJson from "@/data/generated/explain.json";
import type manifestJson from "@/data/generated/manifest.json";
import type modelsJson from "@/data/generated/models.json";
import type preprocessingJson from "@/data/generated/preprocessing.json";

/**
 * Artifact types are inferred from the bundled snapshot so they stay in sync with `make train` output.
 * The backend Pydantic schemas in backend/app/schemas mirror the prediction types below.
 */
export type DatasetArtifact = typeof datasetJson;
export type EdaArtifact = typeof edaJson;
export type PreprocessingArtifact = typeof preprocessingJson;
export type ModelsArtifact = typeof modelsJson;
export type EvaluationArtifact = typeof evaluationJson;
export type ExplainArtifact = typeof explainJson;
export type ManifestArtifact = typeof manifestJson;

export type ModelResult = EvaluationArtifact["results"][number];
export type ModelMeta = ModelsArtifact["models"][number];
export type MetricKey = "accuracy" | "precision" | "recall" | "f1" | "roc_auc";

export interface ImportanceFeature {
  feature: string;
  raw: string;
  kind: string;
  weight: number;
  normalized: number;
  direction: "spam" | "ham";
}

export interface GlobalImportance {
  method: string;
  signed_by_model: boolean;
  features: ImportanceFeature[];
}

export type DataSource = "live" | "snapshot";

export interface Loaded<T> {
  data: T;
  source: DataSource;
}
