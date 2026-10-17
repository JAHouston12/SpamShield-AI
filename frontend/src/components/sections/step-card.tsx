import { Gauge, HelpCircle, Wrench } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StepCardProps {
  index: number;
  id: string;
  title: string;
  what: string;
  why: string;
  how: string;
  children?: React.ReactNode;
}

export function StepCard({ index, id, title, what, why, how, children }: StepCardProps) {
  return (
    <Card id={id} className="scroll-mt-20 overflow-hidden bg-card/70">
      <CardContent className="grid gap-6 p-0 lg:grid-cols-[1fr_1.1fr]">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-mono text-sm font-semibold text-primary ring-1 ring-primary/30">
              {index}
            </span>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <dl className="mt-5 space-y-4 text-sm leading-relaxed">
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" aria-hidden /> What we do
              </dt>
              <dd className="mt-1 text-foreground/90">{what}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-warning">
                <HelpCircle className="h-3.5 w-3.5" aria-hidden /> Why it is necessary
              </dt>
              <dd className="mt-1 text-foreground/90">{why}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ham">
                <Gauge className="h-3.5 w-3.5" aria-hidden /> How it improves the model
              </dt>
              <dd className="mt-1 text-foreground/90">{how}</dd>
            </div>
          </dl>
        </div>
        <div className="border-t bg-background/40 p-6 lg:border-l lg:border-t-0">{children}</div>
      </CardContent>
    </Card>
  );
}
