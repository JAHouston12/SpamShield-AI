"use client";

import { useMemo, useState } from "react";

import { BarChart } from "@/components/charts/bar-chart";
import { COLORS } from "@/components/charts/theme";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GlobalImportance } from "@/types/artifacts";

type Kind = "all" | "token" | "engineered" | "pattern";

interface Props {
  models: { key: string; name: string; importance: GlobalImportance | null }[];
  initial: string;
}

export function ImportanceExplorer({ models, initial }: Props) {
  const available = models.filter((m) => m.importance);
  const [key, setKey] = useState(initial);
  const [kind, setKind] = useState<Kind>("all");
  const current = available.find((m) => m.key === key) ?? available[0];

  const data = useMemo(() => {
    const feats = current.importance!.features.filter((f) => kind === "all" || (kind === "token" ? f.kind === "token" || f.kind === "bigram" : f.kind === kind));
    return feats.slice(0, 15).map((f) => ({
      feature: f.feature,
      value: f.direction === "spam" ? f.normalized : -f.normalized,
      color: f.direction === "spam" ? COLORS.spam : COLORS.ham,
    }));
  }, [current, kind]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={current.key} onValueChange={setKey}>
          <SelectTrigger className="w-60" aria-label="Select model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {available.map((m) => (
              <SelectItem key={m.key} value={m.key}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <TabsList aria-label="Filter by feature type">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="token">Words</TabsTrigger>
            <TabsTrigger value="pattern">Patterns</TabsTrigger>
            <TabsTrigger value="engineered">Engineered</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Method: {current.importance!.method}. Bars to the right push toward <span className="text-spam">spam</span>, left toward{" "}
        <span className="text-ham">ham</span>; length is relative to the strongest feature.
      </p>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No features of this type are in the model&apos;s top 25.</p>
      ) : (
        <BarChart
          ariaLabel={`Top features for ${current.name}`}
          data={data}
          xKey="feature"
          series={[{ key: "value", label: "Signed importance", color: COLORS.primary }]}
          layout="vertical"
          categoryWidth={150}
          colorField="color"
          format="decimal2"
          domain={[data.some((d) => d.value < 0) ? -1 : 0, data.some((d) => d.value > 0) ? 1 : 0]}
          height={Math.max(220, data.length * 28)}
        />
      )}
      {models.some((m) => !m.importance) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {models.filter((m) => !m.importance).map((m) => m.name).join(", ")} exposes no native importance (instance-based); use the SHAP panels below.
        </p>
      )}
    </div>
  );
}
