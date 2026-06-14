import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  mapProfitabilityRow,
  profitabilityTotals,
  type ProfitabilityDimension,
  type ProfitabilityRow,
} from "@/incentives/lib/commercialProfitabilityLogic";

export function useCommercialProfitabilityData(
  period: string,
  dimension: ProfitabilityDimension,
  branchId: string,
) {
  const [rows, setRows] = useState<ProfitabilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("fn_commercial_profitability", {
        _period_key: period,
        _group_by: dimension,
        _branch_id: branchId || null,
        _limit: 30,
      });
      if (error) throw error;
      setRows(((data ?? []) as Parameters<typeof mapProfitabilityRow>[0][]).map(mapProfitabilityRow));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [period, dimension, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => profitabilityTotals(rows), [rows]);

  return { rows, totals, loading, reload: load };
}
