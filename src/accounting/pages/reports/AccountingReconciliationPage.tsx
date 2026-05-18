import { useEffect, useMemo, useState } from "react";
import Decimal from "decimal.js";
import { CheckCircle2, AlertTriangle, Scale } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { useAccounts } from "../../stores/coaStore";
import { useGroups } from "../../stores/coaMasterStore";
import { useJournals } from "../../stores/journalsStore";
import { formatCurrency } from "../../lib/format";

const todayStr = () => new Date().toISOString().slice(0, 10);
const TOL = 0.005;

interface Totals {
  tbDr: Decimal;
  tbCr: Decimal;
  assets: Decimal;
  liabilities: Decimal;
  equity: Decimal;
  revenue: Decimal;
  expenses: Decimal;
}

function compute(
  asOf: string,
  accounts: ReturnType<typeof useAccounts>,
  groups: ReturnType<typeof useGroups>,
  journals: ReturnType<typeof useJournals>,
): Totals {
  const groupBy = new Map(groups.map((g) => [g.code, g]));
  const t: Totals = {
    tbDr: new Decimal(0), tbCr: new Decimal(0),
    assets: new Decimal(0), liabilities: new Decimal(0), equity: new Decimal(0),
    revenue: new Decimal(0), expenses: new Decimal(0),
  };

  for (const a of accounts) {
    const g = groupBy.get(a.groupCode);
    const nature: "DEBIT" | "CREDIT" = g?.nature ?? "DEBIT";
    let dr = new Decimal(0), cr = new Decimal(0);
    for (const j of journals) {
      if (j.status !== "POSTED") continue;
      if (j.entryDate > asOf) continue;
      for (const l of j.lines) {
        if (l.accountId !== a.id) continue;
        dr = dr.plus(l.debit || 0);
        cr = cr.plus(l.credit || 0);
      }
    }
    const opening = new Decimal(a.openingBalance || 0);
    const closing = nature === "DEBIT" ? opening.plus(dr).minus(cr) : opening.plus(cr).minus(dr);

    // Trial balance columns (same convention as TB page)
    const abs = closing.abs();
    if (!closing.eq(0)) {
      const isNeg = closing.lt(0);
      const showOn = isNeg
        ? (nature === "DEBIT" ? "CR" : "DR")
        : (nature === "DEBIT" ? "DR" : "CR");
      if (showOn === "DR") t.tbDr = t.tbDr.plus(abs);
      else t.tbCr = t.tbCr.plus(abs);
    }

    switch (a.groupCode) {
      case "ASSET": t.assets = t.assets.plus(closing); break;
      case "LIABILITY": t.liabilities = t.liabilities.plus(closing); break;
      case "EQUITY": t.equity = t.equity.plus(closing); break;
      case "REVENUE":
      case "OTHER_INCOME": t.revenue = t.revenue.plus(closing); break;
      case "EXPENSE":
      case "COGS":
      case "OTHER_EXPENSE": t.expenses = t.expenses.plus(closing); break;
    }
  }
  return t;
}

interface CheckRow {
  key: string;
  label: string;
  lhs: { label: string; value: Decimal };
  rhs: { label: string; value: Decimal };
  hint: string;
}

