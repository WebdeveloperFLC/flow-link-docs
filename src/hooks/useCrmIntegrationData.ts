import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  mergeAutoApplyRows,
  parseCrmHealth,
  type AutoApplyPolicy,
  type AutoApplyPolicyRow,
  type CrmEntityCard,
  type CrmHealthCheck,
} from "@/incentives/lib/autoApplyPolicyLogic";

export function useCrmIntegrationData() {
  const [policies, setPolicies] = useState<AutoApplyPolicyRow[]>([]);
  const [entities, setEntities] = useState<CrmEntityCard[]>([]);
  const [checks, setChecks] = useState<CrmHealthCheck[]>([]);
  const [syncStatus, setSyncStatus] = useState("unknown");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [policyRes, healthRes] = await Promise.all([
        // @ts-expect-error commercial_autoapply_policy added in Phase 3D migration
        supabase.from("commercial_autoapply_policy").select("entity_type,policy").order("entity_type"),
        // @ts-expect-error fn_crm_integration_health added in Phase 3D migration
        supabase.rpc("fn_crm_integration_health"),
      ]);

      if (policyRes.error) throw policyRes.error;
      setPolicies(
        mergeAutoApplyRows((policyRes.data ?? []) as { entity_type: string; policy: string }[]),
      );

      const health = parseCrmHealth(healthRes.data);
      setEntities(health.entities);
      setChecks(health.checks);
      setSyncStatus(health.syncStatus);
    } catch {
      setPolicies(mergeAutoApplyRows([]));
      setEntities([]);
      setChecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savePolicy = async (entityType: string, policy: AutoApplyPolicy) => {
    // @ts-expect-error commercial_autoapply_policy added in Phase 3D migration
    const { error } = await supabase
      .from("commercial_autoapply_policy")
      .upsert({ entity_type: entityType, policy, updated_at: new Date().toISOString() });
    if (error) throw error;
    await load();
  };

  return { policies, entities, checks, syncStatus, loading, reload: load, savePolicy };
}
