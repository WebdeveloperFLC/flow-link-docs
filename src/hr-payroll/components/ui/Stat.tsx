import type { LucideIcon } from "lucide-react";

export type StatTone =
  | "blue"
  | "green"
  | "pink"
  | "cyan"
  | "orange"
  | "purple"
  | "gold"
  | "rose"
  | "indigo";

type Props = {
  lab: string;
  val: string | number;
  meta?: string;
  variant?: "metric" | "highlight" | "default";
  tone?: StatTone;
  icon?: LucideIcon;
  /** @deprecated use tone */
  color?: string;
  /** @deprecated use tone */
  iconBg?: string;
};

export function Stat({
  lab,
  val,
  meta,
  variant = "default",
  tone = "blue",
  icon: Icon,
}: Props) {
  const isHighlight = variant === "highlight";
  const isMetric = variant === "metric";

  const classes = [
    "stat",
    isMetric ? "stat-metric" : "",
    isHighlight ? "stat-highlight" : "",
    isMetric ? `stat-tone-${tone}` : "",
    isHighlight ? `stat-hl-${tone}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {isHighlight && <div className="stat-accent" aria-hidden />}
      {isMetric && Icon && (
        <div className="stat-icon">
          <Icon size={17} strokeWidth={2.25} />
        </div>
      )}
      <div className="stat-lab">{lab}</div>
      <div className="stat-val serif">{val}</div>
      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  );
}
