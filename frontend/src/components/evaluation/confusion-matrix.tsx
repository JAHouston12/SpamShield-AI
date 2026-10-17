import { cn } from "@/lib/utils";

interface Props {
  name: string;
  cm: { tn: number; fp: number; fn: number; tp: number };
  compact?: boolean;
  highlight?: boolean;
}

export function ConfusionMatrix({ name, cm, compact, highlight }: Props) {
  const total = cm.tn + cm.fp + cm.fn + cm.tp;
  const cells = [
    { k: "TN", v: cm.tn, label: "True negative", desc: "Ham correctly delivered", good: true },
    { k: "FP", v: cm.fp, label: "False positive", desc: "Ham wrongly blocked", good: false },
    { k: "FN", v: cm.fn, label: "False negative", desc: "Spam that got through", good: false },
    { k: "TP", v: cm.tp, label: "True positive", desc: "Spam caught", good: true },
  ];

  return (
    <figure className={cn("rounded-xl border bg-card/70 p-4", highlight && "border-primary/40")}>
      <figcaption className="mb-3 flex items-center justify-between text-sm font-medium">
        {name}
        <span className="font-mono text-xs text-muted-foreground">n={total}</span>
      </figcaption>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-xs">
        <span />
        <span className="text-center text-muted-foreground">Pred. ham</span>
        <span className="text-center text-muted-foreground">Pred. spam</span>
        {[0, 1].map((row) => (
          <div key={row} className="contents">
            <span className="flex items-center pr-1 text-muted-foreground [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0">
              {row === 0 ? "Ham" : "Spam"}
            </span>
            {cells.slice(row * 2, row * 2 + 2).map((c) => (
              <div
                key={c.k}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border text-center",
                  compact ? "py-2.5" : "py-5",
                  c.good ? "border-ham/25 bg-ham/10" : c.v > 0 ? "border-spam/30 bg-spam/10" : "border-border bg-muted/30",
                )}
                title={`${c.label}: ${c.desc}`}
              >
                <span className={cn("font-mono font-semibold tabular-nums", compact ? "text-lg" : "text-2xl", c.good ? "text-ham" : c.v > 0 ? "text-spam" : "text-muted-foreground")}>
                  {c.v}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</span>
                {!compact && <span className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">{c.desc}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </figure>
  );
}
