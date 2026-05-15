import { cn } from "@/lib/utils";
import { ReconciliationSnapshotStatus } from "../../types/bankAccounts";

const MAP: Record<ReconciliationSnapshotStatus, { label: string; cls: string }> = {
  MATCHED:     { label: "Matched",     cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" },
  PENDING:     { label: "Pending",     cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  DISCREPANCY: { label: "Discrepancy", cls: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
};

export default function ReconciliationStatusPill({ status }: { status: ReconciliationSnapshotStatus | null | undefined }) {
  if (!status) return <span className="text-[12px] text-muted-foreground">Not reconciled</span>;
  const cfg = MAP[status];
  return (
    <span className={cn("inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full", cfg.cls)}>
      {cfg.label}
    </span>
  );
}