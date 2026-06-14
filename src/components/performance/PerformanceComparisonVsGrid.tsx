import { Card } from "@/components/ui/card";
import type { ComparisonEntityCard, ComparisonMetricRow } from "@/incentives/lib/comparisonEngineLogic";
import { cn } from "@/lib/utils";

export function PerformanceComparisonVsGrid({
  left,
  right,
  metrics,
}: {
  left: ComparisonEntityCard;
  right: ComparisonEntityCard;
  metrics: ComparisonMetricRow[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
      <Card className="p-5 ph-surface-card">
        <p className="font-semibold ph-heading">{left.title}</p>
        {left.subtitle && <p className="text-xs ph-muted mt-1">{left.subtitle}</p>}
        <dl className="mt-4 space-y-3">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
              <dt className="ph-muted">{m.label}</dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums",
                  m.winner === "a" && "text-[var(--cashTxt)]",
                )}
              >
                {m.valueA}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="hidden lg:flex items-center justify-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full border font-bold ph-heading bg-muted/30">
          VS
        </span>
      </div>

      <Card className="p-5 ph-surface-card">
        <p className="font-semibold ph-heading">{right.title}</p>
        {right.subtitle && <p className="text-xs ph-muted mt-1">{right.subtitle}</p>}
        <dl className="mt-4 space-y-3">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
              <dt className="ph-muted">{m.label}</dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums",
                  m.winner === "b" && "text-[var(--cashTxt)]",
                )}
              >
                {m.valueB}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
