export type Label = "spam" | "ham";
export type DetectionMode = "hybrid" | "ml";
export type RiskLevel = "low" | "elevated" | "high" | "critical";

export interface Contribution {
  feature: string;
  kind: string;
  value: number;
  contribution: number;
  direction: Label;
}

export interface ThreatSignal {
  id: string;
  label: string;
  detected: boolean;
  detail: string;
  severity: "low" | "medium" | "high";
  weight: number;
}

export interface PredictResponse {
  label: Label;
  is_spam: boolean;
  spam_probability: number;
  ml_probability: number;
  heuristic_boost: number;
  mode: DetectionMode;
  confidence: number;
  threshold: number;
  risk_level: RiskLevel;
  model: { key: string; name: string; family: string };
  cleaned_text: string;
  contributions: Contribution[];
  signals: ThreatSignal[];
  explanation: string;
  latency_ms: number;
}

export interface ModelVote {
  key: string;
  name: string;
  spam_probability: number;
  ml_probability: number;
  threshold: number;
  label: Label;
}

export interface CompareResponse {
  votes: ModelVote[];
  spam_votes: number;
  total: number;
  consensus: Label;
}
