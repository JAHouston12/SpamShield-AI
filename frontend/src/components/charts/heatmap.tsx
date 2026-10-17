import { cn } from "@/lib/utils";

interface HeatmapProps {
  labels: string[];
  matrix: number[][];
  highlight?: string;
  formatLabel?: (l: string) => string;
}

function cellColor(r: number) {
  const a = Math.min(Math.abs(r), 1);
  return r >= 0 ? `hsl(187 92% 50% / ${0.08 + a * 0.82})` : `hsl(350 89% 62% / ${0.08 + a * 0.82})`;
}

/** Correlation matrix rendered as an accessible table with diverging color scale. */
export function Heatmap({ labels, matrix, highlight, formatLabel = (l) => l }: HeatmapProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1 text-xs" aria-label="Pearson correlation matrix">
        <thead>
          <tr>
            <th className="sr-only">Feature</th>
            {labels.map((l) => (
              <th key={l} scope="col" className={cn("h-24 align-bottom font-normal text-muted-foreground", l === highlight && "text-primary")}>
                <span className="inline-block -rotate-45 origin-bottom-left translate-x-3 whitespace-nowrap">{formatLabel(l)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              <th scope="row" className={cn("whitespace-nowrap pr-2 text-right font-normal text-muted-foreground", labels[i] === highlight && "text-primary")}>
                {formatLabel(labels[i])}
              </th>
              {row.map((v, j) => (
                <td
                  key={j}
                  className={cn(
                    "h-9 min-w-9 rounded text-center font-mono tabular-nums",
                    Math.abs(v) > 0.55 ? "text-background" : "text-foreground/90",
                    (labels[i] === highlight || labels[j] === highlight) && "ring-1 ring-primary/40",
                  )}
                  style={{ background: cellColor(v) }}
                  title={`${formatLabel(labels[i])} × ${formatLabel(labels[j])}: ${v.toFixed(3)}`}
                >
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
        <span>−1</span>
        <span className="h-2 w-40 rounded-full" style={{ background: "linear-gradient(90deg, hsl(350 89% 62%), hsl(217 33% 14%), hsl(187 92% 50%))" }} />
        <span>+1</span>
      </div>
    </div>
  );
}
