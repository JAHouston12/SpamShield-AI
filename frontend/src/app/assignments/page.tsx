import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FolderOpen } from "lucide-react";

import { AssignmentMeta } from "@/components/assignments/assignment-meta";
import { PageHeader } from "@/components/layout/page-header";
import { sortedAssignments } from "@/content/assignments";

export const metadata: Metadata = { title: "Assignments" };

export default function AssignmentsPage() {
  const assignments = sortedAssignments();

  return (
    <>
      <PageHeader
        eyebrow="Tools · Assignments"
        title="Assignments"
        description="Course assignments behind this project, newest first. Open one to read the original PDF and jump to the pages that implement it."
      />

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed p-12 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-medium">No assignments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add one in src/content/assignments.ts.</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {assignments.map((a) => {
            return (
              <li key={a.slug}>
                <Link
                  href={`/assignments/${a.slug}`}
                  className="group flex h-full flex-col rounded-xl border bg-card/60 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary ring-1 ring-primary/30">
                      {String(a.number).padStart(2, "0")}
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden
                    />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">{a.title}</h2>
                  <p className="text-sm text-primary">{a.subtitle}</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{a.summary}</p>
                  <AssignmentMeta assignment={a} className="mt-auto pt-4" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
