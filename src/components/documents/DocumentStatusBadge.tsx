import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DISPLAY_STATUS_LABELS,
  type RequirementDisplayStatus,
} from "@/lib/documentWorkflow/resolveDisplayStatus";

const STATUS_STYLES: Record<RequirementDisplayStatus, string> = {
  missing: "bg-muted text-muted-foreground border-muted-foreground/20",
  uploaded: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
  under_review: "bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
  need_replacement: "bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-300",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

interface Props {
  status: RequirementDisplayStatus;
  className?: string;
}

export function DocumentStatusBadge({ status, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium px-1.5 py-0 h-5", STATUS_STYLES[status], className)}
    >
      {DISPLAY_STATUS_LABELS[status]}
    </Badge>
  );
}
