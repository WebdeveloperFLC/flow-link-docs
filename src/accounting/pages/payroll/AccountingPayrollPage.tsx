import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Wallet, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import { fmtMoney } from "../../components/ap-ar/money";
import {
  usePayrollBatches,
  accruePayrollBatch,
  payPayrollBatch,
  refreshPayroll,
} from "../../stores/payrollStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { entityDisplayName } from "../../lib/entityResolve";

export default function AccountingPayrollPage() {
  const navigate = useNavigate();
  const batches = usePayrollBatches();
  const entities = useScopedEntities();
  const [busyId, setBusyId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const draft = batches.filter((b) => b.status === "DRAFT");
    const accrued = batches.filter((b) => b.status === "ACCRUED");
    const paid = batches.filter((b) => b.status === "PAID");
    return { draft: draft.length, accrued: accrued.length, paid: paid.length };
  }, [batches]);

  const onAccrue = async (id: string) => {
    setBusyId(id);
    try {
      await accruePayrollBatch(id);
      toast.success("Payroll accrual journal posted.");
    } catch (e: any) {
      toast.error(e?.message ?? "Accrual failed.");
    } finally {
      setBusyId(null);
    }
  };

  const onPay = async (id: string) => {
    setBusyId(id);
    try {
      await payPayrollBatch(id);
      toast.success("Payroll payment journal posted.");
    } catch (e: any) {
      toast.error(e?.message ?? "Payment failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-[1200px] mx-auto">
        <AccountingPageHeader
          title="Payroll accounting"
          subtitle="Accrue salary expenses and pay net payroll through the journal engine"
          actions={
            <Button variant="outline" onClick={() => void refreshPayroll()}>
              <RefreshCw className="size-4 mr-1" /> Refresh
            </Button>
          }
        />

        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Draft batches</div>
            <div className="text-2xl font-semibold">{totals.draft}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Accrued (awaiting payment)</div>
            <div className="text-2xl font-semibold">{totals.accrued}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="text-2xl font-semibold">{totals.paid}</div>
          </Card>
        </div>

        <Card className="p-4 mt-4">
          {batches.length === 0 ? (
            <AccountingEmptyState
              icon={Wallet}
              title="No payroll batches"
              description="Payroll batches appear here when HR payouts are bridged into accounting, or when batches are created in the database."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Period</th>
                    <th className="text-left px-3 py-2">Entity</th>
                    <th className="text-left px-3 py-2">Country</th>
                    <th className="text-right px-3 py-2">Gross</th>
                    <th className="text-right px-3 py-2">Net</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{b.periodLabel}</td>
                      <td className="px-3 py-2 text-muted-foreground">{entityDisplayName(b.entityId, entities)}</td>
                      <td className="px-3 py-2">{b.country}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(b.grossTotal, b.currency)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(b.netTotal, b.currency)}</td>
                      <td className="px-3 py-2"><AccountingStatusBadge status={b.status} /></td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/accounting/payroll/${b.id}`)}>
                          <ArrowRight className="size-3.5" />
                        </Button>
                        {b.status === "DRAFT" && (
                          <Button size="sm" variant="outline" disabled={busyId === b.id} onClick={() => void onAccrue(b.id)}>
                            Accrue
                          </Button>
                        )}
                        {b.status === "ACCRUED" && (
                          <Button size="sm" disabled={busyId === b.id} onClick={() => void onPay(b.id)}>
                            Pay net
                          </Button>
                        )}
                        {b.status === "PAID" && (
                          <Badge variant="outline" className="text-green-700">
                            <CheckCircle2 className="size-3 mr-1 inline" /> Complete
                          </Badge>
                        )}
                      </td>
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
