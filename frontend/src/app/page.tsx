import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  Fish,
  Link2,
  MailWarning,
  ScanSearch,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";

import { Section } from "@/components/sections/section";
import { NavCards } from "@/components/sections/nav-cards";
import { SourceBadge } from "@/components/sections/source-badge";
import { StatCard } from "@/components/sections/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OBJECTIVES, PROJECT, TECH_STACK } from "@/content/site";
import { getDataset, getEvaluation, getManifest } from "@/lib/api";
import { deriveFindings } from "@/lib/findings";
import { num, pct } from "@/lib/format";

const THREATS = [
  { icon: Fish, title: "Phishing", body: "Messages impersonating banks, carriers, or services to harvest credentials." },
  { icon: Wallet, title: "Scams & fraud", body: "Fake prizes, lotteries, and premium-rate traps that extract money." },
  { icon: Link2, title: "Malicious links", body: "Shortened or look-alike URLs that deliver malware or fake login pages." },
  { icon: MailWarning, title: "Unwanted content", body: "Bulk marketing campaigns that erode trust and bury real messages." },
];

export default async function HomePage() {
  const [{ data: dataset }, { data: ev, source }, { data: manifest }] = await Promise.all([
    getDataset(),
    getEvaluation(),
    getManifest(),
  ]);
  const f = deriveFindings(ev);

  return (
    <>
      <section className="relative -mx-4 -mt-8 mb-14 overflow-hidden border-b px-4 pb-14 pt-14 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-20">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div className="animate-fade-up">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 font-mono text-primary">
                Cybersecurity · Machine Learning
              </Badge>
              <SourceBadge source={source} trainedAt={manifest.trained_at} />
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Stop SMS spam and phishing <span className="text-gradient">before it lands.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              SpamShield AI trains and audits ten machine learning classifiers on the SMS Spam Collection to answer one
              question: can advanced models beat a baseline at keeping malicious messages out?
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/detector">
                  <ScanSearch className="mr-2 h-4 w-4" /> Try the live detector
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/evaluation">
                  View model results <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Card className="animate-fade-up border-primary/20 bg-card/80 shadow-2xl shadow-primary/5 backdrop-blur [animation-delay:120ms]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Headline result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg font-semibold leading-snug">{f.headline}</p>
              <dl className="grid grid-cols-2 gap-3">
                {[
                  { k: "Accuracy", v: pct(f.improved.metrics.accuracy) },
                  { k: "Precision", v: pct(f.improved.metrics.precision) },
                  { k: "ROC-AUC", v: f.improved.metrics.roc_auc.toFixed(3) },
                  { k: "False positives", v: `${f.baseline.confusion_matrix.fp} → ${f.improved.confusion_matrix.fp}` },
                ].map((m) => (
                  <div key={m.k} className="rounded-lg border bg-background/60 p-3">
                    <dt className="text-xs text-muted-foreground">{m.k}</dt>
                    <dd className="mt-0.5 font-mono text-lg font-semibold text-primary">{m.v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted-foreground">
                {f.improved.name} vs. {f.baseline.name} baseline on {num(ev.test_size)} held-out messages.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Section id="overview" title="Project overview" description={PROJECT.topic}>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/70 md:col-span-2">
            <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-foreground/90">
              <p>
                <span className="font-semibold text-foreground">Objective. </span>
                {PROJECT.objective}
              </p>
              <p>
                The pipeline vectorizes every message with TF-IDF, adds eight engineered signals (length, digits, links,
                currency, capitalization), and trains a <strong>{PROJECT.baseline.name}</strong> baseline against a{" "}
                <strong>{PROJECT.improved.name}</strong> challenger, followed by eight additional models from Naive Bayes
                to an MLP neural network.
              </p>
              <p>
                Results are interpreted as a security control: what each error type costs an organization, which
                attacks slip through, and how the detector would run in production.
              </p>
            </CardContent>
          </Card>
          <div className="grid gap-4">
            <StatCard label="Models evaluated" value={String(ev.results.length)} icon={BrainCircuit} tone="primary" />
            <StatCard label="Best overall" value={f.best.name} hint={`F1 ${pct(f.best.metrics.f1)}`} icon={Target} tone="ham" />
          </div>
        </div>
      </Section>

      <Section
        id="problem"
        title="The security problem"
        description={PROJECT.securityProblem}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THREATS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="bg-card/70">
              <CardContent className="p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-spam/10 ring-1 ring-spam/30">
                  <Icon className="h-4 w-4 text-spam" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="question" title="Research question">
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="p-6 sm:p-8">
            <blockquote className="text-balance text-xl font-semibold leading-snug sm:text-2xl">
              “{PROJECT.researchQuestion}”
            </blockquote>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Answer from the experiment</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{f.answer}</p>
              </div>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
                {f.points.slice(0, 3).map((p) => (
                  <li key={p} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ham" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section id="objectives" title="Key objectives">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OBJECTIVES.map((o, i) => (
            <li key={o.title} className="rounded-xl border bg-card/60 p-5">
              <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-semibold">{o.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <div className="mb-14 grid gap-6 lg:grid-cols-2">
        <Section id="dataset-summary" title="Dataset summary" className="mb-0">
          <Card className="bg-card/70">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" aria-hidden />
                <p className="font-semibold">{dataset.name}</p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div>
                  <p className="font-mono text-2xl font-semibold">{num(dataset.records)}</p>
                  <p className="text-xs text-muted-foreground">messages</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-semibold text-ham">{num(dataset.classes.ham)}</p>
                  <p className="text-xs text-muted-foreground">ham</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-semibold text-spam">{num(dataset.classes.spam)}</p>
                  <p className="text-xs text-muted-foreground">spam</p>
                </div>
              </div>
              <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${pct(1 - dataset.spam_ratio)} ham, ${pct(dataset.spam_ratio)} spam`}>
                <div className="bg-ham" style={{ width: `${(1 - dataset.spam_ratio) * 100}%` }} />
                <div className="bg-spam" style={{ width: `${dataset.spam_ratio * 100}%` }} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                English SMS messages labeled ham or spam. Only {pct(dataset.spam_ratio)} are spam, so the project treats
                class imbalance as a first-class concern.
              </p>
              <Button asChild variant="link" className="mt-2 h-auto px-0">
                <Link href="/dataset">
                  Full dataset documentation <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </Section>

        <Section id="stack" title="Technology stack" className="mb-0">
          <Card className="h-full bg-card/70">
            <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
              {TECH_STACK.map((g) => (
                <div key={g.group}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {g.items.map((it) => (
                      <li key={it}>
                        <Badge variant="secondary" className="font-normal">
                          {it}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>
      </div>

      <Section id="explore" title="Explore the project" description="Each section maps to a deliverable in the proposal, final report, and presentation.">
        <NavCards />
      </Section>
    </>
  );
}
