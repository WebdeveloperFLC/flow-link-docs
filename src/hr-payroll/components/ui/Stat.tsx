import type { LucideIcon } from "lucide-react";

type Props = {
  lab: string;
  val: string | number;
  meta?: string;
  color?: string;
  variant?: "metric" | "highlight" | "default";
  icon?: LucideIcon;
  iconBg?: string;
};

export function Stat({
  lab,
  val,
  meta,
  color = "var(--moss)",
  variant = "default",
  icon: Icon,
  iconBg,
}: Props) {
  const isHighlight = variant === "highlight";
  const isMetric = variant === "metric";

  return (
    <div
      className={`stat${isMetric ? " stat-metric" : ""}${isHighlight ? " stat-highlight" : ""}`}
    >
      {isHighlight && (
        <div className="stat-accent" style={{ background: color }} aria-hidden />
      )}
      {isMetric && Icon && (
        <div
          className="stat-icon"
          style={{
            background: iconBg ?? `${color}18`,
            color,
          }}
        >
          <Icon size={16} strokeWidth={2.2} />
        </div>
      )}
      <div className="stat-lab">{lab}</div>
      <div className="stat-val serif" style={{ color: isHighlight ? color : color }}>
        {val}
      </div>
      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  );
}
