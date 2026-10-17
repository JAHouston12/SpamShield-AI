import { Badge } from "@/components/ui/badge";
import type { DataSource } from "@/types/artifacts";

export function SourceBadge({ source, trainedAt }: { source: DataSource; trainedAt?: string }) {
  const live = source === "live";
  return (
    <Badge
      variant="outline"
      className={live ? "border-ham/40 bg-ham/10 text-ham" : "border-warning/40 bg-warning/10 text-warning"}
      title={live ? "Served by the FastAPI backend" : "Backend unreachable; showing bundled training snapshot"}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {live ? "Live API data" : "Snapshot data"}
      {trainedAt && <span className="ml-1.5 font-normal opacity-80">· trained {trainedAt.slice(0, 10)}</span>}
    </Badge>
  );
}
