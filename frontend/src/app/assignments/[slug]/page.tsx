import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clapperboard,
  Download,
  ExternalLink,
} from "lucide-react";

import { AssignmentMeta } from "@/components/assignments/assignment-meta";
import { AssignmentVideo } from "@/components/assignments/assignment-video";
import { DdosReport } from "@/components/assignments/ddos-report";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ASSIGNMENTS, getAssignment } from "@/content/assignments";

type Props = { params: { slug: string } };

export const dynamicParams = false;

export function generateStaticParams() {
  return ASSIGNMENTS.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const a = getAssignment(params.slug);
  return { title: a ? `${a.title}: ${a.subtitle}` : "Assignment" };
}

export default function AssignmentPage({ params }: Props) {
  const a = getAssignment(params.slug);
  if (!a) notFound();

  return (
    <>
      <Link
        href="/assignments"
        className="mb-6 inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All assignments
      </Link>

      <PageHeader
        eyebrow={`Assignments · ${String(a.number).padStart(2, "0")}`}
        title={a.title}
        description={a.subtitle}
      >
        <div className="space-y-4">
          <AssignmentMeta assignment={a} />
          {a.video && !a.pdf && (
            <Button asChild size="sm">
              <a href="#movie">
                <Clapperboard className="h-4 w-4" aria-hidden />
                Watch the AI movie
              </a>
            </Button>
          )}
          {a.pdf && (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={a.pdf} download>
                  <Download className="h-4 w-4" aria-hidden />
                  Download PDF
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={a.pdf} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Open in new tab
                </a>
              </Button>
            </div>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          {a.video && <AssignmentVideo video={a.video} />}
          {a.body === "ddos" ? (
            <DdosReport />
          ) : (
            <div>
              {a.pdf ? (
                <div className="overflow-hidden rounded-xl border bg-card">
                  <iframe
                    src={`${a.pdf}#view=FitH`}
                    title={`${a.title} PDF`}
                    className="h-[75vh] min-h-[520px] w-full bg-white"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                  No document attached yet.
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                If the preview doesn&apos;t load on your device, use Download
                PDF above.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card className="bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {a.summary}
              </p>
              <dl className="space-y-3 text-sm">
                {a.highlights.map((h) => (
                  <div key={h.label}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {h.label}
                    </dt>
                    <dd className="mt-0.5 text-foreground">{h.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-1.5">
                {a.topics.map((t) => (
                  <Badge key={t} variant="secondary" className="font-normal">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {a.related.length > 0 && (
            <Card className="bg-card/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">In this project</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {a.related.map((r) => (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {r.label}
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
