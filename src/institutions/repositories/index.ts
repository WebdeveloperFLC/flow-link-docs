import { supabase } from "@/integrations/supabase/client";
import { USE_MOCK_DATA } from "../config";
import {
  mockAgreements,
  mockCommissions,
  mockCommissionRules,
  mockClaimCycles,
  mockInvoices,
  mockPromotions,
} from "../mock/canadianInstitutions";

/**
 * Repository layer. Live Supabase rows always take precedence.
 * Mock data is only used to seed empty results during demo/dev,
 * and is never merged with real rows.
 */

async function liveOrMock<T>(live: Promise<T[]>, mock: T[]): Promise<T[]> {
  const rows = await live;
  if (rows.length > 0) return rows;
  if (USE_MOCK_DATA) return mock;
  return rows;
}

function filterByInst<T extends { institution_id?: string | null }>(rows: T[], institutionId?: string) {
  if (!institutionId) return rows;
  return rows.filter((r) => r.institution_id === institutionId);
}

// --- Agreements
export const agreementsRepo = {
  async list(institutionId?: string) {
    const live = supabase
      .from("upi_agreements")
      .select("*")
      .order("created_at", { ascending: false })
      .then((r) => {
        if (r.error) throw r.error;
        return (institutionId ? (r.data ?? []).filter((d) => d.institution_id === institutionId) : (r.data ?? [])) as any[];
      });
    return liveOrMock(live, filterByInst(mockAgreements, institutionId) as any[]);
  },
};

// --- Commissions
export const commissionsRepo = {
  async list(institutionId?: string) {
    const live = supabase
      .from("upi_commissions")
      .select("*")
      .order("created_at", { ascending: false })
      .then((r) => {
        if (r.error) throw r.error;
        return (institutionId ? (r.data ?? []).filter((d) => d.institution_id === institutionId) : (r.data ?? [])) as any[];
      });
    return liveOrMock(live, filterByInst(mockCommissions, institutionId) as any[]);
  },
  async rules(commissionIds: string[]) {
    if (commissionIds.length === 0) return [];
    const live = supabase
      .from("upi_commission_rules")
      .select("*")
      .in("commission_id", commissionIds)
      .then((r) => {
        if (r.error) throw r.error;
        return r.data ?? [];
      });
    const liveRows = await live;
    if (liveRows.length > 0) return liveRows as any[];
    if (!USE_MOCK_DATA) return [];
    return mockCommissionRules.filter((r) => commissionIds.includes(r.commission_id)) as any[];
  },
};

// --- Claim cycles
export const claimCyclesRepo = {
  async list(institutionId?: string) {
    const live = supabase
      .from("upi_claim_cycles")
      .select("*")
      .order("claim_due_date", { ascending: true })
      .then((r) => {
        if (r.error) throw r.error;
        return (institutionId ? (r.data ?? []).filter((d: any) => d.institution_id === institutionId) : (r.data ?? [])) as any[];
      });
    return liveOrMock(live, filterByInst(mockClaimCycles, institutionId) as any[]);
  },
};

// --- Invoices
export const invoicesRepo = {
  async list(institutionId?: string) {
    const live = supabase
      .from("upi_invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .then((r) => {
        if (r.error) throw r.error;
        return (institutionId ? (r.data ?? []).filter((d: any) => d.institution_id === institutionId) : (r.data ?? [])) as any[];
      });
    return liveOrMock(live, filterByInst(mockInvoices, institutionId) as any[]);
  },
};

// --- Promotions
export const promotionsRepo = {
  async list(institutionId?: string) {
    const live = supabase
      .from("upi_promotions")
      .select("*")
      .order("created_at", { ascending: false })
      .then((r) => {
        if (r.error) throw r.error;
        return (institutionId ? (r.data ?? []).filter((d) => d.institution_id === institutionId) : (r.data ?? [])) as any[];
      });
    return liveOrMock(live, filterByInst(mockPromotions, institutionId) as any[]);
  },
};

// --- Renewal alerts
export const renewalAlertsRepo = {
  async list(agreementIds?: string[]) {
    let q = supabase.from("upi_renewal_alerts").select("*").eq("status", "pending");
    if (agreementIds && agreementIds.length > 0) q = q.in("agreement_id", agreementIds);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
};

// --- Document pipeline events
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