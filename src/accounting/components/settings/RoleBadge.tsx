import { cn } from "@/lib/utils";
import { AccountingRole } from "../../types/accountingUsers";

const MAP: Record<AccountingRole, { cls: string; label: string }> = {
  SUPER_ADMIN:        { cls: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400", label: "Super admin" },
  FINANCE_ADMIN:      { cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",       label: "Finance admin" },
  ACCOUNTANT:         { cls: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",       label: "Accountant" },
  AUDITOR:            { cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",   label: "Auditor" },
  FINAL_AUDITOR:      { cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400", label: "Final auditor" },
  BRANCH_MANAGER:     { cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",   label: "Branch manager" },
  COMPLIANCE_OFFICER: { cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",  label: "Compliance officer" },
  VIEWER:             { cls: "bg-muted text-muted-foreground",                                         label: "Viewer" },
};

export default function RoleBadge({ role }: { role: AccountingRole }) {
  const m = MAP[role];
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full inline-block", m.cls)}>
      {m.label}
    </span>
  );
}

export const ROLE_OPTIONS = Object.keys(MAP) as AccountingRole[];