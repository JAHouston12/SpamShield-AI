"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { AXIS_PROPS, COLORS, SERIES_PALETTE } from "@/components/charts/theme";
import { cn } from "@/lib/utils";

interface Curve {
  key: string;
  name: string;
  auc: number;
  points: { fpr: number; tpr: number }[];
}

export function RocChart({ curves, initial }: { curves: Curve[]; initial: string[] }) {
  const [active, setActive] = useState<Set<string>>(new Set(initial));
  const colorOf = useMemo(() => Object.fromEntries(curves.map((c, i) => [c.key, SERIES_PALETTE[i % SERIES_PALETTE.length]])), [curves]);

  const data = useMemo(() => {
    const grid = curves[0]?.points ?? [];
    return grid.map((p, i) => {
      const row: Record<string, number> = { fpr: p.fpr, chance: p.fpr };
      curves.forEach((c) => (row[c.key] = c.points[i]?.tpr ?? 0));
      return row;
    });
  }, [curves]);

  const toggle = (k: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size > 1) next.delete(k);
      } else next.add(k);
      return next;
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Toggle models on the ROC chart">
        {curves.map((c) => {
          const on = active.has(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(c.key)}
              aria-pressed={on}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                on ? "border-transparent bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: on ? colorOf[c.key] : COLORS.grid }} aria-hidden />
              {c.name}
              <span className="font-mono text-[10px] text-muted-foreground">{c.auc.toFixed(3)}</span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: "Full ROC curve", domainX: [0, 1] as [number, number], domainY: [0, 1] as [number, number] },
          { title: "Zoomed: top-left corner (FPR ≤ 0.2)", domainX: [0, 0.2] as [number, number], domainY: [0.8, 1] as [number, number] },
        ].map((v) => (
          <div key={v.title}>
            <p className="mb-2 text-xs text-muted-foreground">{v.title}</p>
            <div style={{ height: 320 }} role="img" aria-label={`${v.title} for selected models`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 16 }}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="fpr"
                    type="number"
                    domain={v.domainX}
                    allowDataOverflow
                    {...AXIS_PROPS}
                    tickFormatter={(t: number) => t.toFixed(2)}
                    label={{ value: "False positive rate", position: "insideBottom", offset: -10, fill: COLORS.axis, fontSize: 12 }}
                  />
                  <YAxis domain={v.domainY} allowDataOverflow {...AXIS_PROPS} width={44} tickFormatter={(t: number) => t.toFixed(2)} />
                  <Tooltip content={(props) => <ChartTooltip {...(props as object)} formatter={(n) => n.toFixed(3)} />} labelFormatter={(l) => `FPR ${Number(l).toFixed(3)}`} />
                  <Line dataKey="chance" name="Chance" stroke={COLORS.muted} strokeDasharray="4 4" dot={false} strokeWidth={1} isAnimationActive={false} />
                  {curves
                    .filter((c) => active.has(c.key))
                    .map((c) => (
                      <Line key={c.key} dataKey={c.key} name={c.name} stroke={colorOf[c.key]} dot={false} strokeWidth={2} type="monotone" animationDuration={600} />
                    ))}
                  <Legend wrapperStyle={{ display: "none" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
