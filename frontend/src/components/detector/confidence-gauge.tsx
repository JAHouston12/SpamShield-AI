import { cn } from "@/lib/utils";

/** Semicircular gauge for spam probability with a marker at the model's decision threshold. */
export function ConfidenceGauge({ probability, threshold, spam }: { probability: number; threshold: number; spam: boolean }) {
  const r = 80;
  const c = Math.PI * r;
  const filled = c * probability;
  const angle = Math.PI * (1 - threshold);
  const tx = 100 + r * Math.cos(angle);
  const ty = 100 - r * Math.sin(angle);

  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`Spam probability ${(probability * 100).toFixed(1)} percent, threshold ${(threshold * 100).toFixed(0)} percent`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(217 33% 16%)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={spam ? "hsl(350 89% 62%)" : "hsl(152 69% 50%)"}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
        <line x1={tx} y1={ty} x2={100 + (r - 18) * Math.cos(angle)} y2={100 - (r - 18) * Math.sin(angle)} stroke="hsl(210 40% 98%)" strokeWidth="2" />
      </svg>
      <p className={cn("-mt-10 text-center font-mono text-3xl font-bold tabular-nums", spam ? "text-spam" : "text-ham")}>
        {(probability * 100).toFixed(1)}%
      </p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        spam probability · <span className="text-foreground">│</span> threshold {(threshold * 100).toFixed(0)}%
      </p>
    </div>
  );
}
