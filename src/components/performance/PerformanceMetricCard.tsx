import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { PERFORMANCE_MODULE, type PerformanceModule } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

interface PerformanceMetricCardProps {
  module: PerformanceModule;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function PerformanceMetricCard({
  module,
  label,
  value,
  detail,
  footer,
  className,
}: PerformanceMetricCardProps) {
  const m = PERFORMANCE_MODULE[module];
  return (
    <Card className={cn("p-5 border-l-4", m.border, m.bg, className)}>
      <p className={cn("text-xs font-semibold uppercase tracking-wide", m.text)}>{label}</p>
      <div className="text-3xl font-semibold mt-2 tabular-nums">{value}</div>
      {detail && <div className="text-sm text-muted-foreground mt-2">{detail}</div>}
      {footer && <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">{footer}</div>}
    </Card>
  );
}
