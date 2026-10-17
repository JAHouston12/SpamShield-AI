import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "spam" | "ham" | "primary" | "warning";
}

const TONES = {
  default: "text-foreground",
  primary: "text-primary",
  spam: "text-spam",
  ham: "text-ham",
  warning: "text-warning",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <Card className="bg-card/70 transition-colors hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {Icon && <Icon className={cn("h-4 w-4", TONES[tone])} aria-hidden />}
        </div>
        <p className={cn("mt-2 font-mono text-2xl font-semibold tabular-nums sm:text-3xl", TONES[tone])}>{value}</p>
        {hint && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
