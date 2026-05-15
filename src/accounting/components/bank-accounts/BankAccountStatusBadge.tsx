import { cn } from "@/lib/utils";
import { BankAccountStatus } from "../../types/bankAccounts";

export default function BankAccountStatusBadge({ status }: { status: BankAccountStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
        status === "ACTIVE"
          ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", status === "ACTIVE" ? "bg-green-500" : "bg-muted-foreground/60")} />
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </span>
  );
}