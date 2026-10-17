import { Badge } from "@/components/ui/badge";

export function RoleBadge({ role, best }: { role: string; best?: boolean }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {role === "baseline" && (
        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
          Baseline
        </Badge>
      )}
      {role === "improved" && (
        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
          Improved model
        </Badge>
      )}
      {best && (
        <Badge variant="outline" className="border-ham/40 bg-ham/10 text-ham">
          #1 ranked
        </Badge>
      )}
    </span>
  );
}
