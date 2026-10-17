import { Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

export function Insight({ children, title = "Interpretation", className }: { children: React.ReactNode; title?: string; className?: string }) {
  return (
    <div className={cn("mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4", className)}>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden />
        {title}
      </p>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}
