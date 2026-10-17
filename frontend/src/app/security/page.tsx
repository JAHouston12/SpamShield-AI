import type { Metadata } from "next";
import {
  AlertOctagon,
  ArrowDown,
  ArrowRight,
  Ban,
  Bug,
  Fish,
  MailX,
  Megaphone,
  MessageSquareOff,
  Radio,
  Server,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";

import { BarChart } from "@/components/charts/bar-chart";
import { COLORS } from "@/components/charts/theme";
import { PageHeader } from "@/components/layout/page-header";
import { ChartCard } from "@/components/sections/chart-card";
import { Insight } from "@/components/sections/insight";
import { Section } from "@/components/sections/section";
import { SourceBadge } from "@/components/sections/source-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ATTACKS,
  DEPLOYMENT_FLOW,
  DIFFICULT_MESSAGES,
  FALSE_NEGATIVES,
  FALSE_POSITIVES,
  OPERATIONS,
  POLICY_BANDS,
} from "@/content/security";
import { getEvaluation, getExplain } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { GlobalImportance } from "@/types/artifacts";

export const metadata: Metadata = { title: "Security Analysis" };

const ATTACK_ICONS = { campaigns: Megaphone, phishing: Fish, malicious: Bug } as const;
const SEVERITY_TONE: Record<string, string> = {
  Medium: "border-warning/40 bg-warning/10 text-warning",
  High: "border-spam/40 bg-spam/10 text-spam",
  Critical: "border-spam/60 bg-spam/20 text-spam",
};
const FLOW_ICONS = [Radio, Server, ShieldAlert, Ban, AlertOctagon, TrendingDown];

