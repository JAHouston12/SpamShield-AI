"use client";

import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { formatValue, type ValueFormat } from "@/components/charts/formatters";
import { AXIS_PROPS, COLORS } from "@/components/charts/theme";

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  layout?: "horizontal" | "vertical";
  stacked?: boolean;
  height?: number;
  format?: ValueFormat;
  domain?: [number | "auto" | "dataMin", number | "auto" | "dataMax"];
  categoryWidth?: number;
  /** Per-row color override read from this field of each datum (single-series charts). */
  colorField?: string;
  ariaLabel: string;
  showLegend?: boolean;
}

/** Generic bar chart. `layout="vertical"` renders horizontal bars with categories on the Y axis. */
export function BarChart({
  data,
  xKey,
  series,
  layout = "horizontal",
  stacked,
  height = 300,
  format = "number",
  domain,
  categoryWidth = 110,
  colorField,
  ariaLabel,
  showLegend = series.length > 1,
}: BarChartProps) {
  const vertical = layout === "vertical";
  const fmt = (v: number) => formatValue(v, format);
  const radius = (i: number): [number, number, number, number] => {
    if (stacked && i !== series.length - 1) return [0, 0, 0, 0];
    return vertical ? [0, 4, 4, 0] : [4, 4, 0, 0];
  };

  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart
          data={data}
          layout={vertical ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={!vertical} vertical={vertical} />
          {vertical ? (
            <>
              <XAxis type="number" {...AXIS_PROPS} domain={domain} tickFormatter={fmt} />
              <YAxis type="category" dataKey={xKey} {...AXIS_PROPS} width={categoryWidth} interval={0} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...AXIS_PROPS} interval="preserveStartEnd" />
              <YAxis {...AXIS_PROPS} width={52} domain={domain} tickFormatter={fmt} />
            </>
          )}
          <Tooltip
            cursor={{ fill: "hsl(217 33% 16% / 0.6)" }}
            content={(props) => <ChartTooltip {...(props as object)} formatter={fmt} />}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: 12, color: COLORS.axis }} iconType="circle" iconSize={8} />}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? "stack" : undefined}
              radius={radius(i)}
              maxBarSize={vertical ? 22 : 40}
              animationDuration={700}
            >
              {colorField && data.map((row, idx) => <Cell key={idx} fill={String(row[colorField] ?? s.color)} />)}
            </Bar>
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
