import "server-only";

import datasetSnapshot from "@/data/generated/dataset.json";
import edaSnapshot from "@/data/generated/eda.json";
import evaluationSnapshot from "@/data/generated/evaluation.json";
import explainSnapshot from "@/data/generated/explain.json";
import manifestSnapshot from "@/data/generated/manifest.json";
import modelsSnapshot from "@/data/generated/models.json";
import preprocessingSnapshot from "@/data/generated/preprocessing.json";
import { SERVER_API_BASE } from "@/lib/config";
import type {
  DatasetArtifact,
  EdaArtifact,
  EvaluationArtifact,
  ExplainArtifact,
  Loaded,
  ManifestArtifact,
  ModelsArtifact,
  PreprocessingArtifact,
} from "@/types/artifacts";

const REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 2500;

/**
 * Fetch an artifact from the API, falling back to the bundled snapshot when the backend is unreachable.
 * Pages therefore always render, which matters for demos and static hosting.
 */
async function load<T>(path: string, snapshot: T): Promise<Loaded<T>> {
  try {
    const res = await fetch(`${SERVER_API_BASE}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return { data: (await res.json()) as T, source: "live" };
  } catch {
    return { data: snapshot, source: "snapshot" };
  }
}

export async function getDataset(): Promise<Loaded<DatasetArtifact>> {
  const [summary, sample] = await Promise.all([
    load("/dataset/summary", datasetSnapshot as Omit<DatasetArtifact, "sample">),
    load("/dataset/sample?limit=50", { rows: datasetSnapshot.sample }),
  ]);
  return {
    data: { ...(summary.data as DatasetArtifact), sample: sample.data.rows },
    source: summary.source === "live" && sample.source === "live" ? "live" : "snapshot",
  };
}

export const getEda = () => load<EdaArtifact>("/eda", edaSnapshot);
export const getPreprocessing = () => load<PreprocessingArtifact>("/preprocessing", preprocessingSnapshot);
export const getModels = () => load<ModelsArtifact>("/models", modelsSnapshot);
export const getEvaluation = () => load<EvaluationArtifact>("/evaluation", evaluationSnapshot as EvaluationArtifact);
export const getExplain = () => load<ExplainArtifact>("/explain", explainSnapshot as ExplainArtifact);
export const getManifest = () => load<ManifestArtifact>("/manifest", manifestSnapshot);
