import { cn } from "@/lib/utils";
import { TaxStatus } from "../../types/tax";

const MAP: Record<TaxStatus, string> = {
  FILED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  OPEN: "bg-muted text-muted-foreground",
  LATE: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  DUE_SOON: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};
const LABEL: Record<TaxStatus, string> = {
  FILED: "Filed", OPEN: "Open", LATE: "Late", DUE_SOON: "Due soon",
};

export default function FilingStatusBadge({ status }: { status: TaxStatus }) {
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full inline-block", MAP[status])}>
      {LABEL[status]}
    </span>
  );
}