import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ReportView } from "@/components/report/report-view";
import { SourceBadge } from "@/components/sections/source-badge";
import { buildReport, REPORT_TABS, type ReportTab } from "@/content/report";
import { getDataset, getEda, getEvaluation, getExplain, getManifest, getPreprocessing } from "@/lib/api";

export const metadata: Metadata = { title: "Report & Presentation" };

export default async function ReportPage({ searchParams }: { searchParams: { tab?: string } }) {
  const [dataset, eda, preprocessing, evaluation, explain, manifest] = await Promise.all([
    getDataset(),
    getEda(),
    getPreprocessing(),
    getEvaluation(),
    getExplain(),
    getManifest(),
  ]);
  const bundle = buildReport({
    dataset: dataset.data,
    eda: eda.data,
    preprocessing: preprocessing.data,
    evaluation: evaluation.data,
    explain: explain.data,
    trainedAt: manifest.data.trained_at,
  });
  const initialTab = (REPORT_TABS as readonly string[]).includes(searchParams.tab ?? "")
    ? (searchParams.tab as ReportTab)
    : "proposal";
  const trained = new Date(manifest.data.trained_at).toLocaleDateString("en-US", { dateStyle: "long" });

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="Tools · Report"
          title="Report & Presentation"
          description="The project proposal, final report, and presentation outline, generated from the same training run as the dashboard. Retrain and every figure here updates."
        >
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <SourceBadge source={evaluation.source} />
            <span>Results from the training run on {trained}</span>
          </div>
        </PageHeader>
      </div>
      <ReportView bundle={bundle} initialTab={initialTab} />
    </>
  );
}
