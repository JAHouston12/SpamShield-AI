import type { Contribution } from "@/types/prediction";

/** Re-renders the original message, tinting words the explainer attributed toward spam or ham. */
export function HighlightedMessage({ text, contributions }: { text: string; contributions: Contribution[] }) {
  const weights = new Map<string, number>();
  for (const c of contributions) {
    if (c.kind === "token") weights.set(c.feature.toLowerCase(), c.contribution);
    if (c.kind === "bigram") c.feature.split(" ").forEach((w) => !w.startsWith("<") && !weights.has(w) && weights.set(w.toLowerCase(), c.contribution / 2));
  }
  const max = Math.max(0.01, ...Array.from(weights.values()).map(Math.abs));

  return (
    <p className="text-sm leading-7">
      {text.split(/(\s+)/).map((part, i) => {
        const key = part.toLowerCase().replace(/[^a-z']/g, "").replace(/'.*$/, "");
        const w = weights.get(key);
        if (w === undefined || !part.trim()) return <span key={i}>{part}</span>;
        const a = 0.15 + 0.55 * (Math.abs(w) / max);
        return (
          <mark
            key={i}
            className="rounded px-0.5 text-foreground"
            style={{ background: w > 0 ? `hsl(350 89% 62% / ${a})` : `hsl(152 69% 50% / ${a})` }}
            title={`${w > 0 ? "+" : ""}${w.toFixed(3)} log-odds`}
          >
            {part}
          </mark>
        );
      })}
    </p>
  );
}
