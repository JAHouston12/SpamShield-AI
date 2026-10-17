"use client";

import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart as RRadar, ResponsiveContainer, Tooltip } from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { COLORS } from "@/components/charts/theme";

interface Props {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color: string }[];
  domain?: [number, number];
  height?: number;
  ariaLabel: string;
}

export function RadarChart({ data, series, domain = [0.85, 1], height = 320, ariaLabel }: Props) {
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <RRadar data={data} outerRadius="72%">
          <PolarGrid stroke={COLORS.grid} />
          <PolarAngleAxis dataKey="metric" tick={{ fill: COLORS.axis, fontSize: 12 }} />
          <PolarRadiusAxis domain={domain} tick={{ fill: COLORS.axis, fontSize: 10 }} axisLine={false} tickCount={4} />
          {series.map((s) => (
            <Radar key={s.key} dataKey={s.key} name={s.label} stroke={s.color} fill={s.color} fillOpacity={0.12} strokeWidth={2} />
          ))}
          <Tooltip content={(props) => <ChartTooltip {...(props as object)} formatter={(v) => `${(v * 100).toFixed(2)}%`} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        </RRadar>
      </ResponsiveContainer>
    </div>
  );
}
