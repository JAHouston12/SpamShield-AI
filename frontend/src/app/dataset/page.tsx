import type { Metadata } from "next";
import { BookText, Columns3, Database, ExternalLink, Hash, Ruler, Tag, Type } from "lucide-react";

import { SampleTable } from "@/components/dataset/sample-table";
import { PageHeader } from "@/components/layout/page-header";
import { Insight } from "@/components/sections/insight";
import { Section } from "@/components/sections/section";
import { SourceBadge } from "@/components/sections/source-badge";
import { StatCard } from "@/components/sections/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDataset } from "@/lib/api";
import { SITE } from "@/lib/config";
import { num, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Dataset" };

export default async function DatasetPage() {
  const { data: d, source } = await getDataset();

  const docs = [
    { k: "Dataset name", v: d.name },
    { k: "Original authors", v: "Tiago A. Almeida & José María Gómez Hidalgo (2011)" },
    { k: "Source", v: "Kaggle: SMS Spam Collection Dataset (spam.csv)" },
    { k: "Collection", v: "Grumbletext UK forum (spam), NUS SMS Corpus (ham), Caroline Tag's PhD thesis, SMS Spam Corpus v0.1" },
    { k: "Language", v: d.language },
    { k: "License", v: "CC BY 4.0" },
    { k: "Task", v: "Binary text classification (spam vs. ham)" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Research · Dataset"
        title="SMS Spam Collection Dataset"
        description="A public, labeled corpus of real SMS messages, the standard benchmark for SMS spam filtering research. It is small enough to iterate quickly, yet realistic in its slang, abbreviations, and class imbalance."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <a href={SITE.kaggleUrl} target="_blank" rel="noreferrer">
              Kaggle dataset <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
          <SourceBadge source={source} />
        </div>
      </PageHeader>

      <Section id="stats" title="Dataset statistics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Records" value={num(d.records)} hint="Labeled SMS messages" icon={Database} tone="primary" />
          <StatCard
            label="Features"
            value={`${d.num_raw_features} + ${d.num_engineered_features}`}
            hint="Raw text column plus engineered numeric signals"
            icon={Columns3}
          />
          <StatCard label="Target variable" value={d.target} hint="ham (legitimate) or spam" icon={Tag} />
          <StatCard label="Spam share" value={pct(d.spam_ratio)} hint={`${num(d.classes.spam)} spam · ${num(d.classes.ham)} ham`} icon={Hash} tone="spam" />
          <StatCard label="Avg. length" value={`${d.avg_chars}`} hint="Characters per message" icon={Ruler} />
          <StatCard label="Avg. words" value={`${d.avg_words}`} hint="Tokens per message" icon={Type} />
          <StatCard label="Vocabulary" value={num(d.vocabulary_size)} hint="Unique tokens after cleaning" icon={BookText} />
          <StatCard label="Median length" value={`${d.length_quantiles["0.5"]}`} hint={`95th percentile: ${d.length_quantiles["0.95"]} chars`} icon={Ruler} />
        </div>
      </Section>

      <Section id="description" title="Dataset description">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="bg-card/70">
            <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-foreground/90">
              <p>
                The SMS Spam Collection contains {num(d.records)} English text messages, each tagged as <em>ham</em>{" "}
                (legitimate) or <em>spam</em>. Spam samples were gathered from a UK forum where users reported unsolicited
                texts. Ham samples come from the NUS SMS Corpus of volunteer messages and a PhD research corpus.
              </p>
              <p>
                Spam in this corpus is dominated by premium-rate and prize campaigns: “Txt WIN to 87121”, “You have won a
                £1000 cash prize”, ringtone subscriptions. These are early forms of the fraud that today arrives as
                smishing with shortened links and fake delivery notices.
              </p>
              <p>
                With roughly one spam message for every {Math.round(d.classes.ham / d.classes.spam)} legitimate ones, the
                data mirrors real inboxes, where malicious traffic is the minority class that matters most.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardContent className="p-0">
              <dl className="divide-y">
                {docs.map((r) => (
                  <div key={r.k} className="grid grid-cols-[8.5rem_1fr] gap-3 px-5 py-3 text-sm">
                    <dt className="text-muted-foreground">{r.k}</dt>
                    <dd className="text-foreground/90">{r.v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="features" title="Feature descriptions" description="The raw dataset provides one text feature and one label. The pipeline derives eight interpretable numeric features from the text, then expands it into TF-IDF n-gram features.">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Feature</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-sm text-primary">label</TableCell>
                <TableCell>Categorical</TableCell>
                <TableCell>Target</TableCell>
                <TableCell className="text-muted-foreground">“ham” or “spam”, encoded as 0 / 1</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm text-primary">message</TableCell>
                <TableCell>Text</TableCell>
                <TableCell>Raw input</TableCell>
                <TableCell className="text-muted-foreground">Original SMS body; source of TF-IDF unigram and bigram features</TableCell>
              </TableRow>
              {d.engineered_features.map((f) => (
                <TableRow key={f.name}>
                  <TableCell className="font-mono text-sm">{f.name}</TableCell>
                  <TableCell>Numeric</TableCell>
                  <TableCell>Engineered</TableCell>
                  <TableCell className="text-muted-foreground">{f.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Insight title="Why engineer features?">
          Spam often betrays itself through form as well as words: long messages packed with digits, currency symbols,
          and capital letters. Explicit numeric features make those cues available to every model and keep them
          interpretable for analysts.
        </Insight>
      </Section>

      <Section id="sample" title="Sample records" description="A stratified random sample from the dataset, shown verbatim, including the original slang and abbreviations.">
        <SampleTable rows={d.sample} />
      </Section>
    </>
  );
}
