import { Badge } from "@/components/ui/badge";
import type { InstitutionStatus } from "../types/upi";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<InstitutionStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Review: "border-amber-500/50 text-amber-700 dark:text-amber-400",
  Active: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  Inactive: "bg-muted text-muted-foreground",
  Archived: "bg-destructive/10 text-destructive border-destructive/30",
};

export function InstitutionStatusBadge({
  status,
  className,
}: {
  status: InstitutionStatus | string | null | undefined;
  className?: string;
}) {
  const s = (status ?? "Draft") as InstitutionStatus;
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", STATUS_CLASS[s] ?? STATUS_CLASS.Draft, className)}>
      {s}
    </Badge>
  );
}

export const INSTITUTION_STATUS_OPTIONS: InstitutionStatus[] = [
  "Draft",
  "Review",
  "Active",
  "Inactive",
  "Archived",
];
