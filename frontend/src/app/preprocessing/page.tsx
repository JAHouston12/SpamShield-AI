import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { BarChart } from "@/components/charts/bar-chart";
import { COLORS } from "@/components/charts/theme";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/sections/section";
import { SourceBadge } from "@/components/sections/source-badge";
import { StepCard } from "@/components/sections/step-card";
import { Badge } from "@/components/ui/badge";
import { PREPROCESSING_STEPS, type PreprocessingStep } from "@/content/preprocessing";
import { getPreprocessing } from "@/lib/api";
import { num } from "@/lib/format";
import type { PreprocessingArtifact } from "@/types/artifacts";

export const metadata: Metadata = { title: "Data Preprocessing" };

function Flow({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-2">
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{it.label}</p>
            <p className={`font-mono text-lg font-semibold ${it.tone ?? ""}`}>{it.value}</p>
          </div>
          {i < items.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
        </div>
      ))}
    </div>
  );
}

const VISUAL_LABEL = "mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function highlightTokens(text: string) {
  return text.split(" ").map((t, i) => (
    <span key={i} className={t.endsWith("token") ? "rounded bg-primary/15 px-1 text-primary" : undefined}>
      {t.endsWith("token") ? `<${t.replace("token", "").toUpperCase()}>` : t}{" "}
    </span>
  ));
}

