import { band, formatAchievementPct, type AchievementBand } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

function resolveBand(pct: number | null | undefined, explicit?: AchievementBand): AchievementBand {
  return explicit ?? band(pct);
}

/** 9px circle — achievement band color (Bible §6.3). */
export function StatusDot({
  pct,
  band: explicitBand,
  className,
  "aria-label": ariaLabel,
}: {
  pct?: number | null;
  band?: AchievementBand;
  className?: string;
  "aria-label"?: string;
}) {
  const b = resolveBand(pct, explicitBand);
  const label = ariaLabel ?? (pct != null ? `${formatAchievementPct(pct)} · ${b.label}` : b.label);
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-block size-[9px] shrink-0 rounded-full", className)}
      style={{ backgroundColor: `var(${b.colorVar})` }}
    />
  );
}

/** Pill: dot + label — achievement band (Bible §6.3). */
export function StatusBadge({
  pct,
  band: explicitBand,
  showLabel = true,
  className,
}: {
  pct?: number | null;
  band?: AchievementBand;
  showLabel?: boolean;
  className?: string;
}) {
  const b = resolveBand(pct, explicitBand);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        className,
      )}
      style={{
        backgroundColor: `var(${b.bgVar})`,
        color: `var(${b.textVar})`,
      }}
    >
      <StatusDot pct={pct} band={b} aria-hidden />
      {pct != null && <span>{formatAchievementPct(pct)}</span>}
      {showLabel && <span>{b.label}</span>}
    </span>
  );
}

/** Progress fill colored by achievement band (Bible §6.3). */
export function StatusBar({
  pct,
  band: explicitBand,
  maxPct = 120,
  className,
  showPct = true,
}: {
  pct: number | null | undefined;
  band?: AchievementBand;
  maxPct?: number;
  className?: string;
  showPct?: boolean;
}) {
  const b = resolveBand(pct, explicitBand);
  const p = Math.max(0, Math.min(pct ?? 0, maxPct));
  const widthPct = maxPct > 0 ? (p / maxPct) * 100 : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="ph-status-bar" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={maxPct}>
        <span
          className="ph-status-bar-fill"
          style={{ width: `${widthPct}%`, backgroundColor: `var(${b.colorVar})` }}
        />
      </div>
      {showPct && pct != null && (
        <p className="text-[11px] ph-muted flex items-center gap-1.5">
          <StatusDot pct={pct} band={b} />
          <span className="tabular-nums">{formatAchievementPct(pct)}</span>
          <span>{b.label}</span>
        </p>
      )}
    </div>
  );
}