function ErrorList({ title, items, tone }: { title: string; items: { message: string; spam_probability: number }[]; tone: "spam" | "warning" }) {
  return (
    <div>
      <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", tone === "spam" ? "text-spam" : "text-warning")}>{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None on the test set.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((e) => (
            <li key={e.message} className="rounded-lg border bg-background/50 p-3 text-sm">
              <p className="text-foreground/90">“{e.message}”</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">P(spam) = {e.spam_probability.toFixed(3)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function SecurityPage() {
  const [{ data: ev, source }, { data: xai }] = await Promise.all([getEvaluation(), getExplain()]);
  const byKey = Object.fromEntries(ev.results.map((r) => [r.key, r]));
  const improved = byKey[ev.improved];
  const baseline = byKey[ev.baseline];
  const rfImportance = xai.global_importance[ev.improved as keyof typeof xai.global_importance] as GlobalImportance | null;
  const topSpamFeatures = (rfImportance?.features ?? []).filter((f) => f.direction === "spam").slice(0, 10);

  const errorProfile = ev.results.map((r) => ({
    name: r.name.replace("Neural Network", "NN").replace("Support Vector Machine", "SVM").replace("K-Nearest Neighbors", "KNN"),
    fp: r.confusion_matrix.fp,
    fn: r.confusion_matrix.fn,
  }));
  const lowestFp = [...ev.results].sort((a, b) => a.confusion_matrix.fp - b.confusion_matrix.fp)[0];
  const lowestFn = [...ev.results].sort((a, b) => a.confusion_matrix.fn - b.confusion_matrix.fn)[0];

  return (
    <>
      <PageHeader
        eyebrow="Security · Analysis"
        title="Security Analysis"
        description="A spam classifier is a security control. This page interprets the models' behavior in terms of threats stopped, threats missed, and the operational cost of each kind of mistake."
      >
        <SourceBadge source={source} />
      </PageHeader>

      <Section id="attacks" title="What attacks are being detected?">
        <div className="grid gap-5 lg:grid-cols-3">
          {ATTACKS.map((a) => {
            const Icon = ATTACK_ICONS[a.id as keyof typeof ATTACK_ICONS];
            return (
              <Card key={a.id} className="flex flex-col bg-card/70">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-spam/10 ring-1 ring-spam/30">
                      <Icon className="h-4 w-4 text-spam" aria-hidden />
                    </span>
                    <Badge variant="outline" className={SEVERITY_TONE[a.severity]}>
                      {a.severity} severity
                    </Badge>
                  </div>
                  <CardTitle className="pt-3 text-lg">{a.title}</CardTitle>
                  <p className="text-sm leading-relaxed text-muted-foreground">{a.body}</p>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Indicators</p>
                    <ul className="space-y-1 text-sm">
                      {a.indicators.map((i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    {a.examples.map((ex) => (
                      <p key={ex} className="rounded-md border border-spam/20 bg-spam/5 px-3 py-2 font-mono text-xs text-foreground/90">
                        {ex}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section id="errors" title="The cost of mistakes" description="Spam filtering is a trade-off between two error types with very different consequences.">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-warning/30 bg-card/70">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquareOff className="h-5 w-5 text-warning" aria-hidden />
                <CardTitle>False positives: ham blocked</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                {improved.name}: <span className="font-mono text-foreground">{improved.confusion_matrix.fp}</span> · {baseline.name}:{" "}
                <span className="font-mono text-foreground">{baseline.confusion_matrix.fp}</span> legitimate messages blocked out of{" "}
                {improved.classification_report.ham.support}.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {[
                { t: "Consequences", items: FALSE_POSITIVES.consequences },
                { t: "Business impact", items: FALSE_POSITIVES.business },
                { t: "Communication loss", items: FALSE_POSITIVES.communication },
              ].map((g) => (
                <div key={g.t}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-warning">{g.t}</p>
                  <ul className="list-disc space-y-1 pl-5 text-foreground/90">
                    {g.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-spam/30 bg-card/70">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MailX className="h-5 w-5 text-spam" aria-hidden />
                <CardTitle>False negatives: threats delivered</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                {improved.name}: <span className="font-mono text-foreground">{improved.confusion_matrix.fn}</span> · {baseline.name}:{" "}
                <span className="font-mono text-foreground">{baseline.confusion_matrix.fn}</span> spam messages missed out of{" "}
                {improved.classification_report.spam.support}.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {[
                { t: "Security risks", items: FALSE_NEGATIVES.risks },
                { t: "Phishing exposure", items: FALSE_NEGATIVES.phishing },
                { t: "Malware delivery risk", items: FALSE_NEGATIVES.malware },
              ].map((g) => (
                <div key={g.t}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-spam">{g.t}</p>
                  <ul className="list-disc space-y-1 pl-5 text-foreground/90">
                    {g.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <ChartCard
          className="mt-6"
          title="Error profile by model"
          description="False positives (ham blocked) and false negatives (spam delivered) on the hold-out set"
          interpretation={
            <>
              <strong>{lowestFp.name}</strong> blocks the fewest legitimate messages ({lowestFp.confusion_matrix.fp}), while{" "}
              <strong>{lowestFn.name}</strong> lets the fewest threats through ({lowestFn.confusion_matrix.fn}). No model
              minimizes both. Organizations protecting high-value users (executives, finance) should favor low false
              negatives; consumer carriers, where blocking a 2FA code is costly, should favor low false positives.
            </>
          }
        >
          <BarChart
            ariaLabel="False positives and false negatives per model"
            data={errorProfile}
            xKey="name"
            series={[
              { key: "fp", label: "False positives", color: COLORS.warning },
              { key: "fn", label: "False negatives", color: COLORS.spam },
            ]}
            height={300}
          />
        </ChartCard>
      </Section>

      <Section id="difficult" title="Difficult messages to detect" description={`Real misclassifications by ${improved.name} on the test set, followed by the patterns behind them.`}>
        <Card className="mb-6 bg-card/70">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-2">
            <ErrorList title="Missed spam (false negatives)" items={improved.errors.false_negatives} tone="spam" />
            <ErrorList title="Blocked ham (false positives)" items={improved.errors.false_positives} tone="warning" />
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFICULT_MESSAGES.map((d) => (
            <div key={d.title} className="rounded-xl border bg-card/60 p-5">
              <p className="font-semibold">{d.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="features" title="Most important features" description={`Top spam indicators learned by ${improved.name}. Full analysis on the Explainable AI page.`}>
        <ChartCard
          title="Strongest spam signals"
          interpretation={
            <>
              Structural cues (digit counts, phone numbers, message length, capitalization) outrank individual words. That
              makes the model robust to vocabulary changes but vulnerable to attackers who send short, digit-free
              messages with a link, exactly the modern smishing pattern.
            </>
          }
        >
          <BarChart
            ariaLabel="Top spam-indicating features by importance"
            data={topSpamFeatures.map((f) => ({ feature: f.feature, importance: f.normalized }))}
            xKey="feature"
            series={[{ key: "importance", label: "Relative importance", color: COLORS.spam }]}
            layout="vertical"
            categoryWidth={150}
            format="percent0"
            height={340}
          />
        </ChartCard>
      </Section>

      <Section id="operations" title="Operational considerations">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OPERATIONS.map((o) => (
            <div key={o.title} className="rounded-xl border bg-card/60 p-5">
              <p className="font-semibold">{o.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="deployment" title="Real-world deployment" description="How SpamShield AI would run inside a carrier or enterprise security environment.">
        <Card className="bg-card/70">
          <CardContent className="p-6">
            <ol className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Deployment pipeline">
              {DEPLOYMENT_FLOW.map((s, i) => {
                const Icon = FLOW_ICONS[i];
                return (
                  <li key={s.id} className="relative">
                    <div className="h-full rounded-xl border bg-background/60 p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
                          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold">{s.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                    </div>
                    {i < DEPLOYMENT_FLOW.length - 1 && (
                      <>
                        <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-primary xl:block" aria-hidden />
                        <ArrowDown className="mx-auto mt-1 h-4 w-4 text-primary md:hidden" aria-hidden />
                      </>
                    )}
                  </li>
                );
              })}
            </ol>

            <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Policy bands (spam probability → action)</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {POLICY_BANDS.map((b) => (
                <div
                  key={b.action}
                  className={cn(
                    "rounded-lg border p-4",
                    b.tone === "ham" && "border-ham/30 bg-ham/5",
                    b.tone === "warning" && "border-warning/30 bg-warning/5",
                    b.tone === "spam" && "border-spam/30 bg-spam/5",
                  )}
                >
                  <p className="font-mono text-xs text-muted-foreground">{b.range}</p>
                  <p className={cn("mt-1 font-semibold", b.tone === "ham" ? "text-ham" : b.tone === "warning" ? "text-warning" : "text-spam")}>{b.action}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{b.detail}</p>
                </div>
              ))}
            </div>
            <Insight title="Deployment notes">
              The FastAPI service in this repository is the model-service tier. Scale it horizontally behind a load
              balancer, version models alongside their threshold and metrics, and shadow-deploy new models (score but
              do not act) before promotion. Explanations from the Explainable AI layer are attached to every quarantine
              decision so analysts and users can see why a message was held.
            </Insight>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
