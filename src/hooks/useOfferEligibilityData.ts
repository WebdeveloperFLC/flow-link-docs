import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildEligibilityRuleRow,
  offerConflictSummary,
  type OfferEligibilityRuleRow,
} from "@/incentives/lib/offerEligibilityLogic";
import type { Database } from "@/integrations/supabase/databaseCmsPhase3";

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

type DbRule = {
  id: string;
  offer_id: string | null;
  audience: string;
  block_if_active_service: boolean;
  scope_service_code: string | null;
  scope_country_tag: string | null;
  scope_master_key: string | null;
  evaluate_against: string[] | null;
  is_active: boolean;
  notes: string | null;
};

export function useOfferEligibilityData() {
  const [rules, setRules] = useState<OfferEligibilityRuleRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, offersRes] = await Promise.all([
        supabase
          .from("offer_eligibility_rules")
          .select(
            "id,offer_id,audience,block_if_active_service,scope_service_code,scope_country_tag,scope_master_key,evaluate_against,is_active,notes",
          )
          .order("created_at", { ascending: false }),
        supabase.from("offers").select("id,title,priority,stackable,status").order("title"),
      ]);

      if (rulesRes.error) throw rulesRes.error;
      const offerRows = (offersRes.data ?? []) as OfferRow[];
      setOffers(offerRows);

      const offerMap = new Map(offerRows.map((o) => [o.id, o.title]));
      const built = ((rulesRes.data ?? []) as DbRule[]).map((r) =>
        buildEligibilityRuleRow({
          ...r,
          offerTitle: r.offer_id ? offerMap.get(r.offer_id) ?? "Offer" : "Global policy",
        }),
      );
      setRules(built);
    } catch {
      setRules([]);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () =>
      offerConflictSummary({
        offers: offers.map((o) => ({
          stackable: (o as OfferRow & { stackable?: boolean }).stackable,
          priority: (o as OfferRow & { priority?: number }).priority,
        })),
        rules,
      }),
    [offers, rules],
  );

  return { rules, offers, loading, summary, reload: load };
}
