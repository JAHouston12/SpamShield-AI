import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { NAV_ITEMS } from "@/lib/nav";

export function NavCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {NAV_ITEMS.filter((n) => n.href !== "/").map((item, i) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group relative flex flex-col rounded-xl border bg-card/60 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <ArrowUpRight
                className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </div>
            <h3 className="mt-4 font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
