import type { Metadata } from "next";
import { AlertTriangle, Award, ShieldCheck, Target, Trophy } from "lucide-react";

import { RadarChart } from "@/components/charts/radar-chart";
import { RocChart } from "@/components/charts/roc-chart";
import { COLORS } from "@/components/charts/theme";
import { ClassificationReport } from "@/components/evaluation/classification-report";
import { ConfusionMatrix } from "@/components/evaluation/confusion-matrix";
import { MetricComparison } from "@/components/evaluation/metric-comparison";
import { PageHeader } from "@/components/layout/page-header";
import { ChartCard } from "@/components/sections/chart-card";
import { Insight } from "@/components/sections/insight";
import { RoleBadge } from "@/components/sections/role-badge";
import { Section } from "@/components/sections/section";
import { SourceBadge } from "@/components/sections/source-badge";
import { StatCard } from "@/components/sections/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEvaluation } from "@/lib/api";
import { deriveFindings } from "@/lib/findings";
import { METRIC_KEYS, METRIC_LABELS, pct, signed } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Model Evaluation" };

export default async function EvaluationPage() {
  const { data: ev, source } = await getEvaluation();
  const f = deriveFindings(ev);
  const byKey = Object.fromEntries(ev.results.map((r) => [r.key, r]));
  const cmp = ev.baseline_vs_improved;
  const cv = ev.cross_validation as Record<string, Record<string, { mean: number; std: number }>>;

  const radarSeries = [
    { key: f.baseline.key, label: f.baseline.name, color: COLORS.warning },
    { key: f.improved.key, label: f.improved.name, color: COLORS.primary },
    ...(f.best.key !== f.baseline.key && f.best.key !== f.improved.key ? [{ key: f.best.key, label: f.best.name, color: COLORS.ham }] : []),
  ];
  const radarData: Record<string, string | number>[] = METRIC_KEYS.map((m) => ({
    metric: METRIC_LABELS[m],
    ...Object.fromEntries(radarSeries.map((s) => [s.key, byKey[s.key].metrics[m]])),
  }));
  const radarMin = Math.floor(Math.min(...radarData.flatMap((d) => radarSeries.map((s) => Number(d[s.key])))) * 50) / 50 - 0.02;

  return (
    <>
      <PageHeader
        eyebrow="Research · Evaluation"
        title="Model Evaluation"
        description={`All models are scored on the same untouched hold-out set of ${ev.test_size.toLocaleString()} messages. Decision thresholds were tuned on training data only (5-fold out-of-fold predictions), so the test set is never seen during model selection.`}
      >
        <SourceBadge source={source} />
      </PageHeader>

      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Top ranked" value={f.best.name} hint={`Composite ${ev.ranking[0].score.toFixed(4)}`} icon={Trophy} tone="ham" />
        <StatCard label="Baseline F1" value={pct(f.baseline.metrics.f1)} hint={f.baseline.name} icon={Target} tone="warning" />
        <StatCard label="Improved precision" value={pct(f.improved.metrics.precision)} hint={`${f.improved.name} · ${signed(cmp.metric_deltas.precision)}`} icon={ShieldCheck} tone="primary" />
        <StatCard label="False positives" value={`${cmp.false_positives.baseline} → ${cmp.false_positives.challenger}`} hint="Baseline → improved model" icon={Award} />
      </div>

      <Section id="ranking" title="Model ranking dashboard" description="Composite score = 0.4·F1 + 0.2·Precision + 0.2·Recall + 0.2·ROC-AUC, weighting F1 highest because it balances missed threats against false alarms.">
        <div className="overflow-x-auto rounded-xl border bg-card/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-14">Rank</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Score</TableHead>
                {METRIC_KEYS.map((m) => (
                  <TableHead key={m} className="text-right">{METRIC_LABELS[m]}</TableHead>
                ))}
                <TableHead className="text-right">FP</TableHead>
                <TableHead className="text-right">FN</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ev.ranking.map((rk) => {
                const r = byKey[rk.key];
                const bestOf = (m: (typeof METRIC_KEYS)[number]) => Math.max(...ev.results.map((x) => x.metrics[m]));
                return (
                  <TableRow key={rk.key} className={cn(rk.rank === 1 && "bg-ham/5")}>
                    <TableCell>
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs", rk.rank === 1 ? "bg-ham/20 text-ham" : rk.rank <= 3 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                        {rk.rank}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        <RoleBadge role={r.role} />
                      </div>
                      <span className="text-xs text-muted-foreground">{r.family}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">{rk.score.toFixed(4)}</TableCell>
                    {METRIC_KEYS.map((m) => (
                      <TableCell key={m} className={cn("text-right font-mono", r.metrics[m] === bestOf(m) && "text-ham")}>
                        {(r.metrics[m] * 100).toFixed(2)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-mono text-spam/90">{r.confusion_matrix.fp}</TableCell>
                    <TableCell className="text-right font-mono text-warning">{r.confusion_matrix.fn}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{r.threshold}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Green values mark the best score per metric. Metrics shown as percentages.</p>
      </Section>

      <Section id="baseline" title="Baseline vs. improved model" description="The core research comparison: Logistic Regression against Random Forest on identical features and data.">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <ChartCard title="Metric profile" description="Radar of all five metrics (axis zoomed)">
            <RadarChart ariaLabel="Radar comparison of baseline, improved, and top models" data={radarData} series={radarSeries} domain={[Math.max(0, radarMin), 1]} />
          </ChartCard>
          <Card className="bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Change vs. baseline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">{f.baseline.name}</TableHead>
                      <TableHead className="text-right">{f.improved.name}</TableHead>
                      <TableHead className="text-right">Δ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {METRIC_KEYS.map((m) => {
                      const d = cmp.metric_deltas[m];
                      return (
                        <TableRow key={m}>
                          <TableCell>{METRIC_LABELS[m]}</TableCell>
                          <TableCell className="text-right font-mono">{pct(f.baseline.metrics[m], 2)}</TableCell>
                          <TableCell className="text-right font-mono">{pct(f.improved.metrics[m], 2)}</TableCell>
                          <TableCell className={cn("text-right font-mono", d > 0 ? "text-ham" : d < 0 ? "text-spam" : "text-muted-foreground")}>{signed(d, 2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell>False positives</TableCell>
                      <TableCell className="text-right font-mono">{cmp.false_positives.baseline}</TableCell>
                      <TableCell className="text-right font-mono">{cmp.false_positives.challenger}</TableCell>
                      <TableCell className={cn("text-right font-mono", cmp.false_positives.challenger < cmp.false_positives.baseline ? "text-ham" : "text-spam")}>
                        {cmp.false_positives.challenger - cmp.false_positives.baseline}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>False negatives</TableCell>
                      <TableCell className="text-right font-mono">{cmp.false_negatives.baseline}</TableCell>
                      <TableCell className="text-right font-mono">{cmp.false_negatives.challenger}</TableCell>
                      <TableCell className={cn("text-right font-mono", cmp.false_negatives.challenger <= cmp.false_negatives.baseline ? "text-ham" : "text-spam")}>
                        {cmp.false_negatives.challenger - cmp.false_negatives.baseline > 0 ? "+" : ""}
                        {cmp.false_negatives.challenger - cmp.false_negatives.baseline}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {Object.keys(cv).length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">5-fold cross-validation on training set (threshold 0.5)</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(cv).map(([k, v]) => (
                      <div key={k} className="rounded-lg border bg-background/50 p-3 text-xs">
                        <p className="font-medium text-foreground">{byKey[k]?.name}</p>
                        <p className="mt-1 font-mono text-muted-foreground">
                          F1 {pct(v.f1.mean)} ± {pct(v.f1.std)} · AUC {v.roc_auc.mean.toFixed(4)}
                        </p>
                        <p className="font-mono text-muted-foreground">
                          P {pct(v.precision.mean)} · R {pct(v.recall.mean)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Insight title="Findings">
          <ul className="list-disc space-y-1 pl-5">
            {f.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-2">{f.answer}</p>
        </Insight>
        <div className="mt-3 flex gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-foreground/90">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p>{f.caveat}</p>
        </div>
      </Section>

      <Section id="comparison" title="Visual comparison of all models">
        <ChartCard title="Metric comparison" description="Select a metric to re-rank all models">
          <MetricComparison rows={ev.results.map((r) => ({ key: r.key, name: r.name, role: r.role, metrics: r.metrics }))} best={ev.best_model} />
        </ChartCard>
      </Section>

      <Section id="roc" title="ROC curves" description="True positive rate against false positive rate across all thresholds. Toggle models to compare; the zoomed panel shows the operating region that matters for a spam filter.">
        <Card className="bg-card/70">
          <CardContent className="p-5">
            <RocChart
              curves={ev.results.map((r) => ({ key: r.key, name: r.name, auc: r.metrics.roc_auc, points: r.roc_curve }))}
              initial={[ev.baseline, ev.improved, ev.best_model]}
            />
            <Insight>
              Every model hugs the top-left corner (ROC-AUC ≥ {Math.min(...ev.results.map((r) => r.metrics.roc_auc)).toFixed(3)}), meaning spam and ham are
              highly separable in TF-IDF space. The zoomed view shows where they differ: at very low false-positive
              rates, which is exactly where a production filter must operate.
            </Insight>
          </CardContent>
        </Card>
      </Section>

      <Section id="confusion" title="Confusion matrices" description="Counts on the hold-out set. Off-diagonal cells are errors: false positives block legitimate messages, false negatives let threats through.">
        <div className="mb-5 grid gap-4 md:grid-cols-2">
          <ConfusionMatrix name={`${f.baseline.name} (baseline)`} cm={f.baseline.confusion_matrix} />
          <ConfusionMatrix name={`${f.improved.name} (improved)`} cm={f.improved.confusion_matrix} highlight />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ev.results
            .filter((r) => r.key !== ev.baseline && r.key !== ev.improved)
            .map((r) => (
              <ConfusionMatrix key={r.key} name={r.name} cm={r.confusion_matrix} compact highlight={r.key === ev.best_model} />
            ))}
        </div>
      </Section>

      <Section id="reports" title="Classification reports" description="Per-class precision, recall, F1, and support, as produced by scikit-learn.">
        <Card className="bg-card/70">
          <CardContent className="p-5">
            <ClassificationReport
              initial={ev.improved}
              models={ev.results.map((r) => ({ key: r.key, name: r.name, threshold: r.threshold, report: r.classification_report }))}
            />
          </CardContent>
        </Card>
      </Section>

      <Section id="threshold" title="Threshold calibration" description="Effect of replacing the default 0.5 cut-off with a threshold tuned on out-of-fold training predictions.">
        <div className="overflow-x-auto rounded-xl border bg-card/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Tuned threshold</TableHead>
                <TableHead className="text-right">F1 @ 0.5</TableHead>
                <TableHead className="text-right">F1 @ tuned</TableHead>
                <TableHead className="text-right">Recall @ 0.5</TableHead>
                <TableHead className="text-right">Recall @ tuned</TableHead>
                <TableHead className="text-right">FP @ 0.5 → tuned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ev.results.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right font-mono">{r.threshold}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{pct(r.default_threshold.metrics.f1, 2)}</TableCell>
                  <TableCell className={cn("text-right font-mono", r.metrics.f1 > r.default_threshold.metrics.f1 && "text-ham")}>{pct(r.metrics.f1, 2)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{pct(r.default_threshold.metrics.recall, 2)}</TableCell>
                  <TableCell className={cn("text-right font-mono", r.metrics.recall > r.default_threshold.metrics.recall && "text-ham")}>{pct(r.metrics.recall, 2)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {r.default_threshold.confusion_matrix.fp} → {r.confusion_matrix.fp}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Insight>
          Ensembles such as Random Forest average many votes, so their spam probabilities rarely reach 0.5 for borderline
          messages. Lowering the threshold to the value that maximized F1 during training recovers recall without
          touching the test set. In production, this threshold is the main lever security teams tune to their risk
          appetite.
        </Insight>
      </Section>
    </>
  );
}
