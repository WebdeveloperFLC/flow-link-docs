import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { PERFORMANCE_MODULE, type PerformanceModule } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

interface KpiItem {
  module: PerformanceModule;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  testId?: string;
}

interface PerformanceHomeKpiStripProps {
  items: KpiItem[];
  loading?: boolean;
}

export function PerformanceHomeKpiStrip({ items, loading }: PerformanceHomeKpiStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const m = PERFORMANCE_MODULE[item.module];
        return (
          <Card
            key={item.label}
            data-testid={item.testId}
            className={cn("p-5 ph-surface-card border-l-4", m.border, m.card)}
          >
            <p className={cn("text-xs font-semibold uppercase tracking-wide", m.labelClass, m.text)}>
              {item.label}
            </p>
            <div className="text-2xl sm:text-3xl font-semibold mt-2 tabular-nums ph-heading">
              {loading ? "…" : item.value}
            </div>
            {item.hint && !loading && (
              <p className="text-xs ph-muted mt-2 leading-relaxed">{item.hint}</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
