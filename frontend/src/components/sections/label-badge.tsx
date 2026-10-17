import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LabelBadge({ label, className }: { label: string; className?: string }) {
  const spam = label === "spam";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[11px] uppercase",
        spam ? "border-spam/40 bg-spam/10 text-spam" : "border-ham/40 bg-ham/10 text-ham",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
