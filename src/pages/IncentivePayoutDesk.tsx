import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Banknote, CheckCircle, Download } from "lucide-react";
import { downloadCsv, payoutsToCsv } from "@/incentives/lib/incentiveFinanceExport";

interface PayoutRow {
  id: string;
  run_id: string | null;
  counselor_id: string;
  gross_amount: number;
  net_amount: number;
  tds_amount: number;
  tds_percent: number;
  settlement_currency: string;
  status: string;
  paid_at: string | null;
  accounting_ap_bill_id: string | null;
}

const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()}${ccy !== "INR" ? " " + ccy : ""}`;

export default function IncentivePayoutDesk() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [runId, setRunId] = useState("");
  const [exportRunId, setExportRunId] = useState("");
  const [tdsPct, setTdsPct] = useState("10");
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  async function load() {
    const [po, prof] = await Promise.all([
      supabase.from("incentive_payouts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setRows((po.data ?? []) as PayoutRow[]);
    const map: Record<string, string> = {};
    for (const p of (prof.data ?? []) as any[]) map[p.id] = p.full_name ?? p.id;
    setNames(map);
  }

  useEffect(() => {
    load();
  }, []);

  async function generateFromRun() {
    if (!runId.trim()) {
      toast({ title: "Enter run ID", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data: run, error: runErr } = await supabase
        .from("incentive_runs")
        .select("id, locked, settlement_currency, period_key")
        .eq("id", runId.trim())
        .single();
      if (runErr || !run) throw new Error("Run not found");
      if (!run.locked) throw new Error("Lock the run before generating payouts");

      const { data: items, error: liErr } = await supabase
        .from("incentive_line_items")
        .select("counselor_id, earned_amount, settlement_currency")
        .eq("run_id", run.id);
      if (liErr) throw liErr;

      const byCounselor: Record<string, number> = {};
      for (const li of (items ?? []) as any[]) {
        byCounselor[li.counselor_id] = (byCounselor[li.counselor_id] ?? 0) + Number(li.earned_amount ?? 0);
      }

      const pct = Number(tdsPct) || 0;
      const inserts = Object.entries(byCounselor)
        .filter(([, gross]) => gross > 0)
        .map(([counselor_id, gross_amount]) => {
          const tds = Math.round(gross_amount * (pct / 100) * 100) / 100;
          return {
            run_id: run.id,
            counselor_id,
            gross_amount,
            tds_amount: tds,
            tds_percent: pct,
            net_amount: Math.round((gross_amount - tds) * 100) / 100,
            settlement_currency: run.settlement_currency ?? "INR",
            status: "pending" as const,
          };
        });

      if (!inserts.length) {
        toast({ title: "No earnings on this run" });
        return;
      }

      const { error } = await supabase.from("incentive_payouts").insert(inserts);
      if (error) throw error;
      toast({ title: `Generated ${inserts.length} payout row(s)` });
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const patch: Record<string, unknown> = { status };
    if (status === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = user?.id ?? null;
    }
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("incentive_payouts").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  }

  async function setApBillId(id: string, apBillId: string) {
    const { error } = await supabase
      .from("incentive_payouts")
      .update({ accounting_ap_bill_id: apBillId.trim() || null })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  }

  async function exportCsv() {
    setExportBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_incentive_payout_export", {
        _run_id: exportRunId.trim() || null,
        _period_key: null,
      });
      if (error) throw error;
      const exportRows = (data ?? []) as {
        payout_id: string;
        period_key: string;
        counselor_name: string;
        counselor_id: string;
        gross_amount: number;
        tds_amount: number;
        net_amount: number;
        settlement_currency: string;
        status: string;
      }[];
      if (!exportRows.length) {
        toast({ title: "Nothing to export" });
        return;
      }
      const csv = payoutsToCsv(
        exportRows.map((r) => ({
          payout_id: r.payout_id,
          period_key: r.period_key,
          counselor_name: r.counselor_name,
          counselor_id: r.counselor_id,
          gross_amount: r.gross_amount,
          tds_amount: r.tds_amount,
          net_amount: r.net_amount,
          settlement_currency: r.settlement_currency,
          status: r.status,
        })),
      );
      const suffix = exportRunId.trim() ? exportRunId.trim().slice(0, 8) : "all";
      downloadCsv(`incentive-payouts-${suffix}.csv`, csv);
      toast({ title: `Exported ${exportRows.length} row(s)` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Banknote className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Payout Desk</h1>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Generate payouts from locked run</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Run ID (from Incentives Admin → Recent runs)</label>
              <Input className="mt-1" value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="uuid" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">TDS %</label>
              <Input className="mt-1" value={tdsPct} onChange={(e) => setTdsPct(e.target.value)} />
            </div>
          </div>
          <Button disabled={busy} onClick={generateFromRun}>
            {busy ? "Working…" : "Generate payouts"}
          </Button>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Finance export (CSV / AP)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Run ID (optional — blank exports all recent payouts)</label>
              <Input className="mt-1" value={exportRunId} onChange={(e) => setExportRunId(e.target.value)} placeholder="uuid" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" disabled={exportBusy} onClick={exportCsv}>
                <Download className="size-4 mr-1" /> {exportBusy ? "Exporting…" : "Download CSV"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            After uploading to your AP system, paste the bill ID on each payout row below.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Payout queue</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Counselor</th>
                    <th className="py-2 pr-4 text-right">Gross</th>
                    <th className="py-2 pr-4 text-right">TDS</th>
                    <th className="py-2 pr-4 text-right">Net</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">AP bill ID</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{names[r.counselor_id] ?? r.counselor_id}</td>
                      <td className="py-2 pr-4 text-right">{fmt(r.gross_amount, r.settlement_currency)}</td>
                      <td className="py-2 pr-4 text-right">{fmt(r.tds_amount, r.settlement_currency)}</td>
                      <td className="py-2 pr-4 text-right font-medium">{fmt(r.net_amount, r.settlement_currency)}</td>
                      <td className="py-2 pr-4">{r.status}</td>
                      <td className="py-2 pr-4">
                        <Input
                          className="h-8 w-36 text-xs"
                          defaultValue={r.accounting_ap_bill_id ?? ""}
                          placeholder="AP ref"
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (r.accounting_ap_bill_id ?? "")) setApBillId(r.id, v);
                          }}
                        />
                      </td>
                      <td className="py-2 pr-4 flex flex-wrap gap-1">
                        {r.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "approved")}>Approve</Button>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" onClick={() => updateStatus(r.id, "paid")}>
                            <CheckCircle className="size-3 mr-1" /> Mark paid
                          </Button>
                        )}
                        {r.run_id && (
                          <Link to={`/incentives/runs/${r.run_id}`} className="text-xs text-primary underline self-center">Run</Link>
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
