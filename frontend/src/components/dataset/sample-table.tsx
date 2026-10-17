"use client";

import { useMemo, useState } from "react";

import { LabelBadge } from "@/components/sections/label-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Row {
  id: number;
  label: string;
  message: string;
  length: number;
}

type Filter = "all" | "spam" | "ham";

export function SampleTable({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.label === filter)), [rows, filter]);

  return (
    <div>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
        <TabsList aria-label="Filter sample rows by label">
          <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
          <TabsTrigger value="spam">Spam ({rows.filter((r) => r.label === "spam").length})</TabsTrigger>
          <TabsTrigger value="ham">Ham ({rows.filter((r) => r.label === "ham").length})</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-20">Row</TableHead>
              <TableHead className="w-24">label</TableHead>
              <TableHead>message</TableHead>
              <TableHead className="hidden w-20 text-right sm:table-cell">chars</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                <TableCell>
                  <LabelBadge label={r.label} />
                </TableCell>
                <TableCell className="max-w-xl text-sm leading-relaxed">{r.message}</TableCell>
                <TableCell className="hidden text-right font-mono text-xs text-muted-foreground sm:table-cell">
                  {r.length}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
