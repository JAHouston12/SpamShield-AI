export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

export const num = (v: number) => v.toLocaleString("en-US");

export const signed = (v: number, digits = 1) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)} pts`;

export const METRIC_LABELS = {
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1: "F1 Score",
  roc_auc: "ROC-AUC",
} as const;

export const METRIC_KEYS = Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[];
