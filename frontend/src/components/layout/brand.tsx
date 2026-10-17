import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md" aria-label="SpamShield AI home">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/40">
        <ShieldCheck className="h-4.5 w-4.5 text-primary" aria-hidden />
      </span>
      <span className="text-base font-semibold tracking-tight">
        SpamShield <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
