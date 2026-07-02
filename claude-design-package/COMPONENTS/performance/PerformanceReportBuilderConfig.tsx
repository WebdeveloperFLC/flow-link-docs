import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  REPORT_GROUP_OPTIONS,
  REPORT_METRICS,
  type ReportMetricId,
} from "@/incentives/lib/reportBuilderCmsLogic";
import type { ProfitabilityDimension } from "@/incentives/lib/commercialProfitabilityLogic";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

export function PerformanceReportBuilderConfig({
  dimension,
  onDimensionChange,
  metrics,
  onToggleMetric,
  onBuild,
  loading,
  period,
}: {
  dimension: ProfitabilityDimension;
  onDimensionChange: (d: ProfitabilityDimension) => void;
  metrics: Set<ReportMetricId>;
  onToggleMetric: (id: ReportMetricId) => void;
  onBuild: () => void;
  loading?: boolean;
  period: string;
}) {
  return (
    <Card className="p-5 ph-surface-card space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4" style={{ color: "var(--blue)" }} />
        <h2 className="font-semibold ph-heading">Compose report</h2>
      </div>

      <div>
        <label className="text-xs font-semibold ph-muted uppercase tracking-wide">Report period</label>
        <p className="mt-1 text-sm ph-heading">{period}</p>
        <p className="text-xs ph-muted mt-1">Controlled by the period bar above</p>
      </div>

      <div>
        <label className="text-xs font-semibold ph-muted uppercase tracking-wide">Group by</label>
        <select
          className="mt-1 w-full border rounded-md h-9 px-2 bg-background text-sm"
          value={dimension}
          onChange={(e) => onDimensionChange(e.target.value as ProfitabilityDimension)}
        >
          {REPORT_GROUP_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold ph-muted uppercase tracking-wide">Metrics</label>
        <ul className="mt-2 space-y-2">
          {REPORT_METRICS.map((m) => {
            const on = metrics.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onToggleMetric(m.id)}
                  className="flex items-center gap-2 text-sm w-full text-left"
                >
                  <span
                    className={cn(
                      "size-4 rounded border flex items-center justify-center text-[10px]",
                      on ? "bg-[var(--blue)] border-[var(--blue)] text-white" : "border-border",
                    )}
                  >
                    {on ? "✓" : ""}
                  </span>
                  {m.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <label className="text-xs font-semibold ph-muted uppercase tracking-wide">Filters</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {["Branch", "Country", "Currency"].map((f) => (
            <span key={f} className="rounded-full border px-2 py-0.5 text-xs ph-muted">
              {f}
            </span>
          ))}
        </div>
        <p className="text-[11px] ph-muted mt-2">Branch filter via period bar · dimension rows below</p>
      </div>

      <Button className="w-full gap-2" onClick={onBuild} disabled={loading || metrics.size === 0}>
        <FileText className="size-4" /> Build report
      </Button>
    </Card>
  );
}
