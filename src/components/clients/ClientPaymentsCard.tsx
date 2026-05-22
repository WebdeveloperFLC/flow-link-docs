import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Receipt, Loader2 } from "lucide-react";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  currency: string;
  total_amount: number;
  paid_amount: number;
  outstanding_balance: number;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SENT: "bg-primary/10 text-primary border-primary/20",
  PARTIALLY_PAID: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  OVERDUE: "bg-destructive/10 text-destructive border-destructive/20",
  VOID: "bg-muted text-muted-foreground border-border line-through",
};

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "INR", maximumFractionDigits: 2 }).format(amount || 0);
  } catch {
    return `${currency || ""} ${(amount || 0).toFixed(2)}`;
  }
}

export function ClientPaymentsCard({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("accounting_ar_invoices")
        .select("id,invoice_number,invoice_date,due_date,status,currency,total_amount,paid_amount,outstanding_balance")
        .eq("client_id", clientId)
        .order("invoice_date", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.warn("[ClientPaymentsCard] load failed", error);
        setRows([]);
      } else {
        setRows((data ?? []) as InvoiceRow[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const totalOutstanding = rows.reduce((s, r) => s + Number(r.outstanding_balance || 0), 0);
  const currency = rows[0]?.currency ?? "INR";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">
            <Receipt className="size-4 text-primary" /> Payments & invoices
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {loading
              ? "Loading…"
              : rows.length === 0
              ? "No invoices yet — create one in Accounting."
              : `${rows.length} invoice${rows.length === 1 ? "" : "s"} · Outstanding ${fmt(totalOutstanding, currency)}`}
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/accounting/ar">
            Open accounts receivable <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin mr-2" /> Loading invoices…
        </div>
      ) : rows.length === 0 ? null : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Invoice</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2">Outstanding</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{r.invoice_number}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.invoice_date}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={STATUS_STYLES[r.status] ?? ""}>
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(Number(r.total_amount), r.currency)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(Number(r.paid_amount), r.currency)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${Number(r.outstanding_balance) > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {fmt(Number(r.outstanding_balance), r.currency)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/accounting/ar/${r.id}`}>
                        {Number(r.outstanding_balance) > 0 ? "Collect" : "View"}
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}