"use client";

import { useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ReportRow {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

interface Model {
  key: string;
  name: string;
  threshold: number;
  report: Record<string, ReportRow>;
}

const ROWS = ["ham", "spam", "macro avg", "weighted avg"];

export function ClassificationReport({ models, initial }: { models: Model[]; initial: string }) {
  const [key, setKey] = useState(initial);
  const m = models.find((x) => x.key === key) ?? models[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="report-model" className="text-sm text-muted-foreground">
          Model
        </label>
        <Select value={key} onValueChange={setKey}>
          <SelectTrigger id="report-model" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((x) => (
              <SelectItem key={x.key} value={x.key}>
                {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="font-mono text-xs text-muted-foreground">decision threshold = {m.threshold}</span>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Precision</TableHead>
              <TableHead className="text-right">Recall</TableHead>
              <TableHead className="text-right">F1-score</TableHead>
              <TableHead className="text-right">Support</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((r) => {
              const row = m.report[r];
              return (
                <TableRow key={r} className={r.includes("avg") ? "text-muted-foreground" : undefined}>
                  <TableCell className={r === "spam" ? "text-spam" : r === "ham" ? "text-ham" : undefined}>{r}</TableCell>
                  <TableCell className="text-right font-mono">{row.precision.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{row.recall.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{row.f1.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{row.support}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
