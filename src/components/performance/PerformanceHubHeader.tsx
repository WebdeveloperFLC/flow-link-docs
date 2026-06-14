import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PERFORMANCE_MODULE, currentPeriodKey, type PerformanceModule } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";
import { BookOpen, Gift } from "lucide-react";

interface PerformanceHubHeaderProps {
  title: string;
  subtitle?: string;
  profileName?: string;
  branchName?: string | null;
  period?: string;
  showModuleLegend?: boolean;
  primaryAction?: { label: string; to: string };
}

export function PerformanceHubHeader({
  title,
  subtitle,
  profileName,
  branchName,
  period = currentPeriodKey(),
  showModuleLegend = true,
  primaryAction,
}: PerformanceHubHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest ph-muted">
            Future Link · Commercial Management
          </p>
          <h1 className="text-2xl font-semibold mt-1 ph-heading">{title}</h1>
          {subtitle && <p className="text-sm ph-muted mt-1">{subtitle}</p>}
          {(profileName || branchName) && (
            <p className="text-sm font-medium mt-2">
              {profileName?.toUpperCase()}
              {branchName ? ` · ${branchName.toUpperCase()}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border ph-surface-card px-3 py-2 text-sm">
            <span className="ph-muted text-xs block">Period</span>
            <span className="font-semibold ph-heading">{period}</span>
          </div>
          {primaryAction && (
            <Button asChild className="gap-2">
              <Link to={primaryAction.to}>
                <Gift className="size-4" />
                {primaryAction.label}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {showModuleLegend && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(Object.keys(PERFORMANCE_MODULE) as PerformanceModule[]).map((key) => {
            const m = PERFORMANCE_MODULE[key];
            return (
              <span key={key} className={cn("rounded-full px-2.5 py-1 font-medium", m.badge)}>
                {m.short}
              </span>
            );
          })}
          <span className="text-muted-foreground ml-1 hidden sm:inline">
            One hub replaces Incentives · Wallet · Offers menus
          </span>
          <Link
            to="/guides/incentives-module"
            className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <BookOpen className="size-3.5" /> How modules connect
          </Link>
        </div>
      )}
    </div>
  );
}
