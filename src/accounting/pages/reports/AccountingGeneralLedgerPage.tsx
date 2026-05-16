import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Decimal from "decimal.js";
import { Printer, Download, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import { useAccounts } from "../../stores/coaStore";
import { useGroups } from "../../stores/coaMasterStore";
import { useJournals } from "../../stores/journalsStore";
import { useEntities } from "../../stores/accountingEntitiesStore";
import { formatCurrency } from "../../lib/format";
import type { CoaAccount } from "../../types/coa";
import type { Journal } from "../../data/mockJournals";

const ALL = "__all__";

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr(): string { return new Date().toISOString().slice(0, 10); }

interface Txn {
  date: string;
  journalId: string;
  journalNumber: string;
  narration: string;
  reference: string;
  entity: string;
  debit: number;
  credit: number;
  balance: number;
}

function buildLedger(
  account: CoaAccount,
  nature: "DEBIT" | "CREDIT",
  journals: Journal[],
  from: string,
  to: string,
  entityFilter: string,
  statusFilter: "POSTED" | "ALL",
  search: string,
  entityNameById: Map<string, string>,
): { txns: Txn[]; opening: number; periodDr: number; periodCr: number; closing: number } {
  const opening = new Decimal(account.openingBalance || 0);
  const entityName = entityFilter === ALL ? null
    : entityFilter === "__none__" ? "__none__"
    : entityNameById.get(entityFilter) ?? "";
  const q = search.trim().toLowerCase();

  const items: { date: string; journal: Journal; debit: number; credit: number }[] = [];
  journals.forEach((j) => {
    if (statusFilter === "POSTED" && j.status !== "POSTED") return;
    if (statusFilter === "ALL" && j.status === "VOIDED") return;
    if (j.entryDate < from || j.entryDate > to) return;
    if (entityName !== null) {
      if (entityName === "__none__") { /* no-op: journals are not null entity */ }
      else if (j.entity !== entityName) return;
    }
    if (q && !`${j.narration} ${j.reference}`.toLowerCase().includes(q)) return;
    j.lines.forEach((l) => {
      if (l.accountId !== account.id) return;
      items.push({ date: j.entryDate, journal: j, debit: l.debit || 0, credit: l.credit || 0 });
    });
  });
  items.sort((a, b) => a.date.localeCompare(b.date) || a.journal.entryNumber.localeCompare(b.journal.entryNumber));

  let running = opening;
  let periodDr = new Decimal(0);
  let periodCr = new Decimal(0);
  const txns: Txn[] = items.map((it) => {
    periodDr = periodDr.plus(it.debit);
    periodCr = periodCr.plus(it.credit);
    running = nature === "DEBIT"
      ? running.plus(it.debit).minus(it.credit)
      : running.plus(it.credit).minus(it.debit);
    return {
      date: it.date,
      journalId: it.journal.id,
      journalNumber: it.journal.entryNumber,
      narration: it.journal.narration,
      reference: it.journal.reference,
      entity: it.journal.entity,
      debit: it.debit,
      credit: it.credit,
      balance: running.toNumber(),
    };
  });

  return {
    txns,
    opening: opening.toNumber(),
    periodDr: periodDr.toNumber(),
    periodCr: periodCr.toNumber(),
    closing: running.toNumber(),
  };
}

function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" });
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

export default function AccountingGeneralLedgerPage() {
  const { accountId } = useParams<{ accountId?: string }>();
  const navigate = useNavigate();
  const accounts = useAccounts();
  const groups = useGroups();
  const journals = useJournals();
  const entities = useEntities();

  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const [selectedAccount, setSelectedAccount] = useState<string>(accountId ?? ALL);
  useEffect(() => { if (accountId) setSelectedAccount(accountId); }, [accountId]);

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [entityFilter, setEntityFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState<"POSTED" | "ALL">("POSTED");
  const [search, setSearch] = useState("");

  const groupBy = useMemo(() => new Map(groups.map((g) => [g.code, g])), [groups]);
  const entityNameById = useMemo(() => new Map(entities.map((e) => [e.id, e.name])), [entities]);

  const targetAccounts = useMemo(() => {
    if (selectedAccount !== ALL) {
      const a = accounts.find((x) => x.id === selectedAccount);
      return a ? [a] : [];
    }
    return accounts;
  }, [accounts, selectedAccount]);

  const ledgers = useMemo(() => targetAccounts.map((a) => {
    const nature: "DEBIT" | "CREDIT" = groupBy.get(a.groupCode)?.nature ?? "DEBIT";
    return {
      account: a,
      groupLabel: groupBy.get(a.groupCode)?.label ?? a.groupCode,
      nature,
      ...buildLedger(a, nature, journals, from, to, entityFilter, statusFilter, search, entityNameById),
    };
  }), [targetAccounts, groupBy, journals, from, to, entityFilter, statusFilter, search, entityNameById]);

  const noPostedJournals = journals.filter((j) => j.status === "POSTED").length === 0;

  const onPrint = () => window.print();

  const onExport = () => {
    const header = ["Date", "Journal #", "Narration", "Reference", "Entity", "Account Code", "Account Name", "Debit", "Credit", "Balance"];
    const body: string[][] = [];
    ledgers.forEach((l) => {
      l.txns.forEach((t) => {
        body.push([
          t.date, t.journalNumber, t.narration, t.reference, t.entity,
          l.account.code, l.account.name,
          t.debit ? t.debit.toFixed(2) : "",
          t.credit ? t.credit.toFixed(2) : "",
          t.balance.toFixed(2),
        ]);
      });
    });
    downloadCsv(`general-ledger-${from}-to-${to}.csv`, [header, ...body]);
    toast.success("General ledger exported");
  };

  const selected = ledgers.length === 1 && selectedAccount !== ALL ? ledgers[0] : null;

  return (
    <AppLayout>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 15mm; }
          .no-print { display: none !important; }
          .gl-account-section { page-break-after: always; }
          body { background: white; }
        }
      `}</style>

      <div className="p-6 md:p-8 max-w-7xl mx-auto pb-24">
        <div className="no-print">
          <AccountingPageHeader
            title="General ledger"
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

        <div className="no-print flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <Label className="text-xs">Account</Label>
            <Select value={selectedAccount} onValueChange={(v) => {
              setSelectedAccount(v);
              if (v === ALL) navigate("/accounting/reports/general-ledger");
              else navigate(`/accounting/reports/general-ledger/${v}`);
            }}>
              <SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value={ALL}>All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="font-mono text-xs mr-2">{a.code}</span>{a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
          </div>
          <div>
            <Label className="text-xs">Entity</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "POSTED" | "ALL")}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="POSTED">Posted only</SelectItem>
                <SelectItem value="ALL">Draft included</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Narration / reference" className="h-9 w-56" />
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-96 rounded-lg" />
        ) : noPostedJournals ? (
          <AccountingEmptyState
            icon={BookOpen}
            title="No posted journal entries found"
            description="Post journal entries to see balances here."
          />
        ) : ledgers.length === 0 ? (
          <AccountingEmptyState
            icon={BookOpen}
            title="No accounts found"
            description="Adjust the filters to see ledger activity."
          />
        ) : (
          <div className="space-y-6">
            {ledgers.map((l) => (
              <AccountSection
                key={l.account.id}
                ledger={l}
                from={from}
                to={to}
                defaultOpen={selectedAccount !== ALL}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="no-print fixed bottom-0 left-0 right-0 bg-background border-t px-6 py-3 z-10">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="text-muted-foreground">Opening: <span className="font-mono font-medium text-foreground">{formatCurrency(selected.opening)}</span></div>
            <div className="text-muted-foreground">Total DR: <span className="font-mono font-medium text-foreground">{formatCurrency(selected.periodDr)}</span></div>
            <div className="text-muted-foreground">Total CR: <span className="font-mono font-medium text-foreground">{formatCurrency(selected.periodCr)}</span></div>
            <div className="text-muted-foreground">Closing: <span className={cn("font-mono font-bold text-base", selected.closing >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(selected.closing)}</span></div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function AccountSection({
  ledger, from, to, defaultOpen,
}: {
  ledger: {
    account: CoaAccount; groupLabel: string; nature: "DEBIT" | "CREDIT";
    txns: Txn[]; opening: number; periodDr: number; periodCr: number; closing: number;
  };
  from: string; to: string; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { account, groupLabel, txns, opening, periodDr, periodCr, closing } = ledger;
  const movement = periodDr - periodCr;

  return (
    <div className="gl-account-section rounded-lg border overflow-hidden">
      <div className="hidden print:block px-4 py-3 border-b">
        <div className="font-semibold">Future Link Consultants — General Ledger</div>
        <div className="text-sm">{account.code} · {account.name}</div>
        <div className="text-xs text-muted-foreground">Period: {from} to {to}</div>
      </div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <div className="bg-muted/50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/70 transition">
            <div className="flex items-center gap-3 min-w-0">
              <ChevronDown className={cn("size-4 shrink-0 transition", !open && "-rotate-90")} />
              <span className="font-mono text-xs text-muted-foreground">{account.code}</span>
              <span className="font-medium truncate">{account.name}</span>
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted border">{groupLabel}</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-xs font-mono">
              <div className="text-muted-foreground">Opening: <span className="text-foreground">{formatCurrency(opening)}</span></div>
              <div className="text-muted-foreground">Movement: <span className="text-foreground">{formatCurrency(movement)}</span></div>
              <div className="text-muted-foreground">Closing: <span className="text-foreground font-semibold">{formatCurrency(closing)}</span></div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {txns.length === 0 ? (
            <div className="p-6">
              <AccountingEmptyState
                icon={BookOpen}
                title="No transactions"
                description="No transactions posted to this account in the selected period."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-xs uppercase tracking-wide text-muted-foreground border-b">
                    <th className="text-left px-3 py-2 w-28">Date</th>
                    <th className="text-left px-3 py-2 w-32">Journal #</th>
                    <th className="text-left px-3 py-2">Narration</th>
                    <th className="text-left px-3 py-2 w-28">Entity</th>
                    <th className="text-right px-3 py-2 w-28">Debit</th>
                    <th className="text-right px-3 py-2 w-28">Credit</th>
                    <th className="text-right px-3 py-2 w-32">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-muted/20 italic text-muted-foreground">
                    <td className="px-3 py-2">{fmtDate(from)}</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">Opening balance</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(opening)}</td>
                  </tr>
                  {txns.map((t, i) => (
                    <tr key={`${t.journalId}-${i}`} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-3 py-2">{fmtDate(t.date)}</td>
                      <td className="px-3 py-2">
                        <Link to={`/accounting/journals/${t.journalId}`} className="font-mono text-sm text-primary hover:underline">
                          {t.journalNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm">{t.narration}</div>
                        {t.reference && <div className="text-xs text-muted-foreground">{t.reference}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{t.entity}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{t.debit ? formatCurrency(t.debit) : "—"}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{t.credit ? formatCurrency(t.credit) : "—"}</td>
                      <td className={cn("px-3 py-2 text-right font-mono tabular-nums font-medium",
                        t.balance >= 0 ? "text-primary" : "text-destructive")}>
                        {formatCurrency(t.balance)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-medium border-t">
                    <td className="px-3 py-2" colSpan={3}>Period total</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(periodDr)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(periodCr)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-bold">{formatCurrency(closing)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}