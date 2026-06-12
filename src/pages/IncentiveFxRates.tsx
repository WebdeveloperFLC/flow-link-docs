import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus } from "lucide-react";
import { effectiveRateToInr } from "@/lib/fxPolicy";

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const RATE_PURPOSES = [
  { value: "general", label: "General (all uses)" },
  { value: "billing", label: "Billing / invoices" },
  { value: "incentive_settlement", label: "Incentive settlement" },
  { value: "payout", label: "Counselor payout" },
] as const;

interface FxRow {
  id: string;
  currency: string;
  period_key: string;
  base_rate_to_inr: number | null;
  rate_to_inr: number;
  buffer_fixed: number | null;
  buffer_pct: number | null;
  source: string;
  rate_purpose: string;
}

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

export default function IncentiveFxRates() {
  const { toast } = useToast();
  const [rows, setRows] = useState<FxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    currency: "CAD",
    period_key: currentPeriodKey(),
    base_rate_to_inr: "66",
    buffer_fixed: "2",
    rate_purpose: "incentive_settlement",
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("fx_rates")
      .select("id, currency, period_key, base_rate_to_inr, rate_to_inr, buffer_fixed, buffer_pct, source, rate_purpose")
      .order("period_key", { ascending: false })
      .limit(50);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setRows((data ?? []) as FxRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    /* eslint-disable-next-line */
  }, []);

  async function addRate() {
    const base = Number(form.base_rate_to_inr);
    if (!form.currency.trim() || !form.period_key.trim() || !base) {
      toast({ title: "Currency, period, and base rate required", variant: "destructive" });
      return;
    }
    const eff = effectiveRateToInr({
      currency: form.currency,
      base_rate_to_inr: base,
      buffer_fixed: Number(form.buffer_fixed) || 2,
    });
    const { error } = await supabase.from("fx_rates").insert([
      {
        currency: form.currency.toUpperCase(),
        period_key: form.period_key.trim(),
        base_rate_to_inr: base,
        buffer_fixed: Number(form.buffer_fixed) || 2,
        rate_to_inr: eff,
        source: "manual",
        rate_purpose: form.rate_purpose,
      },
    ]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "FX rate saved", description: `Effective ${form.currency.toUpperCase()} → INR = ${eff}` });
    await load();
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <DollarSign className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">FX Rates &amp; Buffer</h1>
            <p className="text-sm text-muted-foreground">
              Effective rate = base + buffer (default +2). Set purpose so billing and incentive runs can use different rates.
            </p>
          </div>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Add / update rate</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Currency</label>
              <Input className="mt-1" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Period key</label>
              <Input className="mt-1" value={form.period_key} onChange={(e) => setForm({ ...form, period_key: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Purpose</label>
              <select className={sel} value={form.rate_purpose} onChange={(e) => setForm({ ...form, rate_purpose: e.target.value })}>
                {RATE_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Base rate → INR</label>
              <Input className="mt-1" value={form.base_rate_to_inr} onChange={(e) => setForm({ ...form, base_rate_to_inr: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Buffer fixed (+)</label>
              <Input className="mt-1" value={form.buffer_fixed} onChange={(e) => setForm({ ...form, buffer_fixed: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button onClick={addRate} className="w-full">
                <Plus className="size-4 mr-1" /> Save
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Preview effective:{" "}
            {effectiveRateToInr({
              currency: form.currency,
              base_rate_to_inr: Number(form.base_rate_to_inr) || 0,
              buffer_fixed: Number(form.buffer_fixed) || 2,
            })}{" "}
            INR per 1 {form.currency.toUpperCase()}
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Current rates</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No FX rates configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Purpose</th>
                    <th className="py-2 pr-4">Currency</th>
                    <th className="py-2 pr-4 text-right">Base</th>
                    <th className="py-2 pr-4 text-right">Buffer</th>
                    <th className="py-2 pr-4 text-right">Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{r.period_key}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{r.rate_purpose ?? "general"}</td>
                      <td className="py-2 pr-4">{r.currency}</td>
                      <td className="py-2 pr-4 text-right">{r.base_rate_to_inr ?? r.rate_to_inr}</td>
                      <td className="py-2 pr-4 text-right">+{r.buffer_fixed ?? 2}</td>
                      <td className="py-2 pr-4 text-right font-medium">
                        {effectiveRateToInr({
                          currency: r.currency,
                          base_rate_to_inr: r.base_rate_to_inr ?? r.rate_to_inr,
                          buffer_fixed: r.buffer_fixed,
                          buffer_pct: r.buffer_pct,
                          rate_to_inr: r.rate_to_inr,
                        })}
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
