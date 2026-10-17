import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { DocRenderer, DocToc } from "@/components/report/doc-renderer";
import { SourceBadge } from "@/components/sections/source-badge";
import { Button } from "@/components/ui/button";
import { buildDocs } from "@/content/docs";
import { getDataset, getEvaluation, getModels } from "@/lib/api";
import { API_DOCS_PATH } from "@/lib/config";

export const metadata: Metadata = { title: "Documentation" };

export default async function DocsPage() {
  const [dataset, models, evaluation] = await Promise.all([getDataset(), getModels(), getEvaluation()]);
  const sections = buildDocs({ dataset: dataset.data, models: models.data, evaluation: evaluation.data });

  return (
    <>
      <PageHeader
        eyebrow="Tools · Documentation"
        title="Documentation"
        description="Install, train, run, and extend SpamShield AI. Covers the repository layout, dataset setup, model registry, environment variables, and the REST API."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <a href={API_DOCS_PATH} target="_blank" rel="noreferrer">
              OpenAPI reference
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
          <SourceBadge source={models.source} />
        </div>
      </PageHeader>

      <div className="grid gap-10 lg:grid-cols-[1fr_220px] print:block">
        <div className="min-w-0">
          <DocRenderer sections={sections} />
        </div>
        <aside className="no-print hidden lg:block">
          <div className="sticky top-10">
            <DocToc sections={sections} />
          </div>
        </aside>
      </div>
    </>
  );
}
