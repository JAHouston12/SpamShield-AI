export const COLORS = {
  primary: "hsl(187 92% 50%)",
  violet: "hsl(262 83% 68%)",
  ham: "hsl(152 69% 50%)",
  spam: "hsl(350 89% 62%)",
  warning: "hsl(38 92% 55%)",
  muted: "hsl(215 22% 72%)",
  grid: "hsl(217 30% 18%)",
  axis: "hsl(215 20% 65%)",
};

export const SERIES_PALETTE = [
  "hsl(187 92% 50%)",
  "hsl(262 83% 68%)",
  "hsl(152 69% 50%)",
  "hsl(38 92% 55%)",
  "hsl(350 89% 62%)",
  "hsl(210 90% 62%)",
  "hsl(320 75% 65%)",
  "hsl(90 60% 55%)",
  "hsl(25 90% 60%)",
  "hsl(170 60% 45%)",
];

export const AXIS_PROPS = {
  stroke: COLORS.axis,
  tick: { fill: COLORS.axis, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: COLORS.grid },
} as const;
