import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Insight } from "@/components/sections/insight";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  interpretation?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function ChartCard({ title, description, interpretation, className, action, children }: ChartCardProps) {
  return (
    <Card className={cn("flex min-w-0 flex-col bg-card/70", className)}>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex-1">{children}</div>
        {interpretation && <Insight>{interpretation}</Insight>}
      </CardContent>
    </Card>
  );
}
