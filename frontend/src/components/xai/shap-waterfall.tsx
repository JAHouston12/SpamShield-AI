"use client";

import { useState } from "react";

import { LabelBadge } from "@/components/sections/label-badge";
import { cn } from "@/lib/utils";

export interface LocalExplanation {
  message: string;
  actual: string;
  spam_probability: number;
  base_value: number;
  output_value: number;
  contributions: { feature: string; kind: string; value: number; contribution: number; direction: string }[];
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Waterfall in log-odds space: base value + Σ SHAP contributions = model output. */
export function ShapWaterfall({ examples }: { examples: LocalExplanation[] }) {
  const [idx, setIdx] = useState(0);
  const ex = examples[idx];
  const shown = ex.contributions;
  const rest = ex.output_value - ex.base_value - shown.reduce((s, c) => s + c.contribution, 0);
  const steps = [...shown.map((c) => ({ label: c.feature, delta: c.contribution })), { label: "other features", delta: rest }];

  let running = ex.base_value;
  const rows = steps.map((s) => {
    const start = running;
    running += s.delta;
    return { ...s, start, end: running };
  });
  const values = [ex.base_value, ex.output_value, ...rows.flatMap((r) => [r.start, r.end])];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const x = (v: number) => ((v - min) / span) * 100;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Example messages">
        {examples.map((e, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === idx}
            onClick={() => setIdx(i)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              i === idx ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Example {i + 1} · {e.actual}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-lg border bg-background/50 p-3">
        <div className="mb-1 flex items-center gap-2">
          <LabelBadge label={ex.actual} />
          <span className="text-xs text-muted-foreground">actual label</span>
          <span className="ml-auto font-mono text-xs">
            P(spam) = <span className={ex.spam_probability >= 0.5 ? "text-spam" : "text-ham"}>{ex.spam_probability.toFixed(4)}</span>
          </span>
        </div>
        <p className="text-sm text-foreground/90">“{ex.message}”</p>
      </div>

      <div className="space-y-1.5" role="table" aria-label="SHAP contribution waterfall">
        <div className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3 text-xs" role="row">
          <span className="truncate text-muted-foreground" role="cell">base value E[f(x)]</span>
          <div className="relative h-5" role="cell">
            <div className="absolute inset-y-0 w-0.5 bg-muted-foreground" style={{ left: `${x(ex.base_value)}%` }} />
          </div>
          <span className="text-right font-mono text-muted-foreground" role="cell">{ex.base_value.toFixed(2)}</span>
        </div>
        {rows.map((r) => {
          const left = x(Math.min(r.start, r.end));
          const width = Math.max(0.6, Math.abs(x(r.end) - x(r.start)));
          const pos = r.delta >= 0;
          return (
            <div key={r.label} className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3 text-xs" role="row">
              <span className="truncate font-mono text-foreground/90" role="cell" title={r.label}>{r.label}</span>
              <div className="relative h-5 rounded bg-muted/30" role="cell">
                <div
                  className={cn("absolute inset-y-0.5 rounded-sm transition-all duration-500", pos ? "bg-spam/80" : "bg-ham/80")}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
              <span className={cn("text-right font-mono", pos ? "text-spam" : "text-ham")} role="cell">
                {pos ? "+" : ""}
                {r.delta.toFixed(2)}
              </span>
            </div>
          );
        })}
        <div className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3 border-t pt-2 text-xs" role="row">
          <span className="font-semibold" role="cell">output f(x)</span>
          <div className="relative h-5" role="cell">
            <div className="absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${x(ex.output_value)}%` }} />
          </div>
          <span className="text-right font-mono font-semibold text-primary" role="cell">{ex.output_value.toFixed(2)}</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Log-odds space. Output {ex.output_value.toFixed(2)} → sigmoid → P(spam) = {sigmoid(ex.output_value).toFixed(4)}.{" "}
        <span className="text-spam">Red</span> pushes toward spam, <span className="text-ham">green</span> toward ham.
      </p>
    </div>
  );
}
