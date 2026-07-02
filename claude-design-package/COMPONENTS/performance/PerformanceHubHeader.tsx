import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PERFORMANCE_MODULE, currentPeriodKey, type PerformanceModule } from "@/lib/performanceHubTheme";
import { BookOpen, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PerformanceWorkspaceNav } from "@/components/performance/PerformanceWorkspaceNav";
import { pathnameToWorkspace, usesOffersStudioNav, type PerformanceWorkspaceId } from "@/incentives/lib/performanceWorkspaceNav";

interface PerformanceHubHeaderProps {
  title: string;
  subtitle?: string;
  profileName?: string;
  branchName?: string | null;
  period?: string;
  showModuleLegend?: boolean;
  primaryAction?: { label: string; to: string };
  /** Override auto-detected workspace sub-nav; set false to hide */
  workspace?: PerformanceWorkspaceId | false;
}

export function PerformanceHubHeader({
  title,
  subtitle,
  profileName,
  branchName,
  period = currentPeriodKey(),
  showModuleLegend = true,
  primaryAction,
  workspace,
}: PerformanceHubHeaderProps) {
  const { pathname } = useLocation();
  const resolvedWorkspace =
    workspace === false ? null : (workspace ?? pathnameToWorkspace(pathname));

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

      {resolvedWorkspace && !usesOffersStudioNav(pathname) && (
        <PerformanceWorkspaceNav workspace={resolvedWorkspace} />
      )}

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
            Workspaces group related tools — use tabs below to move within an area
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
