"use client";

import { FileText, Presentation, Printer, ScrollText } from "lucide-react";
import { useState } from "react";

import { DocRenderer, DocToc } from "@/components/report/doc-renderer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REPORT_TABS, type ReportBundle, type ReportTab, type Slide } from "@/content/report";

const TAB_META: Record<ReportTab, { label: string; icon: typeof FileText; heading: string }> = {
  proposal: { label: "Proposal", icon: FileText, heading: "Project Proposal" },
  report: { label: "Final Report", icon: ScrollText, heading: "Final Report" },
  presentation: { label: "Presentation", icon: Presentation, heading: "Presentation Outline" },
};

function SlideCard({ slide, index }: { slide: Slide; index: number }) {
  return (
    <article className="print-slide flex aspect-auto flex-col rounded-xl border bg-card p-6 sm:aspect-video sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-wider text-primary">{slide.kicker}</p>
        <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
      </div>
      <h3 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-3xl">{slide.title}</h3>
      <div className="mt-5 flex flex-1 flex-col gap-6 sm:flex-row">
        <ul className="flex-1 space-y-2.5 text-sm leading-relaxed text-foreground/90 sm:text-base">
          {slide.bullets.map((b) => (
            <li key={b} className="flex gap-2.5">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {b}
            </li>
          ))}
        </ul>
        {slide.stat && (
          <div className="flex shrink-0 flex-col justify-center rounded-lg border border-primary/30 bg-primary/5 px-6 py-4 text-center sm:w-48">
            <p className="font-mono text-3xl font-bold text-primary">{slide.stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{slide.stat.label}</p>
          </div>
        )}
      </div>
      <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground/80">Speaker notes:</span> {slide.notes}
      </p>
    </article>
  );
}

export function ReportView({ bundle, initialTab }: { bundle: ReportBundle; initialTab: ReportTab }) {
  const [tab, setTab] = useState<ReportTab>(initialTab);

  const onChange = (value: string) => {
    setTab(value as ReportTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  };

  const sections = tab === "proposal" ? bundle.proposal : tab === "report" ? bundle.report : null;

  return (
    <Tabs value={tab} onValueChange={onChange}>
      <div className="no-print mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-flex sm:w-auto">
          {REPORT_TABS.map((t) => {
            const Icon = TAB_META[t].icon;
            return (
              <TabsTrigger key={t} value={t} className="gap-1.5 px-2 text-xs sm:px-3 sm:text-sm">
                <Icon className="hidden h-4 w-4 sm:block" aria-hidden />
                {TAB_META[t].label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden />
          Print / save as PDF
        </Button>
      </div>

      <header className="print-only mb-8 hidden border-b pb-4">
        <p className="text-sm">{bundle.meta.course}</p>
        <h1 className="mt-1 text-2xl font-bold">{bundle.meta.title}</h1>
        <p className="mt-1 text-sm">{TAB_META[tab].heading}</p>
      </header>

      {REPORT_TABS.map((t) => (
        <TabsContent key={t} value={t} className="mt-0 focus-visible:ring-0">
          {sections ? (
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
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              {bundle.slides.map((s, i) => (
                <SlideCard key={s.kicker} slide={s} index={i} />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
