import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountGroup, CoaAccount } from "../../types/coa";
import type { SettingsEntity } from "../../types/settings";
import { formatCurrency } from "../../lib/format";
import AccountStatusBadge from "./AccountStatusBadge";
import CoaConceptTooltip from "./CoaConceptTooltip";

interface Props {
  rows: CoaAccount[];
  accountById: Map<string, CoaAccount>;
  allAccounts: CoaAccount[];
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
  groups: AccountGroup[];
  entities: SettingsEntity[];
  onRowClick: (account: CoaAccount) => void;
}

function depthOf(account: CoaAccount, accountById: Map<string, CoaAccount>): number {
  let depth = 0;
  let parentId = account.parentId;
  while (parentId) {
    depth += 1;
    parentId = accountById.get(parentId)?.parentId ?? null;
  }
  return depth;
}

function hasChildren(id: string, allAccounts: CoaAccount[]): boolean {
  return allAccounts.some((a) => a.parentId === id);
}

export default function CoaAccountsTable({
  rows,
  accountById,
  allAccounts,
  expandedIds,
  onToggleExpanded,
  groups,
  entities,
  onRowClick,
}: Props) {
  return (
    <div className="overflow-auto rounded-md border border-border" style={{ maxHeight: 620 }}>
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border">
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 w-[100px]">Code</th>
            <th className="px-3 py-2.5 min-w-[260px]">Account name</th>
            <th className="px-3 py-2.5 min-w-[140px]">Category</th>
            <th className="px-3 py-2.5 w-[90px]">Currency</th>
            <th className="px-3 py-2.5 min-w-[160px]">Entity</th>
            <th className="px-3 py-2.5 w-[110px]">Status</th>
            <th className="px-3 py-2.5 w-[130px] text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const depth = depthOf(a, accountById);
            const expandable = hasChildren(a.id, allAccounts);
            const open = expandedIds.has(a.id);
            const isHeader = a.isPostable === false;
            const groupLabel = groups.find((g) => g.code === a.groupCode)?.label ?? a.groupCode;
            const entityLabel = a.entityId
              ? (entities.find((e) => e.id === a.entityId)?.name ?? "—")
              : "All entities";

            return (
              <tr
                key={a.id}
                className="border-b border-border/60 hover:bg-accent/40 cursor-pointer transition-colors"
                onClick={() => onRowClick(a)}
              >
                <td className="px-3 py-2 font-mono text-[12.5px] tabular-nums">{a.code}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: depth * 18 }}>
                    {expandable ? (
                      <button
                        type="button"
                        className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground"
                        aria-label={open ? "Collapse" : "Expand"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExpanded(a.id);
                        }}
                      >
                        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" />
                    )}
                    <span className={cn("truncate", isHeader ? "font-semibold" : "font-medium")}>
                      {a.name?.trim() || "—"}
                    </span>
                    {isHeader && (
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border">
                        Header
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <CoaConceptTooltip kind="group" code={a.groupCode} label={groupLabel} inGrid />
                </td>
                <td className="px-3 py-2">{a.currency}</td>
                <td className="px-3 py-2 truncate max-w-[200px]">{entityLabel}</td>
                <td className="px-3 py-2">
                  <AccountStatusBadge status={a.status} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCurrency(a.currentBalance, a.currency as "CAD" | "USD" | "INR")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
