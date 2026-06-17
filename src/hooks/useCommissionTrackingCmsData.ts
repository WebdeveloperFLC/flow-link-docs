import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildCommissionLedgerRows,
  commissionTrackingKpisWithFx,
  type CommissionLedgerRow,
} from "@/incentives/lib/commissionTrackingCmsLogic";

function yearBounds(period: string) {
  const y = period.slice(0, 4);
  const year = y.length === 4 ? y : String(new Date().getFullYear());
  return { start: `${year}-01-01`, end: `${Number(year) + 1}-01-01` };
}

export function useCommissionTrackingCmsData(period: string) {
  const [rows, setRows] = useState<CommissionLedgerRow[]>([]);
  const [rates, setRates] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = yearBounds(period);
      const [studentsRes, instRes, modelsRes, fxRes] = await Promise.all([
        supabase
          .from("upi_commission_students")
          .select("institution_id,commission_amount,commission_status,tuition_currency,created_at")
          .gte("created_at", start)
          .lt("created_at", end)
          .limit(2000),
        supabase.from("upi_institutions").select("id,name,institution_type"),
        supabase.from("upi_commissions").select("institution_id,model_type").eq("is_active", true),
        supabase
          .from("fx_rates")
          .select("currency,rate_to_inr,period_key")
          .eq("period_key", period.slice(0, 7))
          .eq("rate_purpose", "general"),
      ]);

      const rateMap = new Map<string, number>();
      for (const fx of (fxRes.data ?? []) as { currency: string; rate_to_inr: number }[]) {
        rateMap.set(fx.currency.toUpperCase(), Number(fx.rate_to_inr));
      }
      if (!rateMap.has("CAD")) rateMap.set("CAD", 61.7);
      setRates(rateMap);

      const built = buildCommissionLedgerRows(
        (studentsRes.data ?? []) as {
          institution_id: string | null;
          commission_amount: number | null;
          commission_status: string | null;
          tuition_currency: string | null;
        }[],
        (instRes.data ?? []) as { id: string; name: string; institution_type: string | null }[],
        (modelsRes.data ?? []) as { institution_id: string; model_type: string }[],
        rateMap,
      );
      setRows(built);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => commissionTrackingKpisWithFx(rows, rates), [rows, rates]);

  return { rows, kpis, loading, reload: load };
}
