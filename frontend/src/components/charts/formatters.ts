export type ValueFormat = "number" | "percent" | "percent0" | "decimal2" | "decimal3" | "decimal4";

export function formatValue(v: number, format: ValueFormat = "number"): string {
  switch (format) {
    case "percent":
      return `${(v * 100).toFixed(1)}%`;
    case "percent0":
      return `${(v * 100).toFixed(0)}%`;
    case "decimal2":
      return v.toFixed(2);
    case "decimal3":
      return v.toFixed(3);
    case "decimal4":
      return v.toFixed(4);
    default:
      return v.toLocaleString("en-US");
  }
}
