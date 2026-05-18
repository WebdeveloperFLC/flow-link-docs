import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Receipt } from "lucide-react";

interface ClaimCycleRow {
  id: string;
  institution_id: string;
  period_label: string | null;
  intake: string | null;
  status: string | null;
  claim_due_date: string | null;
  total_expected: number | null;
  total_received: number | null;
  currency: string | null;
}

interface InstitutionRow {
  id: string;
  name: string;
}

export default function CommissionsPage() {
  const [cycles, setCycles] = useState<ClaimCycleRow[]>([]);
  const [institutions, setInstitutions] = useState<Record<string, string>>({});
  const [invoiceStatusCounts, setInvoiceStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cyclesRes, instRes, invRes] = await Promise.all([
        supabase
          .from("upi_claim_cycles")
          .select("id, institution_id, period_label, intake, status, claim_due_date, total_expected, total_received, currency")
          .order("claim_due_date", { ascending: true }),
        supabase.from("upi_institutions").select("id, name"),
        supabase.from("upi_commission_invoices").select("status"),
      ]);

      setCycles((cyclesRes.data ?? []) as ClaimCycleRow[]);
      const instMap: Record<string, string> = {};
      for (const i of (instRes.data ?? []) as InstitutionRow[]) instMap[i.id] = i.name;
      setInstitutions(instMap);
      const counts: Record<string, number> = {};
      for (const r of (invRes.data ?? []) as { status: string | null }[]) {
        const k = r.status ?? "unknown";
        counts[k] = (counts[k] ?? 0) + 1;
      }
      setInvoiceStatusCounts(counts);
      setLoading(false);
    })();
  }, []);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Receipt className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Commissions</h1>
        </div>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Invoices by status</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : Object.keys(invoiceStatusCounts).length === 0 ? (
            <div className="text-sm text-muted-foreground">No invoices found.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(invoiceStatusCounts).map(([status, count]) => (
                <div key={status} className="border rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{status}</div>
                  <div className="text-2xl font-semibold mt-1">{count}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Claim cycles</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : cycles.length === 0 ? (
            <div className="text-sm text-muted-foreground">No claim cycles found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Institution</th>
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Intake</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Due</th>
                    <th className="py-2 pr-4 text-right">Expected</th>
                    <th className="py-2 pr-4 text-right">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{institutions[c.institution_id] ?? "—"}</td>
                      <td className="py-2 pr-4">{c.period_label ?? "—"}</td>
                      <td className="py-2 pr-4">{c.intake ?? "—"}</td>
                      <td className="py-2 pr-4">{c.status ?? "—"}</td>
                      <td className="py-2 pr-4">{c.claim_due_date ?? "—"}</td>
                      <td className="py-2 pr-4 text-right">
                        {c.total_expected != null ? `${c.total_expected} ${c.currency ?? ""}` : "—"}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {c.total_received != null ? `${c.total_received} ${c.currency ?? ""}` : "—"}
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