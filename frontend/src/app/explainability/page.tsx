import type { Metadata } from "next";
import { Binary, Clock, Layers, Microscope } from "lucide-react";

import { BarChart } from "@/components/charts/bar-chart";
import { COLORS } from "@/components/charts/theme";
import { PageHeader } from "@/components/layout/page-header";
import { ChartCard } from "@/components/sections/chart-card";
import { Insight } from "@/components/sections/insight";
import { Section } from "@/components/sections/section";
import { SourceBadge } from "@/components/sections/source-badge";
import { StatCard } from "@/components/sections/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportanceExplorer } from "@/components/xai/importance-explorer";
import { ShapWaterfall, type LocalExplanation } from "@/components/xai/shap-waterfall";
import { REASONING, SHAP_SCHEMA } from "@/content/explainability";
import { getEvaluation, getExplain } from "@/lib/api";
import type { GlobalImportance } from "@/types/artifacts";

export const metadata: Metadata = { title: "Explainable AI" };

export default async function ExplainabilityPage() {
  const [{ data: x, source }, { data: ev }] = await Promise.all([getExplain(), getEvaluation()]);
  const importance = x.global_importance as Record<string, GlobalImportance | null>;
  const models = ev.results.map((r) => ({ key: r.key, name: r.name, importance: importance[r.key] ?? null }));
  const lin = x.shap.linear;
  const lr = importance[ev.baseline];

  const engineeredInTop = (lr?.features ?? []).slice(0, 10).filter((f) => f.kind !== "token" && f.kind !== "bigram").length;
  const oddTokens = (lr?.features ?? [])
    .filter((f) => f.kind === "token" && f.direction === "spam")
    .map((f) => f.feature)
    .filter((t) => !["free", "txt", "text", "call", "reply", "mobile", "claim", "prize", "win", "stop", "won", "service", "urgent", "cash"].includes(t))
    .slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Security · Explainable AI"
        title="Explainable AI"
        description="Security teams cannot act on a black box. These panels show which features drive each model globally, and how individual messages are scored, so every block decision can be audited."
      >
        <SourceBadge source={source} />
      </PageHeader>

      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Features explained" value={x.feature_names_count.toLocaleString()} hint="After chi² selection" icon={Layers} tone="primary" />
        <StatCard label="Models with native importance" value={`${models.filter((m) => m.importance).length} / ${models.length}`} icon={Binary} />
        <StatCard label="Exact SHAP" value="Linear" hint={`${lin.explainer}`} icon={Microscope} tone="ham" />
        <StatCard label="Tree SHAP" value="Placeholder" hint="Schema ready for shap.TreeExplainer" icon={Clock} tone="warning" />
      </div>

      <Section id="importance" title="Feature importance" description="Global, model-native importance. Switch models to see how different algorithms weigh the same evidence.">
        <ChartCard
          title="Top predictive features"
          interpretation={
            <>
              Across models, <strong>engineered and pattern features</strong> ({engineeredInTop} of the baseline&apos;s top 10) such as digit count, phone
              numbers, and links dominate. Word-level features add campaign-specific cues. A few highly weighted tokens
              {oddTokens.length > 0 && <> (e.g. “{oddTokens.join("”, “")}”)</>} are artifacts of specific campaigns in the
              training data rather than general spam indicators. This overfitting risk is exactly what explainability is
              meant to surface.
            </>
          }
        >
          <ImportanceExplorer models={models} initial={ev.improved} />
        </ChartCard>
      </Section>

      <Section id="shap" title="SHAP analysis" description="SHapley Additive exPlanations attribute each prediction to its input features so that contributions sum exactly to the model output.">
        <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
          <ChartCard
            title="Global SHAP summary"
            description={`Mean |SHAP| over the test set · ${lin.model.replace("_", " ")}`}
            interpretation={
              <>
                Mean absolute SHAP measures how much each feature moves predictions on average. Digit count alone shifts
                the log-odds by {lin.global_summary[0].mean_abs_shap.toFixed(2)} on average, several times more than any single word.
              </>
            }
          >
            <BarChart
              ariaLabel="Global mean absolute SHAP values"
              data={lin.global_summary.slice(0, 12).map((f) => ({ feature: f.feature, value: f.mean_abs_shap, color: f.direction === "spam" ? COLORS.spam : COLORS.ham }))}
              xKey="feature"
              series={[{ key: "value", label: "mean |SHAP|", color: COLORS.primary }]}
              layout="vertical"
              categoryWidth={150}
              colorField="color"
              format="decimal2"
              height={380}
            />
          </ChartCard>
          <ChartCard title="Local explanation (waterfall)" description="Per-message SHAP values for the baseline model">
            <ShapWaterfall examples={lin.local_examples as LocalExplanation[]} />
          </ChartCard>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {x.shap.tree.map((t) => (
            <Card key={t.model} className="border-dashed bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                    {t.status}
                  </Badge>
                </div>
                <p className="font-mono text-xs text-muted-foreground">{t.explainer}</p>
              </CardHeader>
              <CardContent>
                <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background/40 text-center">
                  <Microscope className="h-5 w-5 text-muted-foreground" aria-hidden />
                  <p className="px-4 text-xs text-muted-foreground">{t.note}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mt-4 bg-card/50">
          <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1.2fr]">
            <div className="text-sm leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Placeholder contract</p>
              <p className="mt-1">
                Tree SHAP panels consume the same schema as the linear explainer. Populate <code className="text-primary">shap.tree[*].features</code> in{" "}
                <code className="text-primary">backend/ml/explain.py</code> and these cards render automatically, with no frontend change needed.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-lg border bg-background/60 p-3 font-mono text-xs text-foreground/90">{SHAP_SCHEMA}</pre>
          </CardContent>
        </Card>
      </Section>

      <Section id="reasoning" title="Model reasoning" description="How each model family arrives at a decision, and how to audit it.">
        <div className="grid gap-4 md:grid-cols-2">
          {REASONING.map((r) => (
            <div key={r.family} className="rounded-xl border bg-card/60 p-5">
              <p className="font-semibold">{r.family}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{r.how}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider text-primary">Audit · </span>
                {r.audit}
              </p>
            </div>
          ))}
        </div>
        <Insight title="Why this matters for security">
          Explanations turn a probability into evidence an analyst can verify (“blocked because it contains a premium-rate
          number and prize language”), support user appeals, reveal spurious correlations before attackers exploit them,
          and help satisfy regulatory requirements for automated decision-making.
        </Insight>
      </Section>
    </>
  );
}
