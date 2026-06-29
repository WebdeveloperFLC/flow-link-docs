/**
 * CRM student financial history — uses FOE status resolver + CRM tables.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import StudentFinancialLedger from "@/accounting/components/students/StudentFinancialLedger";
import {
  accountingStatusLabel,
  businessStatusLabel,
  workflowStatusLabel,
} from "@/platform/types/statuses";
import { resolvePaymentPlatformStatuses } from "@/platform/foe/paymentStatusResolver";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  currency: string;
  amount: number;
  amount_paid: number | null;
};

type PaymentRow = {
  id: string;
  method: string;
  amount: number;
  currency: string;
  paid_at: string;
  payment_status: string | null;
};

type ReceiptRow = {
  id: string;
  receipt_number: string;
  amount: number;
  currency: string;
  generated_at: string;
  payment_id: string | null;
};

function money(n: number, c: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n);
  } catch {
    return `${c} ${n.toFixed(2)}`;
  }
}

export function ClientFinancialHistoryPanel({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, Awaited<ReturnType<typeof resolvePaymentPlatformStatuses>>>>({});

  const load = async () => {
    setLoading(true);
    const [inv, pay] = await Promise.all([
      supabase
        .from("client_invoices")
        .select("id,invoice_number,status,currency,amount,amount_paid")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("client_invoice_payments")
        .select("id,method,amount,currency,paid_at,payment_status")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .order("paid_at", { ascending: false })
        .limit(50),
    ]);
    const invRows = (inv.data ?? []) as InvoiceRow[];
    const payRows = (pay.data ?? []) as PaymentRow[];
    setInvoices(invRows);
    setPayments(payRows);

    const invoiceIds = invRows.map((i) => i.id);
    let recRows: ReceiptRow[] = [];
    if (invoiceIds.length) {
      const { data: recData } = await supabase
        .from("client_invoice_receipts")
        .select("id,receipt_number,amount,currency,generated_at,payment_id")
        .in("invoice_id", invoiceIds)
        .is("archived_at", null)
        .order("generated_at", { ascending: false })
        .limit(50);
      recRows = (recData ?? []) as ReceiptRow[];
    }
    setReceipts(recRows);

    const statusMap: typeof paymentStatuses = {};
    for (const p of payRows) {
      statusMap[p.id] = await resolvePaymentPlatformStatuses(p.id);
    }
    setPaymentStatuses(statusMap);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [clientId]);

  const outstanding = invoices.reduce(
    (s, i) => s + Math.max(Number(i.amount) - Number(i.amount_paid ?? 0), 0),
    0,
  );
  const currency = invoices[0]?.currency ?? payments[0]?.currency ?? "INR";

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-sm">Financial summary</h3>
            <p className="text-xs text-muted-foreground">Invoices, payments, receipts, and outstanding</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Outstanding</div>
              <div className="font-semibold tabular-nums">{money(outstanding, currency)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Invoices</div>
              <div className="font-semibold tabular-nums">{invoices.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Payments</div>
              <div className="font-semibold tabular-nums">{payments.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Receipts</div>
              <div className="font-semibold tabular-nums">{receipts.length}</div>
            </div>
          </div>
        )}
      </Card>

      {!loading && payments.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <h4 className="text-sm font-medium mb-2">Recent payments</h4>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left py-1">Date</th>
                <th className="text-left py-1">Method</th>
                <th className="text-right py-1">Amount</th>
                <th className="text-left py-1">Business</th>
                <th className="text-left py-1">Workflow</th>
                <th className="text-left py-1">Accounting</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 10).map((p) => {
                const st = paymentStatuses[p.id];
                return (
                  <tr key={p.id} className="border-t">
                    <td className="py-1.5 text-muted-foreground">{new Date(p.paid_at).toLocaleDateString()}</td>
                    <td className="py-1.5">{p.method.replace(/_/g, " ")}</td>
                    <td className="py-1.5 text-right tabular-nums">{money(p.amount, p.currency)}</td>
                    <td className="py-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {businessStatusLabel(st?.businessStatus ?? p.payment_status)}
                      </Badge>
                    </td>
                    <td className="py-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {workflowStatusLabel(st?.workflowStatus ?? "not_started")}
                      </Badge>
                    </td>
                    <td className="py-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {accountingStatusLabel(st?.accountingStatus ?? "none")}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <StudentFinancialLedger clientId={clientId} clientName={clientName} />
    </div>
  );
}