function Visual({ id, p }: { id: PreprocessingStep["id"]; p: PreprocessingArtifact }) {
  switch (id) {
    case "missing":
      return (
        <>
          <p className={VISUAL_LABEL}>Records through the missing-value filter</p>
          <Flow
            items={[
              { label: "Raw rows", value: num(p.missing.raw_records) },
              { label: "Removed", value: num(p.missing.removed), tone: p.missing.removed ? "text-warning" : "text-ham" },
              { label: "Complete rows", value: num(p.missing.records_after), tone: "text-primary" },
            ]}
          />
          <p className="mt-4 text-sm text-muted-foreground">
            {p.missing.merged_columns.length
              ? `${num(p.missing.rows_rejoined)} messages containing commas had spilled into ${p.missing.merged_columns.join(", ")}; those fragments were rejoined into the message. ${num(p.missing.rows_encoding_repaired)} messages had mis-encoded characters (e.g. “å£” for “£”) repaired.`
              : "No overflow columns in this file."}
          </p>
        </>
      );
    case "duplicates":
      return (
        <>
          <p className={VISUAL_LABEL}>Deduplication</p>
          <Flow
            items={[
              { label: "Before", value: num(p.duplicates.before) },
              { label: "Duplicates", value: `−${num(p.duplicates.removed)}`, tone: "text-warning" },
              { label: "Unique", value: num(p.duplicates.after), tone: "text-primary" },
            ]}
          />
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${p.duplicates.removed} of ${p.duplicates.before} rows removed`}>
            <div className="h-full bg-primary" style={{ width: `${(p.duplicates.after / p.duplicates.before) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {((p.duplicates.removed / p.duplicates.before) * 100).toFixed(1)}% of rows were exact repeats.
          </p>
        </>
      );
    case "cleaning":
      return (
        <>
          <p className={VISUAL_LABEL}>Before → after</p>
          <ul className="space-y-3">
            {p.cleaning_examples.slice(0, 3).map((ex) => (
              <li key={ex.original} className="rounded-lg border bg-card p-3 text-sm">
                <p className="text-muted-foreground">{ex.original}</p>
                <p className="mt-2 font-mono text-xs leading-relaxed text-foreground">{highlightTokens(ex.cleaned)}</p>
              </li>
            ))}
          </ul>
        </>
      );
    case "tfidf":
      return (
        <>
          <p className={VISUAL_LABEL}>Highest-weighted terms in one spam message</p>
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">“{p.tfidf.example_message}”</p>
          <BarChart
            ariaLabel="TF-IDF weights of terms in an example spam message"
            data={p.tfidf.example_terms.slice(0, 8).map((t) => ({ ...t, term: t.term.replace(/numtoken/g, "<NUM>").replace(/phonetoken/g, "<PHONE>") }))}
            xKey="term"
            series={[{ key: "weight", label: "TF-IDF weight", color: COLORS.primary }]}
            layout="vertical"
            categoryWidth={110}
            format="decimal2"
            height={240}
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">vocabulary {num(p.tfidf.vocabulary_size)}</Badge>
            <Badge variant="secondary">n-grams 1–2</Badge>
            <Badge variant="secondary">min_df {p.tfidf.min_df}</Badge>
            <Badge variant="secondary">sublinear TF</Badge>
          </div>
        </>
      );
    case "scaling":
      return (
        <>
          <p className={VISUAL_LABEL}>Raw range → scaled to [0, 1]</p>
          <ul className="space-y-2">
            {p.scaling.features.map((f) => (
              <li key={f.feature} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md border bg-card px-3 py-1.5 text-xs">
                <span className="font-mono text-foreground/90">{f.feature}</span>
                <span className="font-mono text-warning">
                  {f.min} – {f.max}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                <span className="font-mono text-primary">0 – 1</span>
              </li>
            ))}
          </ul>
        </>
      );
    case "selection":
      return (
        <>
          <p className={VISUAL_LABEL}>Top features by chi² score</p>
          <Flow
            items={[
              { label: "Candidate features", value: num(p.selection.features_before) },
              { label: "Selected (chi²)", value: num(p.selection.features_after), tone: "text-primary" },
            ]}
          />
          <div className="mt-4">
            <BarChart
              ariaLabel="Highest chi-squared scores"
              data={p.selection.top_scores.slice(0, 10).map((s) => ({ ...s, feature: s.feature.replace(/numtoken/g, "<NUM>").replace(/phonetoken/g, "<PHONE>").replace(/currencytoken/g, "<CURRENCY>") }))}
              xKey="feature"
              series={[{ key: "chi2", label: "chi²", color: COLORS.violet }]}
              layout="vertical"
              categoryWidth={150}
              height={280}
            />
          </div>
        </>
      );
    case "imbalance":
      return (
        <>
          <p className={VISUAL_LABEL}>Class weights from training distribution</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ham : spam</p>
              <p className="font-mono text-lg font-semibold">{p.imbalance.ham_to_spam_ratio.toFixed(1)} : 1</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ham weight</p>
              <p className="font-mono text-lg font-semibold text-ham">{p.imbalance.class_weights.ham}</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Spam weight</p>
              <p className="font-mono text-lg font-semibold text-spam">{p.imbalance.class_weights.spam}</p>
            </div>
          </div>
          <ul className="mt-4 divide-y rounded-lg border text-xs">
            {p.imbalance.strategies.map((s) => (
              <li key={s.key} className="flex justify-between gap-3 px-3 py-2">
                <span className="text-foreground/90">{s.name}</span>
                <span className="text-right font-mono text-muted-foreground">{s.strategy}</span>
              </li>
            ))}
          </ul>
        </>
      );
    case "split":
      return (
        <>
          <p className={VISUAL_LABEL}>Stratified split ({(1 - p.split.test_size) * 100} / {p.split.test_size * 100})</p>
          <BarChart
            ariaLabel="Train and test set sizes by class"
            data={[
              { set: "Train", ham: p.split.train.ham, spam: p.split.train.spam },
              { set: "Test", ham: p.split.test.ham, spam: p.split.test.spam },
            ]}
            xKey="set"
            series={[
              { key: "ham", label: "Ham", color: COLORS.ham },
              { key: "spam", label: "Spam", color: COLORS.spam },
            ]}
            stacked
            layout="vertical"
            categoryWidth={50}
            height={160}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Spam share: train {((p.split.train.spam / p.split.train.total) * 100).toFixed(1)}% · test{" "}
            {((p.split.test.spam / p.split.test.total) * 100).toFixed(1)}%. Final feature matrix:{" "}
            <span className="font-mono text-foreground">
              {num(p.feature_matrix_shape[0])} × {num(p.feature_matrix_shape[1])}
            </span>
            .
          </p>
        </>
      );
  }
}

export default async function PreprocessingPage() {
  const { data: p, source } = await getPreprocessing();

  return (
    <>
      <PageHeader
        eyebrow="Research · Preprocessing"
        title="Data Preprocessing"
        description="Eight steps turn raw, messy SMS text into a clean, leakage-free feature matrix. Every step runs inside one scikit-learn pipeline, so training and live inference apply exactly the same transformations."
      >
        <SourceBadge source={source} />
      </PageHeader>

      <Section id="pipeline" title="Pipeline at a glance">
        <ol className="flex flex-wrap gap-2" aria-label="Preprocessing steps">
          {PREPROCESSING_STEPS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:text-primary">
                <span className="font-mono text-xs text-primary">{i + 1}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </Section>

      <div className="space-y-6">
        {PREPROCESSING_STEPS.map((s, i) => (
          <StepCard key={s.id} index={i + 1} {...s}>
            <Visual id={s.id} p={p} />
          </StepCard>
        ))}
      </div>
    </>
  );
}
