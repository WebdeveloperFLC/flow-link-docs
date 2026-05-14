import { cn } from "@/lib/utils";
import { FlagType } from "../../types/fraud";

const LABELS: Record<FlagType, string> = {
  DUPLICATE_PAYMENT: "Duplicate payment",
  UNAPPROVED_VENDOR: "Unapproved vendor",
  ROUND_NUMBER_BILLING: "Round-number billing",
  HIGH_VELOCITY: "High velocity",
  OFF_HOURS_SUBMISSION: "Off-hours",
  AMOUNT_MISMATCH: "Amount mismatch",
};

const STYLES: Record<FlagType, string> = {
  DUPLICATE_PAYMENT: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  UNAPPROVED_VENDOR: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  ROUND_NUMBER_BILLING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  HIGH_VELOCITY: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  OFF_HOURS_SUBMISSION: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  AMOUNT_MISMATCH: "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
};

export default function FraudFlagBadge({ type }: { type: FlagType }) {
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full inline-block whitespace-nowrap", STYLES[type])}>
      {LABELS[type]}
    </span>
  );
}