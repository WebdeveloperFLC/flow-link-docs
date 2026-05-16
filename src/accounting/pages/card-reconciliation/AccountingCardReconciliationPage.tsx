import { useNavigate } from "react-router-dom";
import { Upload, CreditCard } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AccountingPageHeader from "@/accounting/components/shared/AccountingPageHeader";
import AccountingEmptyState from "@/accounting/components/shared/AccountingEmptyState";
import AccountingKPICard from "@/accounting/components/shared/AccountingKPICard";
import AccountingStatusBadge from "@/accounting/components/shared/AccountingStatusBadge";
import { useCardReconciliations } from "@/accounting/stores/cardReconciliationStore";
import { formatCurrency } from "@/accounting/lib/format";

export default function AccountingCardReconciliationPage() {
  const navigate = useNavigate();
  const recs = useCardReconciliations();

  const year = new Date().getFullYear();
  const ytd = recs.filter((r) => r.statementFrom.startsWith(String(year)));
  const uncat = recs.reduce((s, r) => s + r.totalUncategorised, 0);
  const biz = recs.reduce((s, r) => s + r.totalBusinessAmount, 0);
  const jrn = recs.filter((r) => r.generatedJournalId).length;

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <AccountingPageHeader
          title="Card reconciliation"
          subtitle="Monthly credit card statement categorisation and journal generation"
          actions={
            <Button onClick={() => navigate("/accounting/card-reconciliation/new")} className="gap-2">
              <Upload className="size-4" /> Import statement
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AccountingKPICard label="Statements this year" value={String(ytd.length)} icon={CreditCard} />
          <AccountingKPICard label="Uncategorised lines" value={String(uncat)} icon={CreditCard} />
          <AccountingKPICard label="Business expenses" value={biz} icon={CreditCard} />
          <AccountingKPICard label="Journals generated" value={String(jrn)} icon={CreditCard} />
        </div>

        <Card>
          {recs.length === 0 ? (
            <div className="p-10">
              <AccountingEmptyState
                icon={CreditCard}
                title="No card statements imported yet"
                description="Import a CSV statement from your bank to categorise and generate journal entries."
                action={<Button onClick={() => navigate("/accounting/card-reconciliation/new")} className="gap-2"><Upload className="size-4" /> Import statement</Button>}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Reconciliation #</th>
                    <th className="text-left px-4 py-3">Month</th>
                    <th className="text-left px-4 py-3">Card</th>
                    <th className="text-left px-4 py-3">Holder</th>
                    <th className="text-right px-4 py-3">Txns</th>
                    <th className="text-right px-4 py-3">Business</th>
                    <th className="text-right px-4 py-3">Personal</th>
                    <th className="text-right px-4 py-3">Uncat.</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recs.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{r.reconciliationNumber}</td>
                      <td className="px-4 py-3">{r.statementMonth}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.cardAccountName}</td>
                      <td className="px-4 py-3">{r.cardHolderName}</td>
                      <td className="px-4 py-3 text-right">{r.totalTransactions}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.totalBusinessAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(r.totalPersonalAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.totalUncategorised}</td>
                      <td className="px-4 py-3"><AccountingStatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}