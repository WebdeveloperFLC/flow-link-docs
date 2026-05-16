import { supabase } from "@/integrations/supabase/client";
import { USE_MOCK_DATA } from "../config";
import {
  mockAgreementsExtended as mockAgreements,
  mockCommissionsExtended as mockCommissions,
  mockCommissionRulesExtended as mockCommissionRules,
  mockClaimCyclesExtended as mockClaimCycles,
  mockInvoicesExtended as mockInvoices,
  mockPromotionsExtended as mockPromotions,
} from "../mock/canadianInstitutions";
import { mockStudents, mockPayments } from "../mock/students";
import { mockCampaigns, mockSources, mockSuggestions } from "../mock/campaigns";
import {
  getInstitutionRecords,
  pickMockTemplate,
  rekeyToInstitution,
} from "../lib/scope";

/**
 * Repository layer.
 *
 * Rules:
 *  - Live DB rows are strictly scoped by institution_id and ALWAYS win when present.
 *  - When no live rows exist AND USE_MOCK_DATA is on, seed a single deterministic
 *    template (per institution id) rekeyed to that institution. Never merge or
 *    leak rows across institutions.
 *  - Otherwise return [] so the UI shows its empty state.
 */

async function fetchLiveScoped<T extends { institution_id?: string | null }>(
  table: string,
  institutionId: string | undefined,
  order?: { col: string; ascending?: boolean },
): Promise<T[]> {
  if (!institutionId) return [];
  try {
    let q = supabase.from(table as any).select("*").eq("institution_id", institutionId);
    if (order) q = q.order(order.col, { ascending: order.ascending ?? false });
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

function seedFromTemplate<T extends { institution_id?: string | null }>(
  institutionId: string | undefined,
  allMock: T[],
): T[] {
  if (!institutionId || !USE_MOCK_DATA) return [];
  const templateId = pickMockTemplate(institutionId);
  const templateRows = getInstitutionRecords(templateId, allMock);
  return rekeyToInstitution(templateRows, institutionId);
}

async function scopedListOrSeed<T extends { institution_id?: string | null }>(
  table: string,
  institutionId: string | undefined,
  allMock: T[],
  order?: { col: string; ascending?: boolean },
): Promise<T[]> {
  const live = await fetchLiveScoped<T>(table, institutionId, order);
  if (live.length > 0) return live;
  return seedFromTemplate(institutionId, allMock);
}

// --- Agreements
export const agreementsRepo = {
  list: (institutionId?: string) =>
    scopedListOrSeed<any>("upi_agreements", institutionId, mockAgreements, { col: "created_at" }),
};

// --- Commissions (+ rules)
export const commissionsRepo = {
  list: (institutionId?: string) =>
    scopedListOrSeed<any>("upi_commissions", institutionId, mockCommissions, { col: "created_at" }),
  async rules(commissionIds: string[]) {
    if (commissionIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from("upi_commission_rules")
        .select("*")
        .in("commission_id", commissionIds);
      if (error) throw error;
      if ((data ?? []).length > 0) return data as any[];
    } catch {
      // fall through to mock
    }
    if (!USE_MOCK_DATA) return [];
    // Mock rules use mock commission ids; since seedFromTemplate preserves
    // commission ids for the chosen template, this in-keeps the snapshot.
    return mockCommissionRules.filter((r) => commissionIds.includes(r.commission_id)) as any[];
  },
};

// --- Claim cycles
export const claimCyclesRepo = {
  list: (institutionId?: string) =>
    scopedListOrSeed<any>("upi_claim_cycles", institutionId, mockClaimCycles, { col: "claim_due_date", ascending: true }),
};

// --- Invoices
export const invoicesRepo = {
  list: (institutionId?: string) =>
    scopedListOrSeed<any>("upi_invoices", institutionId, mockInvoices, { col: "created_at" }),
};

// --- Promotions
export const promotionsRepo = {
  list: (institutionId?: string) =>
    scopedListOrSeed<any>("upi_promotions", institutionId, mockPromotions, { col: "created_at" }),
};

// --- Campaigns
export const campaignsRepo = {
  list: (institutionId?: string) =>
    scopedListOrSeed<any>("upi_marketing_campaigns", institutionId, mockCampaigns as any[], { col: "created_at" }),
};

// --- AI suggestions
export const suggestionsRepo = {
  list: (institutionId?: string) =>
    scopedListOrSeed<any>("upi_ai_suggestions", institutionId, mockSuggestions as any[], { col: "created_at" }),
};

// --- Sources (mock-only fallback)
export const sourcesMockRepo = {
  async list(institutionId?: string) {
    if (!USE_MOCK_DATA || !institutionId) return [];
    return seedFromTemplate(institutionId, mockSources);
  },
};

// --- Students (mock-only)
export const studentsRepo = {
  async list(institutionId?: string) {
    if (!USE_MOCK_DATA || !institutionId) return [];
    return seedFromTemplate(institutionId, mockStudents);
  },
};

// --- Payments (mock-only, not institution-scoped)
export const paymentsRepo = {
  async list() {
    if (!USE_MOCK_DATA) return [];
    return mockPayments;
  },
};

// --- Renewal alerts (live only — filtered by agreement ids)
export const renewalAlertsRepo = {
  async list(agreementIds?: string[]) {
    let q = supabase.from("upi_renewal_alerts").select("*").eq("status", "pending");
    if (agreementIds && agreementIds.length > 0) q = q.in("agreement_id", agreementIds);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
};

// --- Document pipeline events (live only — scoped per document)
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
