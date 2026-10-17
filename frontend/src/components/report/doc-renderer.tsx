import { CodeBlock } from "@/components/report/code-block";
import type { DocBlock, DocSection } from "@/content/report";
import { cn } from "@/lib/utils";

function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "p":
      return <p className="leading-relaxed text-foreground/90">{block.text}</p>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={cn("space-y-1.5 pl-5 leading-relaxed text-foreground/90", block.ordered ? "list-decimal" : "list-disc")}>
          {block.items.map((item) => (
            <li key={item} className="pl-1 marker:text-primary">
              {item}
            </li>
          ))}
        </Tag>
      );
    }
    case "kv":
      return (
        <dl className="grid gap-x-6 gap-y-2 rounded-lg border bg-background/40 p-4 text-sm sm:grid-cols-[max-content_1fr]">
          {block.items.map((item) => (
            <div key={item.label} className="contents">
              <dt className="font-medium text-muted-foreground">{item.label}</dt>
              <dd className="text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      );
    case "code":
      return <CodeBlock code={block.code} lang={block.lang} title={block.title} />;
    case "callout":
      return (
        <div className="print-keep rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{block.title}</p>
          <p className="leading-relaxed text-foreground">{block.text}</p>
        </div>
      );
    case "table":
      return (
        <figure className="print-keep">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {block.head.map((h, i) => (
                    <th key={h} scope="col" className={cn("px-3 py-2 font-medium text-muted-foreground", i === 0 || i === 1 ? "text-left" : "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className={cn("border-t", r === block.highlightRow && "bg-primary/10")}>
                    {row.map((cell, c) => (
                      <td key={c} className={cn("px-3 py-2 tabular-nums", c === 0 || c === 1 ? "text-left" : "text-right font-mono text-xs")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption && <figcaption className="mt-2 text-xs text-muted-foreground">{block.caption}</figcaption>}
        </figure>
      );
  }
}

export function DocRenderer({ sections }: { sections: DocSection[] }) {
  return (
    <div className="space-y-10">
      {sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
          <h2 id={`${s.id}-h`} className="mb-4 border-b pb-2 text-xl font-semibold tracking-tight">
            {s.title}
          </h2>
          <div className="space-y-4">
            {s.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function DocToc({ sections }: { sections: DocSection[] }) {
  return (
    <nav aria-label="Sections" className="no-print">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contents</p>
      <ol className="space-y-1 text-sm">
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="block rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
