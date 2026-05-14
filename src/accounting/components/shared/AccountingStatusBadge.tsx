import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_REVIEW: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  POSTED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  VOIDED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  SUBMITTED: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  REJECTED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  OTP_PENDING: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

export default function AccountingStatusBadge({ status }: { status: string }) {
  const cls = MAP[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full inline-block", cls)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}