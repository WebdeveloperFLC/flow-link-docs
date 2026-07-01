import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PayoutCohort = "all" | "pending" | "approved" | "paid";

interface PayoutCohortBarProps {
  cohort: PayoutCohort;
  counts: Partial<Record<PayoutCohort, number>>;
  onChange: (cohort: PayoutCohort) => void;
  className?: string;
}

const COHORT_LABELS: Record<PayoutCohort, string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
};

/** Bulk payout processing by status cohort (Bible §6.5). */
export function PayoutCohortBar({ cohort, counts, onChange, className }: PayoutCohortBarProps) {
  const keys: PayoutCohort[] = ["all", "pending", "approved", "paid"];
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {keys.map((key) => (
        <Button
          key={key}
          type="button"
          size="sm"
          variant={cohort === key ? "default" : "outline"}
          onClick={() => onChange(key)}
        >
          {COHORT_LABELS[key]}
          {counts[key] != null && (
            <span className="ml-1.5 tabular-nums opacity-80">({counts[key]})</span>
          )}
        </Button>
      ))}
    </div>
  );
}

interface BulkActionBarProps {
  selectedCount: number;
  onApproveSelected: () => void;
  onMarkPaidSelected: () => void;
  onSelectAllInView: () => void;
  onClearSelection: () => void;
  disabled?: boolean;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  onApproveSelected,
  onMarkPaidSelected,
  onSelectAllInView,
  onClearSelection,
  disabled,
  className,
}: BulkActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm",
        className,
      )}
    >
      <span className="font-medium tabular-nums">{selectedCount} selected</span>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onSelectAllInView}>
        Select visible
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={disabled || selectedCount === 0} onClick={onClearSelection}>
        Clear
      </Button>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={disabled || selectedCount === 0} onClick={onApproveSelected}>
          Approve selected
        </Button>
        <Button type="button" size="sm" disabled={disabled || selectedCount === 0} onClick={onMarkPaidSelected}>
          Mark paid selected
        </Button>
      </div>
    </div>
  );
}
