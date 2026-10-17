"use client";

import { useEffect, useState } from "react";

import { CLIENT_API_BASE } from "@/lib/config";
import { cn } from "@/lib/utils";

type Status = "checking" | "online" | "offline";

const LABELS: Record<Status, string> = {
  checking: "Checking API...",
  online: "Detection API online",
  offline: "API offline · snapshot mode",
};

export function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${CLIENT_API_BASE}/health`, { cache: "no-store" });
        if (!cancelled) setStatus(res.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "online" && "bg-ham animate-pulse-glow",
          status === "offline" && "bg-warning",
          status === "checking" && "bg-muted-foreground",
        )}
        aria-hidden
      />
      {LABELS[status]}
    </div>
  );
}
