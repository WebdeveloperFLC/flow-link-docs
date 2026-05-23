import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { printReceiptSnapshot } from "@/accounting/lib/printReceiptSnapshot";
import { fmtReceiptAmount } from "@/accounting/lib/receiptHelpers";

type Row = {
  id: string;
  receipt_number: string;
  generated_at: string | null;
  currency: string;
  amount: number;
  receipt_voided: boolean | null;
  receipt_snapshot_jsonb: any;
  invoice_id: string;
  invoice_number: string;
  client_name: string;
  client_id: string;
};

/** Always-visible recent receipts block shown on the AR landing page. */
export default function RecentReceiptsCard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: receipts } = await supabase
        .from("client_invoice_receipts")
        .select("id,receipt_number,generated_at,currency,amount,receipt_voided,receipt_snapshot_jsonb,invoice_id")
        .is("archived_at", null)
        .order("generated_at", { ascending: false })
        .limit(8);
      const invIds = Array.from(new Set((receipts ?? []).map((r: any) => r.invoice_id)));
      const { data: invs } = invIds.length
        ? await supabase.from("client_invoices").select("id,invoice_number,client_id").in("id", invIds)
        : { data: [] as any[] };
      const invMap = new Map<string, { invoice_number: string; client_id: string }>();
      for (const i of (invs ?? []) as any[]) invMap.set(i.id, { invoice_number: i.invoice_number, client_id: i.client_id });
      const clientIds = Array.from(new Set((invs ?? []).map((i: any) => i.client_id).filter(Boolean)));
      const { data: clients } = clientIds.length
        ? await supabase.from("clients").select("id,name").in("id", clientIds)
        : { data: [] as any[] };
      const clientMap = new Map<string, string>();
      for (const c of (clients ?? []) as any[]) clientMap.set(c.id, c.name);
      setRows(((receipts ?? []) as any[]).map((r) => {
        const inv = invMap.get(r.invoice_id);
        return {
          ...r,
          invoice_number: inv?.invoice_number ?? "—",
          client_id: inv?.client_id ?? "",
          client_name: inv?.client_id ? (clientMap.get(inv.client_id) ?? "—") : "—",
        };
      }));
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm flex items-center gap-2">
          <Receipt className="size-4 text-primary" /> Recent receipts
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate("/accounting/ar/receipts")}>
          View all
        </Button>
      </div>
      {loading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No receipts generated yet. Generate one from a client invoice to see it here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Receipt #</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Client</th>
                <th className="text-left px-3 py-2">Invoice</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">
                    {r.receipt_number}
                    {r.receipt_voided && <span className="ml-1 text-xs text-destructive">(voided)</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.generated_at ? new Date(r.generated_at).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-2">
                    {r.client_id
                      ? <button className="text-primary hover:underline" onClick={() => navigate(`/clients/${r.client_id}`)}>{r.client_name}</button>
                      : r.client_name}
                  </td>
                  <td className="px-3 py-2">{r.invoice_number}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtReceiptAmount(Number(r.amount), r.currency)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" disabled={!r.receipt_snapshot_jsonb} onClick={() => r.receipt_snapshot_jsonb && printReceiptSnapshot(r.receipt_snapshot_jsonb)}>
                      <Download className="size-3.5 mr-1" /> View
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