export default function AccountingReconciliationPage() {
  const accounts = useAccounts();
  const groups = useGroups();
  const journals = useJournals();

  const [asOf, setAsOf] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 300); return () => clearTimeout(t); }, []);

  const totals = useMemo(
    () => compute(asOf, accounts, groups, journals),
    [asOf, accounts, groups, journals],
  );

  const netIncome = totals.revenue.minus(totals.expenses); // signed (revenue positive, expense positive)
  const equityPlusNI = totals.equity.plus(netIncome);
  const liabPlusEquityNI = totals.liabilities.plus(equityPlusNI);

  const checks: CheckRow[] = [
    {
      key: "tb",
      label: "Trial Balance — Debits = Credits",
      lhs: { label: "Total Debits", value: totals.tbDr },
      rhs: { label: "Total Credits", value: totals.tbCr },
      hint: "Every posted journal should balance. A mismatch means a draft journal slipped through or data was edited outside the app.",
    },
    {
      key: "bs",
      label: "Balance Sheet — Assets = Liabilities + Equity + Net Income",
      lhs: { label: "Assets", value: totals.assets },
      rhs: { label: "Liabilities + Equity + Net Income", value: liabPlusEquityNI },
      hint: "The accounting equation must hold as of the selected date. P&L net income is added because it has not yet been closed to retained earnings.",
    },
    {
      key: "pl_tb",
      label: "P&L ties to Trial Balance — Revenue − Expenses = Net Income",
      lhs: { label: "Revenue − Expenses", value: netIncome },
      rhs: { label: "Implied Net Income (Assets − Liabilities − Equity)", value: totals.assets.minus(totals.liabilities).minus(totals.equity) },
      hint: "P&L net income computed from revenue/expense accounts should equal the residual on the balance sheet derived from the same trial balance.",
    },
  ];

  const allMatched = checks.every((c) => c.lhs.value.minus(c.rhs.value).abs().lt(TOL));
  const noJournals = journals.filter((j) => j.status === "POSTED").length === 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <AccountingPageHeader
          title="Report reconciliation"
          subtitle="Cross-check Balance Sheet, Profit & Loss, and Trial Balance totals"
        />

        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <Label className="text-xs">As of</Label>
            <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-9 w-44" />
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-96 rounded-lg" />
        ) : (
          <>
            <div
              className={cn(
                "rounded-lg border p-4 mb-6 flex items-start gap-3",
                noJournals
                  ? "bg-muted text-muted-foreground"
                  : allMatched
                    ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive",
              )}
            >
              {noJournals ? (
                <Scale className="size-5 mt-0.5 shrink-0" />
              ) : allMatched ? (
                <CheckCircle2 className="size-5 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-5 mt-0.5 shrink-0" />
              )}
              <div className="text-sm">
                <div className="font-semibold">
                  {noJournals
                    ? "No posted journals yet"
                    : allMatched
                      ? "All reports reconcile"
                      : "Mismatches detected"}
                </div>
                <div className="opacity-90">
                  {noJournals
                    ? "Post journal entries to see reconciliation checks."
                    : allMatched
                      ? `Balance Sheet, Profit & Loss, and Trial Balance agree as of ${asOf}.`
                      : "One or more accounting identities do not hold. Review the rows below and the underlying journals."}
                </div>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left px-3 py-2">Check</th>
                    <th className="text-right px-3 py-2 w-44">Left</th>
                    <th className="text-right px-3 py-2 w-44">Right</th>
                    <th className="text-right px-3 py-2 w-40">Difference</th>
                    <th className="text-center px-3 py-2 w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((c) => {
                    const diff = c.lhs.value.minus(c.rhs.value);
                    const ok = diff.abs().lt(TOL);
                    return (
                      <tr key={c.key} className="border-b last:border-b-0 align-top">
                        <td className="px-3 py-3">
                          <div className="font-medium text-foreground">{c.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{c.hint}</div>
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            {c.lhs.label} vs {c.rhs.label}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">{formatCurrency(c.lhs.value.toNumber())}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">{formatCurrency(c.rhs.value.toNumber())}</td>
                        <td className={cn(
                          "px-3 py-3 text-right font-mono tabular-nums",
                          ok ? "text-muted-foreground" : "text-destructive font-semibold",
                        )}>
                          {formatCurrency(diff.toNumber())}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {ok ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                              <CheckCircle2 className="size-3.5" /> Match
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                              <AlertTriangle className="size-3.5" /> Mismatch
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <Tile label="Assets" value={totals.assets.toNumber()} />
              <Tile label="Liabilities" value={totals.liabilities.toNumber()} />
              <Tile label="Equity" value={totals.equity.toNumber()} />
              <Tile label="Net Income" value={netIncome.toNumber()} />
              <Tile label="Revenue" value={totals.revenue.toNumber()} />
              <Tile label="Expenses" value={totals.expenses.toNumber()} />
              <Tile label="TB Debits" value={totals.tbDr.toNumber()} />
              <Tile label="TB Credits" value={totals.tbCr.toNumber()} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold font-mono tabular-nums mt-0.5">{formatCurrency(value)}</div>
    </div>
  );
}