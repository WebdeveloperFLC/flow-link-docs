import { Badge } from "@/components/ui/badge";
import {
  QUALIFICATION_STATUS_BADGE_CLASS,
  QUALIFICATION_STATUS_LABELS,
  HOLD_REASON_LABELS,
} from "@/lib/qualification/constants";
import type { QualificationLifecycleStatus } from "@/lib/qualification/types";

type Props = {
  status: QualificationLifecycleStatus;
  holdReasonCode?: string | null;
};

export function QualificationLifecycleBadge({ status, holdReasonCode }: Props) {
  const holdLabel =
    status === "ON_HOLD" && holdReasonCode
      ? HOLD_REASON_LABELS[holdReasonCode as keyof typeof HOLD_REASON_LABELS]
      : null;

  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge variant="outline" className={QUALIFICATION_STATUS_BADGE_CLASS[status]}>
        {QUALIFICATION_STATUS_LABELS[status]}
      </Badge>
      {holdLabel && <span className="text-xs text-amber-800">{holdLabel}</span>}
    </div>
  );
}
