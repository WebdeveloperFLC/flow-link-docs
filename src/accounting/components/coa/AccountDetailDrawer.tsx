import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Plus, Trash2, ExternalLink } from "lucide-react";
import { CoaAccount } from "../../types/coa";
import { canDeleteAccount } from "../../stores/coaStore";
import { useGroups, useTypes } from "../../stores/coaMasterStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { MOCK_JOURNALS } from "../../data/mockJournals";
import { formatCurrency } from "../../lib/format";
import AccountStatusBadge from "./AccountStatusBadge";

interface Props {
  account: CoaAccount | null;
  onOpenChange: (v: boolean) => void;
  onEdit: (a: CoaAccount) => void;
  onAddChild: (a: CoaAccount) => void;
  onDelete: (a: CoaAccount) => void;
}

export default function AccountDetailDrawer({ account, onOpenChange, onEdit, onAddChild, onDelete }: Props) {
  const groups = useGroups();
  const types = useTypes();
  const entities = useScopedEntities();

  const lines = useMemo(() => {
    if (!account) return [];
    const out: { entryNumber: string; date: string; description: string; debit: number; credit: number; currency: string }[] = [];
    for (const j of MOCK_JOURNALS) {
      for (const l of j.lines) {
        if (l.accountCode === account.code) {
          out.push({
            entryNumber: j.entryNumber,
            date: j.entryDate,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
            currency: j.currency,
          });
        }
      }
    }
    return out.slice(0, 8);
  }, [account]);

  if (!account) return null;

  const group = groups.find((g) => g.code === account.groupCode);
  const type = types.find((t) => t.code === account.typeCode);
  const entity = entities.find((e) => e.id === account.entityId);
  const deleteCheck = canDeleteAccount(account.id);

  // Mock monthly movement = sum of debits - credits in seeded journals for this account
  const movement = lines.reduce((s, l) => s + l.debit - l.credit, 0);
  const currency = (account.currency as "CAD" | "USD" | "INR");

  return (
    <Sheet open={!!account} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate">{account.code} · {account.name}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2 mt-1">
                <span>{group?.label}</span>
                <span>·</span>
                <span>{type?.label}</span>
                <span>·</span>
                <AccountStatusBadge status={account.status} />
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Current balance</div>
              <div className="text-xl font-bold mt-1 tabular-nums">{formatCurrency(account.currentBalance, currency)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Opening balance</div>
              <div className="text-xl font-bold mt-1 tabular-nums">{formatCurrency(account.openingBalance, currency)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Monthly movement</div>
              <div className="text-xl font-bold mt-1 tabular-nums">{formatCurrency(movement, currency)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Linked transactions</div>
              <div className="text-xl font-bold mt-1 tabular-nums">{account.txnCount}</div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Account info</div>
            <dl className="grid grid-cols-2 gap-y-2 text-[13px]">
              <dt className="text-muted-foreground">Currency</dt><dd>{account.currency}</dd>
              <dt className="text-muted-foreground">Entity scope</dt><dd>{entity?.name ?? "All entities"}</dd>
              <dt className="text-muted-foreground">Tax mapping</dt><dd>{account.taxCode || "—"}</dd>
              <dt className="text-muted-foreground">Reconciliation</dt><dd className="text-foreground">Up to date</dd>
            </dl>
            {account.description && (
              <p className="text-[12px] text-muted-foreground mt-3 border-t pt-3">{account.description}</p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Recent transactions</div>
              <Button asChild size="sm" variant="ghost" className="h-7">
                <Link to="/accounting/journals">View all <ExternalLink className="size-3 ml-1" /></Link>
              </Button>
            </div>
            {lines.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No journal entries reference this account yet.</p>
            ) : (
              <div className="text-[12px]">
                <div className="grid grid-cols-[100px_1fr_90px_90px] gap-2 px-1 py-1 text-muted-foreground font-medium border-b">
                  <span>Entry</span><span>Description</span><span className="text-right">Debit</span><span className="text-right">Credit</span>
                </div>
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[100px_1fr_90px_90px] gap-2 px-1 py-1.5 border-b last:border-b-0 items-center">
                    <span className="font-mono text-foreground">{l.entryNumber}</span>
                    <span className="truncate text-muted-foreground">{l.description}</span>
                    <span className="text-right tabular-nums">{l.debit ? formatCurrency(l.debit, l.currency as "CAD" | "USD" | "INR") : "—"}</span>
                    <span className="text-right tabular-nums">{l.credit ? formatCurrency(l.credit, l.currency as "CAD" | "USD" | "INR") : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Linked reports</div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="h-7"><Link to="/accounting/reports/trial-balance">Trial balance</Link></Button>
              <Button asChild size="sm" variant="outline" className="h-7"><Link to="/accounting/reports/pl">Profit & loss</Link></Button>
              <Button asChild size="sm" variant="outline" className="h-7"><Link to="/accounting/reports/balance-sheet">Balance sheet</Link></Button>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={() => onEdit(account)} variant="outline" size="sm">
              <Pencil className="size-3.5 mr-1.5" /> Edit
            </Button>
            <Button onClick={() => onAddChild(account)} variant="outline" size="sm">
              <Plus className="size-3.5 mr-1.5" /> Add child
            </Button>
            <Button
              onClick={() => onDelete(account)}
              variant="outline"
              size="sm"
              disabled={!deleteCheck.canDelete}
              title={deleteCheck.reason}
              className="text-destructive hover:text-destructive disabled:text-muted-foreground"
            >
              <Trash2 className="size-3.5 mr-1.5" /> Delete
            </Button>
            {!deleteCheck.canDelete && (
              <span className="text-[11px] text-muted-foreground">{deleteCheck.reason}</span>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}