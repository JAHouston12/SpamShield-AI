import { pct } from "@/lib/format";
import type { EvaluationArtifact, ModelResult } from "@/types/artifacts";

export interface Findings {
  baseline: ModelResult;
  improved: ModelResult;
  best: ModelResult;
  fpReduction: number;
  headline: string;
  points: string[];
  answer: string;
}

/** Derive narrative findings from evaluation numbers so copy stays truthful after every retrain. */
export function deriveFindings(ev: EvaluationArtifact): Findings {
  const byKey = Object.fromEntries(ev.results.map((r) => [r.key, r])) as Record<string, ModelResult>;
  const baseline = byKey[ev.baseline];
  const improved = byKey[ev.improved];
  const best = byKey[ev.best_model];
  const b = baseline.metrics;
  const i = improved.metrics;
  const fpB = baseline.confusion_matrix.fp;
  const fpI = improved.confusion_matrix.fp;
  const fpReduction = fpB > 0 ? (fpB - fpI) / fpB : 0;

  const points: string[] = [];
  if (fpI < fpB) {
    points.push(
      `${improved.name} cut false positives from ${fpB} to ${fpI} (${pct(fpReduction, 0)} fewer legitimate messages blocked), raising precision from ${pct(b.precision)} to ${pct(i.precision)}.`,
    );
  } else {
    points.push(`${improved.name} produced ${fpI} false positives versus ${fpB} for the baseline.`);
  }
  points.push(
    `${improved.name} reached ${pct(i.accuracy)} accuracy and ${i.roc_auc.toFixed(4)} ROC-AUC versus ${pct(b.accuracy)} and ${b.roc_auc.toFixed(4)} for ${baseline.name}.`,
  );
  if (i.recall >= b.recall) {
    points.push(`Spam identification (recall) improved from ${pct(b.recall)} to ${pct(i.recall)}.`);
  } else {
    points.push(
      `Spam recall was ${pct(i.recall)} versus ${pct(b.recall)} for the baseline: ${improved.name} trades a few missed spam messages for far fewer false alarms.`,
    );
  }
  if (best.key !== improved.key) {
    points.push(
      `${best.name} ranked first overall (F1 ${pct(best.metrics.f1)}, ROC-AUC ${best.metrics.roc_auc.toFixed(4)}), showing that advanced ensembles can outperform the baseline.`,
    );
  }

  const advancedBeatBaseline = ev.ranking[0].key !== ev.baseline;
  const answer = advancedBeatBaseline
    ? `Yes. Advanced models outperform the Logistic Regression baseline: ${best.name} achieved the best overall score, and ${improved.name} delivered the highest precision-oriented improvement by reducing false positives.`
    : `Partially. The baseline remained competitive on F1, but ${improved.name} improved precision and reduced false positives.`;

  return {
    baseline,
    improved,
    best,
    fpReduction,
    headline: `${improved.name} reduces false positives by ${pct(fpReduction, 0)} versus the baseline`,
    points,
    answer,
  };
}
