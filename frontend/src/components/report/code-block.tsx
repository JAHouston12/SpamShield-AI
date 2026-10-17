"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CodeBlock({ code, lang, title }: { code: string; lang?: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="print-keep overflow-hidden rounded-lg border bg-[hsl(222_47%_5%)] print:bg-muted">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{title ?? lang ?? "shell"}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="no-print h-7 gap-1 px-2 text-xs"
          aria-label={copied ? "Copied" : `Copy ${title ?? "code"}`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-ham" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
