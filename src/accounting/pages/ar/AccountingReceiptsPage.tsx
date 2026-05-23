import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Receipt, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import { supabase } from "@/integrations/supabase/client";
import { printReceiptSnapshot } from "../../lib/printReceiptSnapshot";
import { fmtReceiptAmount } from "../../lib/receiptHelpers";

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

export default function AccountingReceiptsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "voided">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: receipts, error } = await supabase
        .from("client_invoice_receipts")
        .select("id,receipt_number,generated_at,currency,amount,receipt_voided,receipt_snapshot_jsonb,invoice_id")
        .is("archived_at", null)
        .order("generated_at", { ascending: false })
        .limit(500);
      if (error || !receipts) { setRows([]); setLoading(false); return; }
      const invIds = Array.from(new Set(receipts.map((r: any) => r.invoice_id)));
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
      setRows((receipts as any[]).map((r) => {
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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "active" && r.receipt_voided) return false;
      if (status === "voided" && !r.receipt_voided) return false;
      if (!term) return true;
      return [r.receipt_number, r.invoice_number, r.client_name]
        .some((v) => String(v ?? "").toLowerCase().includes(term));
    });
  }, [rows, q, status]);

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <AccountingPageHeader
          title="Receipts"
          subtitle="Accounts receivable · Generated payment receipts"
          actions={
            <Button variant="outline" onClick={() => navigate("/accounting/ar")}>
              <ArrowLeft className="size-4 mr-1" /> Back to AR
            </Button>
          }
        />

        <Card className="p-4 mt-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-7 h-9" placeholder="Search receipt #, invoice #, client…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground ml-auto">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} receipts`}
            </div>
          </div>

          {!loading && filtered.length === 0 ? (
            <AccountingEmptyState icon={Receipt} title="No receipts" description={rows.length === 0 ? "Generate a receipt from a client invoice to see it here." : "No receipts match your filters."} />
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
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{r.receipt_number}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.generated_at ? new Date(r.generated_at).toLocaleDateString() : "—"}</td>
                      <td className="px-3 py-2">
                        {r.client_id ? (
                          <button className="text-primary hover:underline" onClick={() => navigate(`/clients/${r.client_id}`)}>{r.client_name}</button>
                        ) : r.client_name}
                      </td>
                      <td className="px-3 py-2">{r.invoice_number}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtReceiptAmount(Number(r.amount), r.currency)}</td>
                      <td className="px-3 py-2">
                        {r.receipt_voided
                          ? <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">Voided</Badge>
                          : <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">Active</Badge>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="outline" disabled={!r.receipt_snapshot_jsonb} title={r.receipt_snapshot_jsonb ? "View / Print / Download PDF" : "Snapshot unavailable"} onClick={() => r.receipt_snapshot_jsonb && printReceiptSnapshot(r.receipt_snapshot_jsonb)}>
                          <Download className="size-3.5 mr-1" /> View / Print
                        </Button>
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