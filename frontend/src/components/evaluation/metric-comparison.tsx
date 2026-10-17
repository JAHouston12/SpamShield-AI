"use client";

import { useMemo, useState } from "react";

import { BarChart } from "@/components/charts/bar-chart";
import { COLORS } from "@/components/charts/theme";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { METRIC_KEYS, METRIC_LABELS } from "@/lib/format";
import type { MetricKey } from "@/types/artifacts";

interface Row {
  key: string;
  name: string;
  role: string;
  metrics: Record<MetricKey, number>;
}

export function MetricComparison({ rows, best }: { rows: Row[]; best: string }) {
  const [metric, setMetric] = useState<MetricKey>("f1");

  const data = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.metrics[metric] - a.metrics[metric])
        .map((r) => ({
          name: r.name,
          value: r.metrics[metric],
          color: r.key === best ? COLORS.ham : r.role === "baseline" ? COLORS.warning : r.role === "improved" ? COLORS.primary : "hsl(215 25% 45%)",
        })),
    [rows, metric, best],
  );
  const min = Math.min(...data.map((d) => d.value));
  const floor = Math.max(0, Math.floor((min - 0.02) * 50) / 50);

  return (
    <div>
      <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricKey)} className="mb-4">
        <TabsList className="flex h-auto flex-wrap justify-start" aria-label="Select metric">
          {METRIC_KEYS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {METRIC_LABELS[k]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <BarChart
        ariaLabel={`${METRIC_LABELS[metric]} per model, sorted`}
        data={data}
        xKey="name"
        series={[{ key: "value", label: METRIC_LABELS[metric], color: COLORS.primary }]}
        layout="vertical"
        categoryWidth={150}
        colorField="color"
        format="percent"
        domain={[floor, 1]}
        height={380}
      />
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ham" />Top ranked</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Improved (Random Forest)</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />Baseline (Logistic Regression)</span>
        <span>Axis starts at {(floor * 100).toFixed(0)}% to make differences visible.</span>
      </div>
    </div>
  );
}
