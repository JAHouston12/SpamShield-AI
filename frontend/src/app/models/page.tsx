import type { Metadata } from "next";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";

import { BarChart } from "@/components/charts/bar-chart";
import { COLORS } from "@/components/charts/theme";
import { PageHeader } from "@/components/layout/page-header";
import { Insight } from "@/components/sections/insight";
import { MetricBar } from "@/components/sections/metric-bar";
import { RoleBadge } from "@/components/sections/role-badge";
import { Section } from "@/components/sections/section";
import { SourceBadge } from "@/components/sections/source-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODEL_CONTENT } from "@/content/models";
import { getEvaluation, getModels } from "@/lib/api";

export const metadata: Metadata = { title: "Machine Learning Models" };

function formatParam(v: unknown): string {
  if (Array.isArray(v)) return `(${v.join(", ")})`;
  if (v === null) return "None";
  return String(v);
}

export default async function ModelsPage() {
  const [{ data: m, source }, { data: ev }] = await Promise.all([getModels(), getEvaluation()]);
  const results = Object.fromEntries(ev.results.map((r) => [r.key, r]));
  const rankOf = Object.fromEntries(ev.ranking.map((r) => [r.key, r.rank]));

  const overview = m.models.map((model) => ({
    name: model.name.replace("Neural Network", "NN").replace("Support Vector Machine", "SVM").replace("K-Nearest Neighbors", "KNN"),
    f1: results[model.key].metrics.f1,
    precision: results[model.key].metrics.precision,
    recall: results[model.key].metrics.recall,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Research · Models"
        title="Machine Learning Models"
        description="Ten classifiers spanning linear, probabilistic, instance-based, kernel, tree, ensemble, and neural families, all trained on the identical TF-IDF + engineered feature matrix so differences reflect the algorithm, not the data."
      >
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={source} />
          <Badge variant="secondary">{m.feature_count.toLocaleString()} input features</Badge>
        </div>
      </PageHeader>

      <Section id="design" title="Experimental design">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-warning/30 bg-card/70">
            <CardContent className="p-5">
              <RoleBadge role="baseline" />
              <p className="mt-3 font-semibold">Logistic Regression</p>
              <p className="mt-1 text-sm text-muted-foreground">The reference point. Every other model must beat it to justify its added complexity.</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-card/70">
            <CardContent className="p-5">
              <RoleBadge role="improved" />
              <p className="mt-3 font-semibold">Random Forest</p>
              <p className="mt-1 text-sm text-muted-foreground">The hypothesized improvement: an ensemble expected to reduce false positives and raise detection quality.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardContent className="p-5">
              <Badge variant="secondary">Extended comparison</Badge>
              <p className="mt-3 font-semibold">8 further models</p>
              <p className="mt-1 text-sm text-muted-foreground">Naive Bayes, Decision Tree, KNN, SVM, AdaBoost, Gradient Boosting, XGBoost, and an MLP neural network.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="overview" title="Performance overview" description="Hold-out F1, precision, and recall for every model. Full analysis is on the Evaluation page.">
        <Card className="bg-card/70">
          <CardContent className="p-5">
            <BarChart
              ariaLabel="F1, precision and recall per model"
              data={overview}
              xKey="name"
              series={[
                { key: "f1", label: "F1", color: COLORS.primary },
                { key: "precision", label: "Precision", color: COLORS.violet },
                { key: "recall", label: "Recall", color: COLORS.ham },
              ]}
              format="percent0"
              domain={[0.8, 1]}
              height={320}
            />
            <Insight>
              All ten models clear 90% F1 on this benchmark, so the meaningful differences lie in the precision-recall
              trade-off: some models block fewer legitimate messages, others catch more spam. That trade-off is what
              the security analysis weighs.
            </Insight>
          </CardContent>
        </Card>
      </Section>

      <Section id="cards" title="Model comparison cards">
        <div className="grid gap-5 lg:grid-cols-2">
          {m.models.map((model) => {
            const c = MODEL_CONTENT[model.key];
            const r = results[model.key];
            return (
              <Card key={model.key} className="flex flex-col bg-card/70 transition-colors hover:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{model.family}</p>
                      <CardTitle className="mt-1 text-lg">{model.name}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-mono text-sm text-muted-foreground">rank #{rankOf[model.key]}</span>
                      <RoleBadge role={model.role} best={rankOf[model.key] === 1} />
                    </div>
                  </div>
                  {c && <p className="pt-2 text-sm leading-relaxed text-foreground/90">{c.summary}</p>}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                    <MetricBar label="F1" value={r.metrics.f1} />
                    <MetricBar label="Precision" value={r.metrics.precision} />
                    <MetricBar label="Recall" value={r.metrics.recall} />
                    <MetricBar label="ROC-AUC" value={r.metrics.roc_auc} />
                  </div>

                  {c && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">How it works. </span>
                        {c.howItWorks}
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ham">Advantages</p>
                          <ul className="space-y-1 text-sm">
                            {c.advantages.map((a) => (
                              <li key={a} className="flex gap-2">
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ham" aria-hidden />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-spam">Limitations</p>
                          <ul className="space-y-1 text-sm">
                            {c.limitations.map((a) => (
                              <li key={a} className="flex gap-2">
                                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-spam" aria-hidden />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Cybersecurity relevance
                        </p>
                        <p className="text-foreground/90">{c.security}</p>
                      </div>
                    </>
                  )}

                  <div className="mt-auto flex flex-wrap gap-1.5 border-t pt-4">
                    <Badge variant="outline" className="font-mono text-[11px]">threshold {model.threshold}</Badge>
                    <Badge variant="outline" className="font-mono text-[11px]">train {model.train_time_s}s</Badge>
                    {Object.entries(model.params).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="font-mono text-[11px] font-normal">
                        {k}={formatParam(v)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Section>
    </>
  );
}
