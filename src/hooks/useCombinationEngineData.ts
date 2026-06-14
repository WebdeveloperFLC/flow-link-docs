import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildCombinationRow,
  splitLibraryId,
  type ResolvedCombination,
  type ServiceCombinationRow,
} from "@/incentives/lib/combinationEngineLogic";

type DbCombination = {
  id: string;
  name: string;
  combination_type: string;
  service_codes: string[] | null;
  branch_id: string | null;
  package_price: number | null;
  package_currency: string | null;
  max_discount_pct: number | null;
  wallet_eligible: boolean;
  linked_offer_id: string | null;
  linked_incentive_scheme_id: string | null;
  is_active: boolean;
};

export function useCombinationEngineData() {
  const [rows, setRows] = useState<ServiceCombinationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // @ts-expect-error service_combinations added in Phase 3A migration
      const { data, error } = await supabase
        .from("service_combinations")
        .select(
          "id,name,combination_type,service_codes,branch_id,package_price,package_currency,max_discount_pct,wallet_eligible,linked_offer_id,linked_incentive_scheme_id,is_active",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const combos = (data ?? []) as DbCombination[];
      const branchIds = [...new Set(combos.map((c) => c.branch_id).filter(Boolean))] as string[];
      const libIds = [
        ...new Set(combos.flatMap((c) => (c.service_codes ?? []).map(splitLibraryId))),
      ].filter((id) => id.match(/^[0-9a-f-]{36}$/i));

      const [branchesRes, libraryRes] = await Promise.all([
        branchIds.length
          ? supabase.from("branches").select("id,name").in("id", branchIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        libIds.length
          ? supabase.from("service_library").select("id,service,sub_service").in("id", libIds)
          : Promise.resolve({ data: [] as { id: string; service: string; sub_service: string }[] }),
      ]);

      const branchMap = new Map(
        ((branchesRes.data ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name]),
      );
      const labelMap = new Map(
        ((libraryRes.data ?? []) as { id: string; service: string; sub_service: string }[]).map((s) => [
          s.id,
          s.sub_service || s.service,
        ]),
      );

      const resolved = await Promise.all(
        combos.map(async (c) => {
          // @ts-expect-error fn_resolve_combination added in Phase 3A migration
          const { data: res } = await supabase.rpc("fn_resolve_combination", {
            _combination_id: c.id,
            _client_id: null,
          });
          const r = (res ?? null) as ResolvedCombination | null;
          return buildCombinationRow({
            ...c,
            branchName: c.branch_id ? branchMap.get(c.branch_id) ?? "—" : "All branches",
            labelMap,
            resolvedPrice: r?.price,
            resolvedCurrency: r?.currency,
            resolvedLabels: Array.isArray(r?.service_labels)
              ? (r!.service_labels as string[])
              : undefined,
          });
        }),
      );

      setRows(resolved);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(
    () => ({
      total: rows.length,
      logical: rows.filter((r) => r.combinationType === "logical").length,
      package: rows.filter((r) => r.combinationType === "package").length,
      withRules: rows.filter((r) => r.hasOfferRule || r.hasIncentiveRule || r.hasDiscountRule).length,
    }),
    [rows],
  );

  return { rows, loading, kpis, reload: load };
}
