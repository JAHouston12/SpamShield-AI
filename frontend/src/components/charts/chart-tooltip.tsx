"use client";

interface Item {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

interface Props {
  active?: boolean;
  payload?: readonly Item[];
  label?: string | number;
  formatter?: (v: number) => string;
}

export function ChartTooltip({ active, payload, label, formatter }: Props) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined && label !== "" && <p className="mb-1 font-medium text-foreground">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={`${p.dataKey}-${i}`} className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
            <span>{p.name}</span>
            <span className="ml-auto pl-3 font-mono text-foreground">
              {typeof p.value === "number" && formatter ? formatter(p.value) : String(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
