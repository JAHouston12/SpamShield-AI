import type { Metadata } from "next";

import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { COLORS } from "@/components/charts/theme";
import { PageHeader } from "@/components/layout/page-header";
import { ChartCard } from "@/components/sections/chart-card";
import { LabelBadge } from "@/components/sections/label-badge";
import { Section } from "@/components/sections/section";
import { SourceBadge } from "@/components/sections/source-badge";
import { StatCard } from "@/components/sections/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEda } from "@/lib/api";
import { num } from "@/lib/format";

export const metadata: Metadata = { title: "Exploratory Data Analysis" };

const FEATURE_LABELS: Record<string, string> = {
  char_length: "Length",
  word_count: "Words",
  digit_count: "Digits",
  uppercase_ratio: "Uppercase",
  exclamation_count: "Exclaims",
  special_char_count: "Symbols",
  has_url: "Has URL",
  currency_count: "Currency",
  is_spam: "is_spam",
};

const PATTERN_LABELS: Record<string, string> = {
  urltoken: "URL",
  emailtoken: "Email",
  phonetoken: "Phone / short code",
  currencytoken: "Currency",
  numtoken: "Other number",
};

export default async function EdaPage() {
  const { data: e, source } = await getEda();

  const [ham, spam] = e.class_distribution;
  const [hamLen, spamLen] = e.length_stats;
  const dup = e.duplicates;
  const totalMissing = e.missing_values.reduce((s, m) => s + m.missing, 0);
  const usedMissing = e.missing_values.filter((m) => m.used).reduce((s, m) => s + m.missing, 0);
  const topCorr = e.correlation.target_correlation[0];
  const secondCorr = e.correlation.target_correlation[1];
  const wc = e.correlation.features.indexOf("word_count");
  const cl = e.correlation.features.indexOf("char_length");
  const lenWordCorr = e.correlation.matrix[cl]?.[wc] ?? 0;
  const phone = e.pattern_prevalence.find((p) => p.token === "phonetoken");
  const spamDupRate = dup.by_class[1].duplicates / (dup.by_class[1].duplicates + dup.by_class[1].unique);
  const hamDupRate = dup.by_class[0].duplicates / (dup.by_class[0].duplicates + dup.by_class[0].unique);

  return (
    <>
      <PageHeader
        eyebrow="Research · EDA"
        title="Exploratory Data Analysis"
        description="Before training anything, we profile the data to understand class balance, message structure, vocabulary, and data-quality issues. Each finding shaped a preprocessing decision."
      >
        <SourceBadge source={source} />
      </PageHeader>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ham messages" value={num(ham.count)} hint={`${ham.percent}% of dataset`} tone="ham" />
        <StatCard label="Spam messages" value={num(spam.count)} hint={`${spam.percent}% of dataset`} tone="spam" />
        <StatCard label="Missing values" value={num(totalMissing)} hint={usedMissing ? "In used columns" : "None in label or message"} />
        <StatCard label="Duplicates" value={num(dup.duplicate_records)} hint={`${dup.percent_duplicate}% exact repeats`} tone="warning" />
      </div>

      <Section id="distribution" title="Class & data distribution">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          <ChartCard
            title="Spam vs. ham distribution"
            description="Share of each class in the full dataset"
            interpretation={
              <>
                The dataset is heavily imbalanced: <strong>{ham.percent}%</strong> ham against{" "}
                <strong>{spam.percent}%</strong> spam (≈{Math.round(ham.count / spam.count)}:1). A model that always
                predicts “ham” would score {ham.percent}% accuracy while catching zero threats, so accuracy alone is
                misleading. We report precision, recall, F1, and ROC-AUC, and use class weighting.
              </>
            }
          >
            <DonutChart
              ariaLabel={`Ham ${ham.percent}%, spam ${spam.percent}%`}
              centerValue={`${spam.percent}%`}
              centerLabel="spam"
              data={[
                { name: "Ham", value: ham.count, color: COLORS.ham },
                { name: "Spam", value: spam.count, color: COLORS.spam },
              ]}
            />
            <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ham" />Ham {num(ham.count)}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-spam" />Spam {num(spam.count)}</span>
            </div>
          </ChartCard>

          <ChartCard
            title="Message length distribution"
            description="Characters per message, 20-character bins (messages ≥ 280 chars grouped)"
            interpretation={
              <>
                Spam clusters tightly around the 160-character SMS limit (median <strong>{spamLen.median_chars}</strong>{" "}
                chars) because senders pack every allowed character with offers and numbers. Ham is short and
                conversational (median <strong>{hamLen.median_chars}</strong> chars) with a long tail up to{" "}
                {hamLen.max_chars} chars. Length is therefore a strong, cheap signal.
              </>
            }
          >
            <BarChart
              ariaLabel="Histogram of message lengths by class"
              data={e.length_histogram}
              xKey="bin"
              series={[
                { key: "ham", label: "Ham", color: COLORS.ham },
                { key: "spam", label: "Spam", color: COLORS.spam },
              ]}
              height={300}
            />
          </ChartCard>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Mean chars</TableHead>
                <TableHead className="text-right">Median chars</TableHead>
                <TableHead className="text-right">Max chars</TableHead>
                <TableHead className="text-right">Mean words</TableHead>
                <TableHead className="text-right">Median words</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {e.length_stats.map((s) => (
                <TableRow key={s.label}>
                  <TableCell><LabelBadge label={s.label} /></TableCell>
                  <TableCell className="text-right font-mono">{s.mean_chars}</TableCell>
                  <TableCell className="text-right font-mono">{s.median_chars}</TableCell>
                  <TableCell className="text-right font-mono">{s.max_chars}</TableCell>
                  <TableCell className="text-right font-mono">{s.mean_words}</TableCell>
                  <TableCell className="text-right font-mono">{s.median_words}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section id="words" title="Word frequency" description="Most frequent tokens per class after lowercasing, stop-word removal, and masking of numbers, URLs, and currency.">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Top spam words"
            interpretation={
              <>
                Spam vocabulary is transactional and imperative: “{e.top_words.spam.slice(0, 5).map((w) => w.word).join("”, “")}”.
                These are calls to action and offers, the core persuasion pattern of scam campaigns.
              </>
            }
          >
            <BarChart
              ariaLabel="Top 15 words in spam messages"
              data={e.top_words.spam.slice(0, 15)}
              xKey="word"
              series={[{ key: "count", label: "Occurrences", color: COLORS.spam }]}
              layout="vertical"
              categoryWidth={80}
              height={420}
            />
          </ChartCard>
          <ChartCard
            title="Top ham words"
            interpretation={
              <>
                Ham is dominated by conversational fillers and texting shorthand (“{e.top_words.ham.slice(0, 5).map((w) => w.word).join("”, “")}”).
                Words like “call” and “now” appear in both classes, which is why single keywords cannot separate
                spam reliably and context-aware weighting (TF-IDF, bigrams) matters.
              </>
            }
          >
            <BarChart
              ariaLabel="Top 15 words in ham messages"
              data={e.top_words.ham.slice(0, 15)}
              xKey="word"
              series={[{ key: "count", label: "Occurrences", color: COLORS.ham }]}
              layout="vertical"
              categoryWidth={80}
              height={420}
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="quality" title="Data quality: missing values & duplicates">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Missing values by column"
            description="Present vs. missing cells in the raw file"
            interpretation={
              totalMissing === 0 ? (
                <>
                  The UCI release has <strong>no missing values</strong> in either column. The Kaggle CSV export,
                  however, ships three extra unnamed columns that are over 99% empty (fragments of messages containing
                  commas). The pipeline keeps only <code>label</code> and <code>message</code> and drops any row
                  missing either, so both sources produce the same clean frame.
                </>
              ) : (
                <>
                  {num(totalMissing)} missing cells were found, {usedMissing === 0 ? "all in unused auxiliary columns" : `${usedMissing} in required columns`}.
                  Those columns are dropped and incomplete rows removed before training.
                </>
              )
            }
          >
            <BarChart
              ariaLabel="Missing and present values per column"
              data={e.missing_values}
              xKey="column"
              series={[
                { key: "present", label: "Present", color: COLORS.primary },
                { key: "missing", label: "Missing", color: COLORS.warning },
              ]}
              stacked
              height={260}
            />
          </ChartCard>

          <ChartCard
            title="Duplicate analysis"
            description="Unique vs. exact-duplicate messages per class"
            interpretation={
              <>
                <strong>{num(dup.duplicate_records)}</strong> messages ({dup.percent_duplicate}%) are exact repeats.
                Spam duplicates at {(spamDupRate * 100).toFixed(1)}% versus {(hamDupRate * 100).toFixed(1)}% for ham,
                which is typical of bulk campaigns that blast one template. Leaving duplicates in would let identical
                messages land in both train and test sets and inflate scores, so they are removed before splitting.
              </>
            }
          >
            <BarChart
              ariaLabel="Unique and duplicate messages per class"
              data={dup.by_class}
              xKey="label"
              series={[
                { key: "unique", label: "Unique", color: COLORS.primary },
                { key: "duplicates", label: "Duplicates", color: COLORS.warning },
              ]}
              stacked
              height={260}
            />
          </ChartCard>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Most repeated messages</TableHead>
                <TableHead className="w-24">Label</TableHead>
                <TableHead className="w-20 text-right">Copies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dup.most_repeated.map((m) => (
                <TableRow key={m.message}>
                  <TableCell className="text-sm">{m.message}</TableCell>
                  <TableCell><LabelBadge label={m.label} /></TableCell>
                  <TableCell className="text-right font-mono">{m.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section id="features" title="Feature analysis" description="Engineered numeric features compared across classes, plus prevalence of masked threat patterns.">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Threat pattern prevalence"
            description="% of messages containing each masked pattern"
            interpretation={
              <>
                Long numbers (premium-rate lines and short codes) appear in{" "}
                <strong>{phone?.spam_percent}%</strong> of spam but only {phone?.ham_percent}% of ham, the single most
                discriminative structural cue in this corpus. URLs and currency mentions are also almost exclusively
                spam.
              </>
            }
          >
            <BarChart
              ariaLabel="Prevalence of URL, email, phone, currency, and number patterns by class"
              data={e.pattern_prevalence.map((p) => ({ ...p, pattern: PATTERN_LABELS[p.token] ?? p.pattern }))}
              xKey="pattern"
              series={[
                { key: "ham_percent", label: "Ham %", color: COLORS.ham },
                { key: "spam_percent", label: "Spam %", color: COLORS.spam },
              ]}
              layout="vertical"
              categoryWidth={120}
              format="number"
              height={300}
            />
          </ChartCard>

          <div className="overflow-hidden rounded-xl border bg-card/70">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Ham mean</TableHead>
                  <TableHead className="text-right">Spam mean</TableHead>
                  <TableHead className="text-right">Ratio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {e.feature_by_class.map((f) => (
                  <TableRow key={f.feature}>
                    <TableCell>
                      <p className="font-mono text-sm">{f.feature}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </TableCell>
                    <TableCell className="text-right font-mono text-ham">{f.ham_mean}</TableCell>
                    <TableCell className="text-right font-mono text-spam">{f.spam_mean}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {f.ham_mean > 0 ? `${(f.spam_mean / f.ham_mean).toFixed(1)}×` : "n/a"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Section>

      <Section id="correlation" title="Correlation analysis">
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <ChartCard
            title="Correlation heatmap"
            description="Pearson correlation between engineered features and the spam label"
            interpretation={
              <>
                <strong>{FEATURE_LABELS[topCorr.feature]}</strong> correlates most strongly with spam (r ={" "}
                {topCorr.r.toFixed(2)}), followed by <strong>{FEATURE_LABELS[secondCorr.feature]}</strong> (r ={" "}
                {secondCorr.r.toFixed(2)}). Length and word count are almost collinear (r = {lenWordCorr.toFixed(2)}),
                so they carry redundant information. Feature selection and tree-based models handle this without
                harm, but linear coefficients for these two should be read together.
              </>
            }
          >
            <Heatmap labels={e.correlation.features} matrix={e.correlation.matrix} highlight="is_spam" formatLabel={(l) => FEATURE_LABELS[l] ?? l} />
          </ChartCard>
          <ChartCard title="Correlation with spam label" description="Sorted by absolute strength">
            <BarChart
              ariaLabel="Correlation of each feature with the spam label"
              data={e.correlation.target_correlation.map((t) => ({
                ...t,
                name: FEATURE_LABELS[t.feature] ?? t.feature,
                color: t.r >= 0 ? COLORS.primary : COLORS.spam,
              }))}
              xKey="name"
              series={[{ key: "r", label: "Pearson r", color: COLORS.primary }]}
              layout="vertical"
              categoryWidth={80}
              colorField="color"
              format="decimal2"
              domain={[Math.min(0, ...e.correlation.target_correlation.map((t) => t.r)), 1]}
              height={320}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
