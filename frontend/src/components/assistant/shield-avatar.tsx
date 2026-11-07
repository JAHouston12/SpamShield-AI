import { cn } from "@/lib/utils";

/** Shield's face: blinks while idle, pulses while listening, and moves its mouth while speaking. */
export function ShieldAvatar({
  state = "idle",
  className,
}: {
  state?: "idle" | "listening" | "talking" | "thinking";
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", state === "talking" && "shield-talking", className)} aria-hidden>
      {state === "listening" && <span className="absolute inset-0 animate-ping rounded-full bg-spam/40" />}
      {state === "thinking" && <span className="absolute inset-0 animate-pulse rounded-full bg-primary/30" />}
      <svg viewBox="0 0 64 64" className="relative h-full w-full drop-shadow-[0_0_10px_hsl(var(--primary)/0.45)]">
        <defs>
          <linearGradient id="shield-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(187 92% 55%)" />
            <stop offset="1" stopColor="hsl(262 83% 62%)" />
          </linearGradient>
        </defs>
        <path d="M32 3 L56 12 V30 C56 45 45 56 32 61 C19 56 8 45 8 30 V12 Z" fill="url(#shield-face)" />
        <path d="M32 8 L51 15 V30 C51 42 43 51 32 55.5 C21 51 13 42 13 30 V15 Z" fill="hsl(222 47% 8%)" />
        <ellipse className="shield-eye" cx="24" cy="27" rx="3.6" ry="4.6" fill="hsl(187 92% 60%)" />
        <ellipse className="shield-eye" cx="40" cy="27" rx="3.6" ry="4.6" fill="hsl(187 92% 60%)" />
        <rect className="shield-mouth" x="24" y="38" width="16" height="6" rx="3" fill="hsl(187 92% 60%)" />
      </svg>
    </span>
  );
}
