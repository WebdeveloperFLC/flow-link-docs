import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildCurrencyConfigRows,
  buildCurrencyMix,
  buildFxHistoryBars,
  multiCurrencyCmsKpis,
  type CurrencyConfigRow,
  type CurrencyMixSlice,
  type FxHistoryBar,
} from "@/incentives/lib/multiCurrencyCmsLogic";
import { periodBounds } from "@/incentives/lib/clientCommercialsLogic";

export function useMultiCurrencyCmsData(period: string, branchId: string) {
  const [rows, setRows] = useState<CurrencyConfigRow[]>([]);
  const [mix, setMix] = useState<CurrencyMixSlice[]>([]);
  const [history, setHistory] = useState<FxHistoryBar[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = periodBounds(period);
      let invoiceQuery = supabase
        .from("client_invoices")
        .select("currency,amount")
        .gte("created_at", start)
        .lt("created_at", end)
        .limit(2000);
      if (branchId) invoiceQuery = invoiceQuery.eq("branch_id", branchId);

      const [fxRes, invoiceRes] = await Promise.all([
        supabase
          .from("fx_rates")
          .select("currency,period_key,base_rate_to_inr,rate_to_inr,buffer_fixed,buffer_pct,source")
          .order("period_key", { ascending: false })
          .limit(120),
        invoiceQuery,
      ]);

      const revenueByCurrency = new Map<string, number>();
      for (const inv of (invoiceRes.data ?? []) as { currency: string | null; amount: number }[]) {
        const code = (inv.currency || "INR").toUpperCase();
        revenueByCurrency.set(code, (revenueByCurrency.get(code) ?? 0) + Number(inv.amount ?? 0));
      }

      const fxRows = (fxRes.data ?? []) as {
        currency: string;
        period_key: string;
        base_rate_to_inr: number | null;
        rate_to_inr: number;
        buffer_fixed: number | null;
        buffer_pct: number | null;
        source: string;
      }[];

      const built = buildCurrencyConfigRows(fxRows, revenueByCurrency, period);
      setRows(built);
      setMix(buildCurrencyMix(built));
      setHistory(buildFxHistoryBars(fxRows, "CAD"));
    } catch {
      setRows([]);
      setMix([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [period, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => multiCurrencyCmsKpis(rows), [rows]);

  return { rows, mix, history, kpis, loading, reload: load };
}
