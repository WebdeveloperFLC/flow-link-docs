import { cn } from "@/lib/utils";
import { CoaAccountStatus } from "../../types/coa";

export default function AccountStatusBadge({ status }: { status: CoaAccountStatus }) {
  const cls = status === "ACTIVE"
    ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
    : "bg-muted text-muted-foreground";
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full inline-block", cls)}>
      {status}
    </span>
  );
}