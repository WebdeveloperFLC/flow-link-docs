import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatInr, PERFORMANCE_MODULE } from "@/lib/performanceHubTheme";

export interface MoneyRailStep {
  label: string;
  value: number;
  module: keyof typeof PERFORMANCE_MODULE;
  hint?: string;
}

export function PerformanceMoneyRail({ steps, loading }: { steps: MoneyRailStep[]; loading?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px] items-center gap-1">
        {steps.map((step, i) => {
          const m = PERFORMANCE_MODULE[step.module];
          return (
            <div key={step.label} className="flex flex-1 items-center min-w-0">
              <div
                className={cn(
                  "flex-1 rounded-lg border ph-surface-card p-3 text-center min-w-[120px]",
                  m.card,
                  m.border,
                  "border-l-4",
                )}
              >
                <p className={cn("text-[10px] font-bold uppercase tracking-wide", m.labelClass, m.text)}>{step.label}</p>
                <p className="text-lg font-semibold mt-1 tabular-nums">
                  {loading ? "…" : formatInr(step.value, "INR")}
                </p>
                {step.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{step.hint}</p>}
              </div>
              {i < steps.length - 1 && (
                <span className="px-1 text-muted-foreground shrink-0" aria-hidden>
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PerformanceKpiGrid({
  items,
  loading,
}: {
  loading?: boolean;
  items: { label: string; value: string; module: keyof typeof PERFORMANCE_MODULE; hint?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((item) => {
        const m = PERFORMANCE_MODULE[item.module];
        return (
          <div
            key={item.label}
            className={cn("rounded-lg border ph-surface-card p-3 border-l-4", m.card, m.border)}
          >
            <p className={cn("text-[10px] font-bold uppercase tracking-wide", m.labelClass, m.text)}>{item.label}</p>
            <p className="text-xl font-semibold mt-1 tabular-nums">{loading ? "…" : item.value}</p>
            {item.hint && <p className="text-[10px] text-muted-foreground mt-1">{item.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function FinanceWorkflowLink({
  to,
  label,
  readOnly,
  onReadOnly,
}: {
  to: string;
  label: string;
  readOnly?: boolean;
  onReadOnly?: () => void;
}) {
  if (readOnly) {
    return (
      <button
        type="button"
        className="text-sm font-medium text-primary hover:underline"
        onClick={onReadOnly}
      >
        {label} → Finance workflow
      </button>
    );
  }
  return (
    <Link to={to} className="text-sm font-medium text-primary hover:underline">
      {label} →
    </Link>
  );
}
