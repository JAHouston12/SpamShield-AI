/**
 * Academic deliverables (proposal, final report, presentation) built from the training artifacts.
 * Prose lives here; every number is read from the artifacts so the documents stay correct after a retrain.
 * To add a section: append a `DocSection` to the relevant array. To add a slide: append to `slides`.
 */
import { METHODOLOGY, PROJECT, REFERENCES } from "@/content/site";
import { ATTACKS } from "@/content/security";
import { deriveFindings } from "@/lib/findings";
import { num, pct } from "@/lib/format";
import type {
  DatasetArtifact,
  EdaArtifact,
  EvaluationArtifact,
  ExplainArtifact,
  PreprocessingArtifact,
} from "@/types/artifacts";

export const REPORT_TABS = ["proposal", "report", "presentation"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; caption?: string; head: string[]; rows: (string | number)[][]; highlightRow?: number }
  | { type: "kv"; items: { label: string; value: string }[] }
  | { type: "callout"; title: string; text: string }
  | { type: "code"; code: string; lang?: string; title?: string };

export interface DocSection {
  id: string;
  title: string;
  blocks: DocBlock[];
}

export interface Slide {
  title: string;
  kicker: string;
  bullets: string[];
  stat?: { value: string; label: string };
  notes: string;
}

export interface ReportBundle {
  meta: { title: string; subtitle: string; course: string; generatedFrom: string };
  proposal: DocSection[];
  report: DocSection[];
  slides: Slide[];
}

export interface ReportInputs {
  dataset: DatasetArtifact;
  eda: EdaArtifact;
  preprocessing: PreprocessingArtifact;
  evaluation: EvaluationArtifact;
  explain: ExplainArtifact;
  trainedAt: string;
}

const f4 = (v: number) => v.toFixed(4);

