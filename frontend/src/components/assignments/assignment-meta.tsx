import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Assignment } from "@/content/assignments";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<Assignment["status"], { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "border-ham/40 bg-ham/10 text-ham" },
  "in-progress": { label: "In progress", className: "border-warning/40 bg-warning/10 text-warning" },
  planned: { label: "Planned", className: "border-border bg-muted text-muted-foreground" },
};

const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { dateStyle: "medium" });

export function AssignmentMeta({ assignment: a, className }: { assignment: Assignment; className?: string }) {
  const status = STATUS_STYLE[a.status];
  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs text-muted-foreground", className)}>
      <Badge variant="outline" className={cn("font-normal", status.className)}>
        {status.label}
      </Badge>
      {a.submitted && <time dateTime={a.submitted}>{formatDate(a.submitted)}</time>}
      {a.pdf && (
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          PDF{a.pages ? ` · ${a.pages} pages` : ""}
        </span>
      )}
    </div>
  );
}
