import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import { fmtMoney } from "../../components/ap-ar/money";
import {
  getPayrollBatch,
  getPayrollComponents,
  usePayrollBatches,
  accruePayrollBatch,
  payPayrollBatch,
} from "../../stores/payrollStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { entityDisplayName } from "../../lib/entityResolve";

export default function AccountingPayrollDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  usePayrollBatches();
  const entities = useScopedEntities();
  const batch = id ? getPayrollBatch(id) : undefined;
  const components = id ? getPayrollComponents(id) : [];
  const [busy, setBusy] = useState(false);

  const drTotal = useMemo(() => components.filter((c) => c.drCr === "DR").reduce((s, c) => s + c.amount, 0), [components]);
  const crTotal = useMemo(() => components.filter((c) => c.drCr === "CR").reduce((s, c) => s + c.amount, 0), [components]);

  if (!batch) {
    return (
      <AppLayout>
        <div className="p-6">
          <AccountingEmptyState
            title="Payroll batch not found"
            description="It may have been removed."
            action={<Button onClick={() => navigate("/accounting/payroll")}>Back</Button>}
          />
        </div>
      </AppLayout>
    );
  }

  const onAccrue = async () => {
    setBusy(true);
    try {
      await accruePayrollBatch(batch.id);
      toast.success("Accrual journal posted.");
    } catch (e: any) {
      toast.error(e?.message ?? "Accrual failed.");
    } finally {
      setBusy(false);
    }
  };

  const onPay = async () => {
    setBusy(true);
    try {
      await payPayrollBatch(batch.id);
      toast.success("Payment journal posted.");
    } catch (e: any) {
      toast.error(e?.message ?? "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-[900px] mx-auto space-y-4">
        <AccountingPageHeader
          title={batch.periodLabel}
          subtitle={`Payroll · ${entityDisplayName(batch.entityId, entities)} · ${batch.country}`}
          actions={
            <>
              <AccountingStatusBadge status={batch.status} />
              <Button variant="outline" onClick={() => navigate("/accounting/payroll")}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Button>
              {batch.status === "DRAFT" && (
                <Button disabled={busy || !components.length} onClick={() => void onAccrue()}>
                  Post accrual
                </Button>
              )}
              {batch.status === "ACCRUED" && (
                <Button disabled={busy} onClick={() => void onPay()}>
                  Pay net {fmtMoney(batch.netTotal, batch.currency)}
                </Button>
              )}
            </>
          }
        />

        <Card className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Gross</div>
            <div className="font-semibold tabular-nums">{fmtMoney(batch.grossTotal, batch.currency)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Deductions</div>
            <div className="font-semibold tabular-nums">{fmtMoney(batch.deductionsTotal, batch.currency)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Employer cost</div>
            <div className="font-semibold tabular-nums">{fmtMoney(batch.employerCostTotal, batch.currency)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Net payable</div>
            <div className="font-semibold tabular-nums">{fmtMoney(batch.netTotal, batch.currency)}</div>
          </div>
        </Card>

        {(batch.accrualJournalId || batch.paymentJournalId) && (
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Linked journals</div>
            <div className="flex flex-wrap gap-2">
              {batch.accrualJournalId && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/accounting/journals/${batch.accrualJournalId}`}>Accrual journal</Link>
                </Button>
              )}
              {batch.paymentJournalId && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/accounting/journals/${batch.paymentJournalId}`}>Payment journal</Link>
                </Button>
              )}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="text-sm font-medium mb-3">Accrual posting components</div>
          {components.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posting components defined for this batch.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">Role</th>
                      <th className="text-left px-3 py-2">DR / CR</th>
                      <th className="text-right px-3 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-3 py-2">{c.label || c.roleKey}</td>
                        <td className="px-3 py-2">{c.drCr}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(c.amount, batch.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                DR total {fmtMoney(drTotal, batch.currency)} · CR total {fmtMoney(crTotal, batch.currency)}
                {Math.abs(drTotal - crTotal) > 0.01 && (
                  <span className="text-destructive ml-2">Unbalanced — fix components before accruing.</span>
                )}
              </p>
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