export function buildReport({ dataset, eda, preprocessing, evaluation, explain, trainedAt }: ReportInputs): ReportBundle {
  const findings = deriveFindings(evaluation);
  const { baseline, improved, best } = findings;
  const split = preprocessing.split;
  const dup = preprocessing.duplicates;
  const lengths = Object.fromEntries(eda.length_stats.map((s) => [s.label, s]));
  const topSpam = explain.global_importance.logistic_regression.features
    .filter((f) => f.direction === "spam")
    .slice(0, 8)
    .map((f) => f.feature);
  const minAccuracy = Math.floor(Math.min(...evaluation.results.map((r) => r.metrics.accuracy)) * 100) / 100;
  const cv = evaluation.cross_validation as Record<string, Record<string, { mean: number; std: number }>>;
  const cvRow = (key: string, name: string) => [
    name,
    ...(["accuracy", "precision", "recall", "f1", "roc_auc"] as const).map(
      (m) => `${f4(cv[key][m].mean)} ± ${cv[key][m].std.toFixed(3)}`,
    ),
  ];

  const resultsTable: DocBlock = {
    type: "table",
    caption: `Table 2. Hold-out test results (n = ${num(evaluation.test_size)}), ranked by composite score.`,
    head: ["Rank", "Model", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC", "FP", "FN"],
    rows: evaluation.ranking.map((r) => {
      const m = evaluation.results.find((x) => x.key === r.key)!;
      return [
        r.rank,
        m.name,
        f4(m.metrics.accuracy),
        f4(m.metrics.precision),
        f4(m.metrics.recall),
        f4(m.metrics.f1),
        f4(m.metrics.roc_auc),
        m.confusion_matrix.fp,
        m.confusion_matrix.fn,
      ];
    }),
    highlightRow: evaluation.ranking.findIndex((r) => r.key === improved.key),
  };

  const comparisonTable: DocBlock = {
    type: "table",
    caption: `Table 1. Baseline versus improved model on the same features and split.`,
    head: ["Metric", baseline.name, improved.name, "Δ"],
    rows: [
      ...(["accuracy", "precision", "recall", "f1", "roc_auc"] as const).map((m) => [
        m === "roc_auc" ? "ROC-AUC" : m === "f1" ? "F1" : m[0].toUpperCase() + m.slice(1),
        f4(baseline.metrics[m]),
        f4(improved.metrics[m]),
        `${improved.metrics[m] - baseline.metrics[m] >= 0 ? "+" : ""}${f4(improved.metrics[m] - baseline.metrics[m])}`,
      ]),
      ["False positives", baseline.confusion_matrix.fp, improved.confusion_matrix.fp, improved.confusion_matrix.fp - baseline.confusion_matrix.fp],
      ["False negatives", baseline.confusion_matrix.fn, improved.confusion_matrix.fn, improved.confusion_matrix.fn - baseline.confusion_matrix.fn],
    ],
  };

  const datasetKv: DocBlock = {
    type: "kv",
    items: [
      { label: "Dataset", value: PROJECT.dataset },
      { label: "Records", value: `${num(dataset.records)} (${num(dup.after)} after de-duplication)` },
      { label: "Classes", value: `ham ${num(dataset.classes.ham)} · spam ${num(dataset.classes.spam)} (${pct(dataset.spam_ratio)} spam)` },
      { label: "Raw features", value: "Message text (one free-text field) and a binary label" },
      { label: "Engineered features", value: `${dataset.num_engineered_features} message-level signals plus TF-IDF n-grams` },
      { label: "Language", value: dataset.language },
    ],
  };

  const proposal: DocSection[] = [
    {
      id: "title",
      title: "Project Title",
      blocks: [
        { type: "p", text: `${PROJECT.title}: ${PROJECT.topic}` },
        { type: "p", text: `Topic area: communication security and machine-learning–based content filtering.` },
      ],
    },
    { id: "dataset", title: "Dataset", blocks: [
      { type: "p", text: `The study uses the ${PROJECT.dataset} (Almeida et al., 2011), a public corpus of English SMS messages labeled as legitimate (ham) or spam, obtained from Kaggle (spam.csv).` },
      datasetKv,
    ] },
    { id: "problem", title: "Security Problem", blocks: [
      { type: "p", text: PROJECT.securityProblem },
      { type: "list", items: ATTACKS.map((a) => `${a.title} (${a.severity} severity): ${a.body}`) },
    ] },
    { id: "question", title: "Research Question", blocks: [
      { type: "callout", title: "RQ", text: PROJECT.researchQuestion },
      { type: "p", text: `Hypothesis: ${PROJECT.hypothesis}` },
    ] },
    { id: "methodology", title: "Methodology", blocks: [
      { type: "list", ordered: true, items: METHODOLOGY.map((m) => `${m.step}: ${m.detail}`) },
      { type: "p", text: `Baseline model: ${PROJECT.baseline.name}. Improved model: ${PROJECT.improved.name}. Additional models: ${PROJECT.futureModels.join(", ")}.` },
      { type: "p", text: `Evaluation metrics: ${PROJECT.metrics.join(", ")}, supported by confusion matrices and 5-fold cross-validation.` },
    ] },
    { id: "expected", title: "Expected Results", blocks: [
      { type: "p", text: `It is expected that ${PROJECT.statedFinding.charAt(0).toLowerCase()}${PROJECT.statedFinding.slice(1)}` },
      { type: "list", items: [
        "Fewer legitimate messages incorrectly blocked (lower false-positive rate).",
        "Higher or comparable spam recall at a tuned decision threshold.",
        "Interpretable evidence of which message features drive spam decisions.",
        "A working detector that demonstrates the model in a realistic workflow.",
      ] },
    ] },
  ];

  const report: DocSection[] = [
    { id: "introduction", title: "1. Introduction", blocks: [
      { type: "p", text: `SMS remains a high-trust channel: messages are short, read within minutes, and frequently contain links. That makes it an attractive vector for fraud. This report evaluates whether machine learning can classify SMS messages as spam or legitimate more effectively than a baseline model.` },
      { type: "p", text: `Objective: ${PROJECT.objective}` },
      { type: "callout", title: "Research question", text: PROJECT.researchQuestion },
    ] },
    { id: "security-problem", title: "2. Security Problem", blocks: [
      { type: "p", text: PROJECT.securityProblem },
      { type: "p", text: `Errors carry asymmetric costs. A false positive blocks a legitimate message (a bank code, a delivery update, a message from family), eroding trust in the filter. A false negative delivers a scam or phishing link to the user. Model selection must therefore weigh precision and recall, not accuracy alone.` },
    ] },
    { id: "dataset", title: "3. Dataset Description", blocks: [
      datasetKv,
      { type: "p", text: `The corpus is imbalanced: ${pct(dataset.spam_ratio)} of messages are spam. Spam messages are markedly longer (median ${lengths.spam?.median_chars} characters versus ${lengths.ham?.median_chars} for ham) and contain more digits, currency symbols, and calls to action.` },
      { type: "p", text: `The label and message columns contain no missing values. The Kaggle CSV's three overflow columns are over 99% empty; they hold the tail of ${num(preprocessing.missing.rows_rejoined)} messages that contained commas, which were rejoined. ${num(preprocessing.missing.rows_encoding_repaired)} messages with mis-encoded characters were repaired. ${num(dup.removed)} exact duplicate messages (${pct(dup.removed / dup.before)}) were found, mostly repeated spam broadcasts.` },
    ] },
    { id: "preprocessing", title: "4. Data Preprocessing", blocks: [
      { type: "list", ordered: true, items: [
        `Rejoining comma-split message fragments and repairing mis-encoded characters in the Kaggle CSV.`,
        `De-duplication before splitting (${num(dup.before)} → ${num(dup.after)} messages) to prevent train/test leakage.`,
        "Text normalization: HTML-entity decoding, lower-casing, and masking of URLs, e-mail addresses, phone numbers, currency amounts, and other numbers with placeholder tokens.",
        `TF-IDF vectorization of unigrams and bigrams with sublinear term frequency (${num(preprocessing.selection.features_before - dataset.num_engineered_features)} terms retained).`,
        `${dataset.num_engineered_features} engineered features (length, digit count, uppercase ratio, URL/currency flags, and more), min-max scaled.`,
        `Chi-squared feature selection to the ${num(preprocessing.selection.features_after)} most informative features.`,
        `Stratified 80/20 split (seed ${split.random_state}): ${num(split.train.total)} training and ${num(split.test.total)} test messages.`,
        `Class imbalance (ham:spam ≈ ${preprocessing.imbalance.ham_to_spam_ratio.toFixed(1)}:1) handled with class weights where the algorithm supports them.`,
      ] },
    ] },
    { id: "methodology", title: "5. Methodology", blocks: [
      { type: "p", text: `${PROJECT.baseline.name} serves as the baseline: a well-understood linear model on sparse TF-IDF features. ${PROJECT.improved.name} is the proposed improvement: an ensemble of decorrelated decision trees that can model feature interactions. Eight further classifiers (${PROJECT.futureModels.join(", ")}) provide context.` },
      { type: "p", text: "All models are full scikit-learn pipelines trained on identical features and the same split. Each model's decision threshold is selected from 5-fold out-of-fold predictions on the training set only, so the test set stays untouched until final scoring. Models are ranked by a composite score: 0.4·F1 + 0.2·Precision + 0.2·Recall + 0.2·ROC-AUC." },
    ] },
    { id: "results", title: "6. Experimental Results", blocks: [
      comparisonTable,
      ...findings.points.map((text) => ({ type: "p", text }) as DocBlock),
      resultsTable,
      { type: "table", caption: "Table 3. 5-fold cross-validation on the training set (mean ± std).", head: ["Model", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC"], rows: [cvRow(baseline.key, baseline.name), cvRow(improved.key, improved.name)] },
      { type: "callout", title: "Answer to the research question", text: findings.answer },
    ] },
    { id: "security-analysis", title: "7. Security Analysis", blocks: [
      { type: "p", text: `${improved.name} produced ${improved.confusion_matrix.fp} false positive(s) and ${improved.confusion_matrix.fn} false negative(s) on ${num(evaluation.test_size)} test messages. In deployment, its high precision (${pct(improved.metrics.precision)}) means automated blocking rarely affects legitimate users, while borderline messages can be tagged rather than dropped.` },
      { type: "p", text: `The strongest spam indicators learned by the baseline were ${topSpam.join(", ")}. These match known fraud tradecraft: premium-rate numbers, prize claims, and urgent calls to reply.` },
      { type: "p", text: "Because the 2011 corpus under-represents modern smishing (delivery and bank impersonation with shortened links), the live detector adds a capped threat-signal layer in log-odds space. This hybrid design keeps the learned model in charge while surfacing patterns the training data never saw." },
    ] },
    { id: "limitations", title: "8. Limitations", blocks: [
      { type: "list", items: [
        findings.caveat,
        "The dataset dates from 2011 and is UK- and Singapore-centric. Modern smishing, URL shorteners, and emoji-heavy spam are under-represented (concept drift).",
        "Only message text is used. Production filters also use sender reputation, sending rate, and URL intelligence.",
        "A single hold-out split is reported. Repeated or nested cross-validation would tighten confidence intervals.",
        "Models were not evaluated against adversarial obfuscation (character substitution, padding with benign words).",
      ] },
    ] },
    { id: "conclusion", title: "9. Conclusion", blocks: [
      { type: "p", text: `Machine learning detects SMS spam with high accuracy: all ${evaluation.results.length} models exceeded ${pct(minAccuracy, 0)} accuracy, and ${best.name} ranked first overall. ${findings.headline}.` },
      { type: "p", text: `The expected finding was that "${PROJECT.statedFinding}" The measured results support the precision and false-positive part of this claim. Recall gains depend on the decision threshold, so the improvement is best described as a more conservative, lower-false-alarm operating profile.` },
      { type: "p", text: `Future work: ${PROJECT.futureWork.join("; ")}.` },
    ] },
    { id: "references", title: "References", blocks: [{ type: "list", items: [...REFERENCES] }] },
  ];

  const slides: Slide[] = [
    { kicker: "01 · Problem", title: "SMS spam is a security problem", bullets: [
      "Scams, phishing links, and premium-rate fraud reach users on a high-trust channel",
      "Manual filtering does not scale; rules are easy to evade",
      PROJECT.researchQuestion,
    ], notes: "Open with a real smishing example from the detector, then pose the research question." },
    { kicker: "02 · Dataset", title: PROJECT.dataset, bullets: [
      `${num(dataset.records)} labeled English messages; ${num(dup.removed)} duplicates removed`,
      `Imbalanced: ${pct(dataset.spam_ratio)} spam`,
      `Spam is longer (median ${lengths.spam?.median_chars} vs ${lengths.ham?.median_chars} chars) and digit-heavy`,
    ], stat: { value: num(dataset.records), label: "messages" }, notes: "Show the class distribution and length histogram from the EDA page." },
    { kicker: "03 · Methodology", title: "One pipeline, ten models", bullets: [
      "Clean → mask URLs/numbers → TF-IDF (1–2 grams) + 8 engineered features → chi² selection",
      `Stratified 80/20 split; thresholds tuned on out-of-fold training predictions`,
      `Baseline: ${PROJECT.baseline.name} · Improved: ${PROJECT.improved.name} · plus 8 more`,
    ], notes: "Emphasize fairness: identical features, split, and threshold procedure for every model." },
    { kicker: "04 · Results", title: findings.headline, bullets: [
      `${improved.name}: precision ${pct(improved.metrics.precision)}, ROC-AUC ${f4(improved.metrics.roc_auc)}, ${improved.confusion_matrix.fp} false positives`,
      `${baseline.name}: precision ${pct(baseline.metrics.precision)}, ROC-AUC ${f4(baseline.metrics.roc_auc)}, ${baseline.confusion_matrix.fp} false positives`,
      `Best overall: ${best.name} (F1 ${pct(best.metrics.f1)})`,
    ], stat: { value: pct(improved.metrics.precision), label: `${improved.name} precision` }, notes: "Walk through the confusion matrices; stress that margins are small." },
    { kicker: "05 · Security implications", title: "Fewer false alarms, auditable decisions", bullets: [
      "High precision lets the filter block automatically without silencing legitimate users",
      "Explainable attributions show analysts why each message was flagged",
      "Hybrid threat signals cover modern smishing the 2011 data lacks",
    ], notes: "Demo the live detector with the prize-scam and bank-phishing presets." },
    { kicker: "06 · Conclusion", title: "ML improves SMS spam defense", bullets: [
      `All ${evaluation.results.length} models exceed ${pct(minAccuracy, 0)} accuracy; ${best.name} ranks first overall`,
      evaluation.ranking[0].key === baseline.key
        ? `Answer: partially. ${improved.name} gives a lower-false-alarm, higher-precision profile; the tuned baseline stays competitive on F1`
        : `Answer: yes. ${best.name} outperforms the ${baseline.name} baseline`,
      `Future work: ${PROJECT.futureWork.slice(1).join(", ").toLowerCase()}`,
    ], notes: "Close on limitations (dataset age, drift) and the roadmap." },
  ];

  return {
    meta: {
      title: `${PROJECT.title}: ${PROJECT.topic}`,
      subtitle: PROJECT.objective,
      course: "Cybersecurity · Machine Learning Project",
      generatedFrom: trainedAt,
    },
    proposal,
    report,
    slides,
  };
}
