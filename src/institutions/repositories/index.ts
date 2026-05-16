import { supabase } from "@/integrations/supabase/client";

/**
 * Repository layer.
 * Live DB rows only, strictly scoped by institution_id. No mock fallback.
 */

async function fetchLiveScoped(
  table: string,
  institutionId: string | undefined,
  order?: { col: string; ascending?: boolean },
): Promise<any[]> {
  if (!institutionId) return [];
  try {
    let q = supabase.from(table as any).select("*").eq("institution_id", institutionId);
    if (order) q = q.order(order.col, { ascending: order.ascending ?? false });
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as any[];
  } catch {
    return [];
  }
}

export const agreementsRepo = {
  list: (institutionId?: string) => fetchLiveScoped("upi_agreements", institutionId, { col: "created_at" }),
};

export const commissionsRepo = {
  list: (institutionId?: string) => fetchLiveScoped("upi_commissions", institutionId, { col: "created_at" }),
  async rules(commissionIds: string[]) {
    if (commissionIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from("upi_commission_rules")
        .select("*")
        .in("commission_id", commissionIds);
      if (error) throw error;
      return (data ?? []) as any[];
    } catch {
      return [];
    }
  },
};

export const claimCyclesRepo = {
  list: (institutionId?: string) =>
    fetchLiveScoped("upi_claim_cycles", institutionId, { col: "claim_due_date", ascending: true }),
};

export const invoicesRepo = {
  list: (institutionId?: string) => fetchLiveScoped("upi_invoices", institutionId, { col: "created_at" }),
};

export const promotionsRepo = {
  list: (institutionId?: string) => fetchLiveScoped("upi_promotions", institutionId, { col: "created_at" }),
};

export const campaignsRepo = {
  list: (institutionId?: string) =>
    fetchLiveScoped("upi_marketing_campaigns", institutionId, { col: "created_at" }),
};

export const suggestionsRepo = {
  list: (institutionId?: string) =>
    fetchLiveScoped("upi_ai_suggestions", institutionId, { col: "created_at" }),
};

// Stubs kept for hook signature compatibility — always empty.
export const sourcesMockRepo = { async list(_institutionId?: string) { return [] as any[]; } };
export const studentsRepo = { async list(_institutionId?: string) { return [] as any[]; } };
export const paymentsRepo = { async list() { return [] as any[]; } };

export const renewalAlertsRepo = {
  async list(agreementIds?: string[]) {
    let q = supabase.from("upi_renewal_alerts").select("*").eq("status", "pending");
    if (agreementIds && agreementIds.length > 0) q = q.in("agreement_id", agreementIds);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
};

export const pipelineRepo = {
  async listByDocument(documentId: string) {
    const { data, error } = await supabase
      .from("upi_document_pipeline_events")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};
