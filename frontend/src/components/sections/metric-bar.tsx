import { cn } from "@/lib/utils";

/** Compact labeled bar for 0–1 metrics; `floor` zooms the scale so small differences stay visible. */
export function MetricBar({ label, value, floor = 0.8, className }: { label: string; value: number; floor?: number; className?: string }) {
  const width = Math.max(0, Math.min(1, (value - floor) / (1 - floor))) * 100;
  return (
    <div className={cn("text-xs", className)}>
      <div className="mb-1 flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
