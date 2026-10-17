import { pct } from "@/lib/format";
import type { EvaluationArtifact, ModelResult } from "@/types/artifacts";

export interface Findings {
  baseline: ModelResult;
  improved: ModelResult;
  best: ModelResult;
  fpReduction: number;
  correctDelta: number;
  headline: string;
  points: string[];
  answer: string;
  caveat: string;
}

const correct = (r: ModelResult) => r.confusion_matrix.tp + r.confusion_matrix.tn;

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
  const correctDelta = correct(improved) - correct(baseline);

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
      `Spam recall was ${pct(i.recall)} versus ${pct(b.recall)} for the baseline: ${improved.name} trades ${improved.confusion_matrix.fn - baseline.confusion_matrix.fn} additional missed spam message(s) for fewer false alarms.`,
    );
  }
  if (best.key !== improved.key && best.key !== baseline.key) {
    points.push(
      `${best.name} ranked first overall (F1 ${pct(best.metrics.f1)}, ROC-AUC ${best.metrics.roc_auc.toFixed(4)}).`,
    );
  }

  const baselineWins = ev.ranking[0].key === ev.baseline;
  const answer = baselineWins
    ? `Partially. On F1 the tuned Logistic Regression baseline remains the strongest single model, which is common for linear models on sparse TF-IDF text. ${improved.name} improves precision and ROC-AUC${fpI < fpB ? ` and reduces false positives by ${pct(fpReduction, 0)}` : ""}, the property that matters most when blocking legitimate messages is costly.`
    : `Yes. ${best.name} achieved the best overall score, outperforming the ${baseline.name} baseline${fpI < fpB ? `, and ${improved.name} reduced false positives by ${pct(fpReduction, 0)}` : ""}.`;

  const caveat = `All ten models are separated by small margins: ${improved.name} and the baseline differ by ${Math.abs(correctDelta)} correctly classified message(s) out of ${ev.test_size}. Cross-validation spreads (± std) are of the same order, so the ranking should be read as a trade-off profile rather than a decisive winner.`;

  return {
    baseline,
    improved,
    best,
    fpReduction,
    correctDelta,
    headline:
      fpI < fpB
        ? `${improved.name} reduces false positives by ${pct(fpReduction, 0)} versus the baseline`
        : `${best.name} leads ${ev.results.length} evaluated models`,
    points,
    answer,
    caveat,
  };
}
