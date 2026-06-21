import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_LIFECYCLE_BADGE_CLASS,
  APPLICATION_LIFECYCLE_STATUS_LABELS,
  HOLD_REASON_LABELS,
} from "@/lib/application/constants";
import type { ApplicationLifecycleStatus } from "@/lib/application/types";

type Props = {
  status: ApplicationLifecycleStatus;
  holdReasonCode?: string | null;
};

export function ApplicationLifecycleBadge({ status, holdReasonCode }: Props) {
  const holdLabel =
    status === "ON_HOLD" && holdReasonCode
      ? HOLD_REASON_LABELS[holdReasonCode as keyof typeof HOLD_REASON_LABELS]
      : null;

  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge variant="outline" className={APPLICATION_LIFECYCLE_BADGE_CLASS[status]}>
        {APPLICATION_LIFECYCLE_STATUS_LABELS[status]}
      </Badge>
      {holdLabel && <span className="text-xs text-amber-800">{holdLabel}</span>}
    </div>
  );
}
