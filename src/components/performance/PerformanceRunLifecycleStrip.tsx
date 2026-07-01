import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type RunLifecycleStep = {
  step: number;
  label: string;
  to: string;
  icon: LucideIcon;
  blocked?: boolean;
  hint?: string;
  complete?: boolean;
};

interface PerformanceRunLifecycleStripProps {
  period: string;
  steps: RunLifecycleStep[];
  className?: string;
}

/** Preview → Calculate → Lock → Payout — staged inline (Bible §6.5). */
export function PerformanceRunLifecycleStrip({ period, steps, className }: PerformanceRunLifecycleStripProps) {
  return (
    <Card className={cn("p-5 ph-surface-card", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Lock className="size-4 ph-muted" />
        <h2 className="text-lg font-semibold ph-heading">Run lifecycle · {period}</h2>
      </div>
      <ol className="space-y-2">
        {steps.map((w) => (
          <li key={w.step}>
            <Link
              to={w.to}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                w.blocked ? "opacity-60 hover:bg-muted/30" : "hover:bg-muted/50",
                w.complete && "border-l-4 border-l-emerald-500",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  w.complete ? "bg-emerald-500/15 text-emerald-700" : "bg-primary/10",
                )}
              >
                {w.complete ? "✓" : w.step}
              </span>
              <w.icon className="size-4 ph-muted shrink-0" />
              <span className="flex-1 font-medium text-sm">{w.label}</span>
              {w.blocked && w.hint && (
                <span className="text-xs text-amber-700 dark:text-amber-400 max-w-[14rem] truncate">{w.hint}</span>
              )}
              <ChevronRight className="size-4 ph-muted shrink-0" />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
