import { Input } from "@/components/ui/input";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  showBranch?: boolean;
  compact?: boolean;
}

export function PerformancePeriodBar({ className, showBranch = true, compact = false }: Props) {
  const { period, setPeriod, branchId, setBranchId, branchLabel, branches, branchesLoading } =
    usePerformancePeriod();

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 px-3 py-2",
        compact && "py-1.5",
        className,
      )}
    >
      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          Period
        </label>
        <Input
          className={cn("mt-0.5", compact ? "h-8 w-28 text-sm" : "w-32")}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="2026-06"
        />
      </div>
      {showBranch && (
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            Branch
          </label>
          <select
            className={cn(
              "mt-0.5 border rounded-md px-2 bg-background text-sm min-w-[140px]",
              compact ? "h-8" : "h-9",
            )}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={branchesLoading}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {!compact && (
        <p className="text-xs text-muted-foreground pb-1 ml-auto">
          Shared across Performance Hub admin screens · {branchLabel}
        </p>
      )}
    </div>
  );
}
