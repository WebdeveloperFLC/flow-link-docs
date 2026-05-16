import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Decimal from "decimal.js";
import { Printer, Download, Scale } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import { useAccounts } from "../../stores/coaStore";
import { useGroups } from "../../stores/coaMasterStore";
import { useJournals } from "../../stores/journalsStore";
import { useEntities } from "../../stores/accountingEntitiesStore";
import { formatCurrency } from "../../lib/format";

const ALL = "__all__";
const todayStr = () => new Date().toISOString().slice(0, 10);

interface Row {
  accountId: string;
  code: string;
  name: string;
  parentId: string | null;
  entityLabel: string;
  groupCode: string;
  groupLabel: string;
  nature: "DEBIT" | "CREDIT";
  debitCol: Decimal; // positive value to display in DR column (0 if none)
  creditCol: Decimal;
  signedClosing: Decimal; // for sign awareness (negative = opposite side)
  oppositeSide: boolean;
}

function computeRows(
  asOf: string,
  accounts: ReturnType<typeof useAccounts>,
  groups: ReturnType<typeof useGroups>,
  journals: ReturnType<typeof useJournals>,
  entities: ReturnType<typeof useEntities>,
  entityFilter: string,
): Row[] {
  const groupBy = new Map(groups.map((g) => [g.code, g]));
  const entityNameById = new Map(entities.map((e) => [e.id, e.name]));

  return accounts
    .filter((a) => entityFilter === ALL
      || (entityFilter === "__none__" ? a.entityId === null : a.entityId === entityFilter))
    .map((a) => {
      const g = groupBy.get(a.groupCode);
      const nature: "DEBIT" | "CREDIT" = g?.nature ?? "DEBIT";
      let dr = new Decimal(0);
      let cr = new Decimal(0);
      journals.forEach((j) => {
        if (j.status !== "POSTED") return;
        if (j.entryDate > asOf) return;
        j.lines.forEach((l) => {
          if (l.accountId !== a.id) return;
          dr = dr.plus(new Decimal(l.debit || 0));
          cr = cr.plus(new Decimal(l.credit || 0));
        });
      });
      const opening = new Decimal(a.openingBalance || 0);
      const closing = nature === "DEBIT"
        ? opening.plus(dr).minus(cr)
        : opening.plus(cr).minus(dr);
      const isNeg = closing.lt(0);
      const abs = closing.abs();
      let debitCol = new Decimal(0);
      let creditCol = new Decimal(0);
      if (!closing.eq(0)) {
        const showOn = isNeg
          ? (nature === "DEBIT" ? "CR" : "DR")
          : (nature === "DEBIT" ? "DR" : "CR");
        if (showOn === "DR") debitCol = abs; else creditCol = abs;
      }
      return {
        accountId: a.id,
        code: a.code,
        name: a.name,
        parentId: a.parentId,
        entityLabel: a.entityId ? (entityNameById.get(a.entityId) ?? "—") : "All",
        groupCode: a.groupCode,
        groupLabel: g?.label ?? a.groupCode,
        nature,
        debitCol,
        creditCol,
        signedClosing: closing,
        oppositeSide: isNeg,
      };
    });
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AccountingTrialBalancePage() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const groups = useGroups();
  const journals = useJournals();
  const entities = useEntities();

  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const [asOf, setAsOf] = useState(todayStr());
  const [asOf2, setAsOf2] = useState(todayStr());
  const [entityFilter, setEntityFilter] = useState(ALL);
  const [groupFilter, setGroupFilter] = useState(ALL);
  const [showZero, setShowZero] = useState(false);
  const [comparative, setComparative] = useState(false);

  const rows = useMemo(
    () => computeRows(asOf, accounts, groups, journals, entities, entityFilter),
    [asOf, accounts, groups, journals, entities, entityFilter],
  );
  const rows2 = useMemo(
    () => comparative ? computeRows(asOf2, accounts, groups, journals, entities, entityFilter) : [],
    [comparative, asOf2, accounts, groups, journals, entities, entityFilter],
  );
  const rows2ById = useMemo(() => new Map(rows2.map((r) => [r.accountId, r])), [rows2]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (groupFilter !== ALL && r.groupCode !== groupFilter) return false;
    if (!showZero && r.debitCol.eq(0) && r.creditCol.eq(0)) return false;
    return true;
  }), [rows, groupFilter, showZero]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; rows: Row[]; dr: Decimal; cr: Decimal }>();
    filtered.forEach((r) => {
      const cur = map.get(r.groupCode) ?? { label: r.groupLabel, rows: [], dr: new Decimal(0), cr: new Decimal(0) };
      cur.rows.push(r);
      cur.dr = cur.dr.plus(r.debitCol);
      cur.cr = cur.cr.plus(r.creditCol);
      map.set(r.groupCode, cur);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const totals = useMemo(() => {
    const dr = filtered.reduce((s, r) => s.plus(r.debitCol), new Decimal(0));
    const cr = filtered.reduce((s, r) => s.plus(r.creditCol), new Decimal(0));
    return { dr, cr, diff: dr.minus(cr).abs(), balanced: dr.eq(cr) };
  }, [filtered]);

  const summary = useMemo(() => {
    const pick = (codes: string[]) => rows
      .filter((r) => codes.includes(r.groupCode))
      .reduce((s, r) => s.plus(r.signedClosing), new Decimal(0))
      .toNumber();
    return {
      assets: pick(["ASSET"]),
      liabilities: pick(["LIABILITY"]),
      revenue: pick(["REVENUE", "OTHER_INCOME"]),
      expenses: pick(["EXPENSE", "COGS", "OTHER_EXPENSE"]),
    };
  }, [rows]);

  const noJournals = journals.filter((j) => j.status === "POSTED").length === 0;

  const onPrint = () => window.print();

  const onExport = () => {
    const header = ["Account Code", "Account Name", "Group", "Entity", "Debit Balance", "Credit Balance"];
    const body = filtered.map((r) => [
      r.code, r.name, r.groupLabel, r.entityLabel,
      r.debitCol.eq(0) ? "" : r.debitCol.toFixed(2),
      r.creditCol.eq(0) ? "" : r.creditCol.toFixed(2),
    ]);
    body.push(["", "TOTAL", "", "", totals.dr.toFixed(2), totals.cr.toFixed(2)]);
    downloadCsv(`trial-balance-${asOf}.csv`, [header, ...body]);
    toast.success("Trial balance exported");
  };

  const Amount = ({ row, kind }: { row: Row; kind: "DR" | "CR" }) => {
    const v = kind === "DR" ? row.debitCol : row.creditCol;
    if (v.eq(0)) return <span className="text-muted-foreground">—</span>;
    const text = formatCurrency(v.toNumber());
    if (row.oppositeSide) return <span className="text-destructive">({text})</span>;
    return <span>{text}</span>;
  };

  return (
    <AppLayout>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 15mm; }
          .no-print { display: none !important; }
          #trial-balance-print { display: block !important; }
          body { background: white; }
        }
        #trial-balance-print { display: none; }
      `}</style>

      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="no-print">
          <AccountingPageHeader
            title="Trial balance"
            subtitle="Accounting · Future Link Flow"
            actions={
              <>
                <Button variant="outline" size="sm" onClick={onPrint}>
                  <Printer className="size-4 mr-1.5" /> Print
                </Button>
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="size-4 mr-1.5" /> Export CSV
                </Button>
              </>
            }
          />
        </div>

        <div id="trial-balance-print" className="mb-4">
          <div className="text-lg font-semibold">Future Link Consultants</div>
          <div className="text-sm">Trial Balance</div>
          <div className="text-xs text-muted-foreground">As of {asOf} · Generated {todayStr()}</div>
        </div>

        <div className="no-print flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <Label className="text-xs">As of</Label>
            <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-9 w-40" />
          </div>
          <div>
            <Label className="text-xs">Entity</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                <SelectItem value="__none__">All-entity accounts</SelectItem>
                {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Group</Label>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All groups</SelectItem>
                {groups.map((g) => <SelectItem key={g.code} value={g.code}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 h-9">
            <Switch checked={showZero} onCheckedChange={setShowZero} id="tb-zero" />
            <Label htmlFor="tb-zero" className="text-xs">Show zero balances</Label>
          </div>
          <div className="flex items-center gap-2 h-9">
            <Switch checked={comparative} onCheckedChange={setComparative} id="tb-comp" />
            <Label htmlFor="tb-comp" className="text-xs">Comparative</Label>
          </div>
          {comparative && (
            <div>
              <Label className="text-xs">Compare to</Label>
              <Input type="date" value={asOf2} onChange={(e) => setAsOf2(e.target.value)} className="h-9 w-40" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 no-print">
          <AccountingKPICard label="Total Assets" value={summary.assets} icon={Scale} />
          <AccountingKPICard label="Total Liabilities" value={summary.liabilities} icon={Scale} />
          <AccountingKPICard label="Total Revenue" value={summary.revenue} icon={Scale} />
          <AccountingKPICard label="Total Expenses" value={summary.expenses} icon={Scale} />
        </div>

        {loading ? (
          <Skeleton className="h-96 rounded-lg" />
        ) : noJournals ? (
          <AccountingEmptyState
            icon={Scale}
            title="No posted journal entries found"
            description="Post journal entries to see balances here."
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left px-3 py-2 w-24">Code</th>
                    <th className="text-left px-3 py-2">Account</th>
                    <th className="text-left px-3 py-2 w-28">Entity</th>
                    <th className="text-right px-3 py-2 w-36">Debit (DR)</th>
                    <th className="text-right px-3 py-2 w-36">Credit (CR)</th>
                    {comparative && (
                      <>
                        <th className="text-right px-3 py-2 w-32">DR ({asOf2})</th>
                        <th className="text-right px-3 py-2 w-32">CR ({asOf2})</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {grouped.length === 0 ? (
                    <tr><td colSpan={comparative ? 7 : 5} className="text-center text-muted-foreground py-10">No accounts match the current filters.</td></tr>
                  ) : grouped.map(([code, g]) => (
                    <GroupSection
                      key={code}
                      label={g.label}
                      rows={g.rows}
                      dr={g.dr}
                      cr={g.cr}
                      colSpan={comparative ? 7 : 5}
                      comparative={comparative}
                      rows2ById={rows2ById}
                      onRow={(id) => navigate(`/accounting/reports/general-ledger/${id}`)}
                      Amount={Amount}
                    />
                  ))}
                  <tr className="bg-muted font-semibold border-t-2 border-border">
                    <td className="px-3 py-2.5">TOTAL</td>
                    <td /><td />
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatCurrency(totals.dr.toNumber())}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatCurrency(totals.cr.toNumber())}</td>
                    {comparative && (<><td /><td /></>)}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={cn(
              "px-4 py-3 border-t text-sm",
              totals.balanced ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive",
            )}>
              {totals.balanced ? (
                <>✓ Trial balance is balanced — Total: {formatCurrency(totals.dr.toNumber())}</>
              ) : (
                <>✗ Trial balance is OUT OF BALANCE — Difference: {formatCurrency(totals.diff.toNumber())}. Check for unposted journals or data entry errors.</>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function GroupSection({
  label, rows, dr, cr, comparative, rows2ById, onRow, Amount,
}: {
  label: string; rows: Row[]; dr: Decimal; cr: Decimal;
  colSpan: number;
  comparative: boolean; rows2ById: Map<string, Row>;
  onRow: (id: string) => void;
  Amount: (p: { row: Row; kind: "DR" | "CR" }) => JSX.Element;
}) {
  return (
    <>
      <tr className="bg-muted/50 font-medium text-sm">
        <td colSpan={3} className="px-3 py-2 uppercase tracking-wide">{label}</td>
        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(dr.toNumber())}</td>
        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(cr.toNumber())}</td>
        {comparative && (<><td /><td /></>)}
      </tr>
      {rows.map((r) => {
        const r2 = rows2ById.get(r.accountId);
        return (
          <tr key={r.accountId} className="hover:bg-muted/30 cursor-pointer border-b last:border-b-0" onClick={() => onRow(r.accountId)}>
            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.code}</td>
            <td className={cn("px-3 py-2", r.parentId && "pl-6")}>{r.name}</td>
            <td className="px-3 py-2 text-xs text-muted-foreground">{r.entityLabel}</td>
            <td className="px-3 py-2 text-right font-mono tabular-nums"><Amount row={r} kind="DR" /></td>
            <td className="px-3 py-2 text-right font-mono tabular-nums"><Amount row={r} kind="CR" /></td>
            {comparative && (
              <>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                  {r2 && !r2.debitCol.eq(0) ? formatCurrency(r2.debitCol.toNumber()) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                  {r2 && !r2.creditCol.eq(0) ? formatCurrency(r2.creditCol.toNumber()) : "—"}
                </td>
              </>
            )}
          </tr>
        );
      })}
      <tr className="bg-muted/20 font-medium text-xs">
        <td colSpan={3} className="px-3 py-1.5 text-muted-foreground">Total {label}</td>
        <td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCurrency(dr.toNumber())}</td>
        <td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCurrency(cr.toNumber())}</td>
        {comparative && (<><td /><td /></>)}
      </tr>
    </>
  );
}