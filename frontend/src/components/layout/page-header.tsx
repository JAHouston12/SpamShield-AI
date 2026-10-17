import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <header className="mb-10 animate-fade-up">
      {eyebrow && (
        <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/10 font-mono text-xs text-primary">
          {eyebrow}
        </Badge>
      )}
      <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">{description}</p>}
      {children && <div className="mt-6">{children}</div>}
    </header>
  );
}
