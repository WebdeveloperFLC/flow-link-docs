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

/**
 * Repository layer. Live Supabase rows always take precedence.
 * Mock data is only used to seed empty results during demo/dev,
 * and is never merged with real rows.
 */

async function liveOrMock<T>(live: PromiseLike<T[]>, mock: T[]): Promise<T[]> {
  try {
    const rows = await live;
    if (rows.length > 0) return rows;
  } catch {
    // fall through to mock
  }
  if (USE_MOCK_DATA) return mock;
  return [];
}

/**
 * When DB returns no rows for a real institution id, we still want the demo
 * tabs to be testable. Mock IDs (`mock-inst-*`) won't match real UUIDs, so
 * fall back to ALL mock rows when filtering by-institution yields nothing.
 */
function mockForInst<T extends { institution_id?: string | null }>(rows: T[], institutionId?: string) {
  if (!institutionId) return rows;
  const filtered = rows.filter((r) => r.institution_id === institutionId);
  return filtered.length > 0 ? filtered : rows;
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
    return liveOrMock(live, mockForInst(mockAgreements, institutionId) as any[]);
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
    return liveOrMock(live, mockForInst(mockCommissions, institutionId) as any[]);
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
    return liveOrMock(live, mockForInst(mockClaimCycles, institutionId) as any[]);
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
    return liveOrMock(live, mockForInst(mockInvoices, institutionId) as any[]);
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
    return liveOrMock(live, mockForInst(mockPromotions, institutionId) as any[]);
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

// --- Students (mock-only for now)
export const studentsRepo = {
  async list(institutionId?: string) {
    if (!USE_MOCK_DATA) return [];
    return institutionId ? mockForInst(mockStudents, institutionId) : mockStudents;
  },
};

// --- Payments (mock-only)
export const paymentsRepo = {
  async list() {
    if (!USE_MOCK_DATA) return [];
    return mockPayments;
  },
};

// --- Campaigns
export const campaignsRepo = {
  async list(institutionId?: string) {
    const live = supabase
      .from("upi_marketing_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .then((r) => {
        if (r.error) throw r.error;
        return (institutionId ? (r.data ?? []).filter((d: any) => d.institution_id === institutionId) : (r.data ?? [])) as any[];
      });
    return liveOrMock(live, mockForInst(mockCampaigns as any[], institutionId));
  },
};

// --- Sources mock fallback (only used when DB has none)
export const sourcesMockRepo = {
  async list(institutionId?: string) {
    if (!USE_MOCK_DATA) return [];
    return mockForInst(mockSources, institutionId);
  },
};

// --- AI suggestions
export const suggestionsRepo = {
  async list(institutionId?: string) {
    const live = supabase
      .from("upi_ai_suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .then((r) => {
        if (r.error) throw r.error;
        return (institutionId ? (r.data ?? []).filter((d: any) => d.institution_id === institutionId) : (r.data ?? [])) as any[];
      });
    return liveOrMock(live, mockForInst(mockSuggestions as any[], institutionId));
  },
};