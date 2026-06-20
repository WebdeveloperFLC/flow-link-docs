import BillingStageBadge from "@/components/invoices/BillingStageBadge";
import type { BillingStage } from "@/lib/serviceBilling";

function fmt(amount: number | null | undefined, currency: string) {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

interface Props {
  currency: string;
  requested: number | null;
  invoiced: number;
  collected: number;
  remainingBillable: number | null;
  outstandingAr: number;
  billingStage?: BillingStage | null;
  institutionRequiredDeposit?: number | null;
  afterSaveRemaining?: number | null;
}

export default function ServiceBillingMetricsBar({
  currency,
  requested,
  invoiced,
  collected,
  remainingBillable,
  outstandingAr,
  billingStage,
  institutionRequiredDeposit,
  afterSaveRemaining,
}: Props) {
  const metrics = [
    { label: "Requested", value: fmt(requested, currency) },
    { label: "Invoiced", value: fmt(invoiced, currency) },
    { label: "Collected", value: fmt(collected, currency) },
    { label: "Remaining billable", value: fmt(remainingBillable, currency) },
    { label: "Outstanding AR", value: fmt(outstandingAr, currency) },
  ];

  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2 space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-sm">Billing summary</span>
        {billingStage && <BillingStageBadge stage={billingStage} />}
        {institutionRequiredDeposit != null && institutionRequiredDeposit > 0 && (
          <span className="text-muted-foreground">
            Institution deposit: {fmt(institutionRequiredDeposit, currency)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-muted-foreground">{m.label}</div>
            <div className="font-semibold tabular-nums">{m.value}</div>
          </div>
        ))}
      </div>
      {afterSaveRemaining != null && requested != null && (
        <div className="text-muted-foreground border-t pt-1">
          After this invoice: remaining billable {fmt(afterSaveRemaining, currency)}
        </div>
      )}
    </div>
  );
}
