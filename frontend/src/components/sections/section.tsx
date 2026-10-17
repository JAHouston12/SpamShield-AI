import { cn } from "@/lib/utils";

interface SectionProps {
  id?: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function Section({ id, title, description, className, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("mb-14 scroll-mt-20", className)}>
      <div className="mb-5">
        <h2 id={id ? `${id}-title` : undefined} className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
