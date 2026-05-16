import type { MockCampaign, MockSource, MockSuggestion } from "./types";

export const mockCampaigns: MockCampaign[] = [
  {
    id: "cmp-1",
    institution_id: "mock-inst-seneca",
    name: "May/Sep 2026 intake push",
    period_from: "2026-01-01",
    period_to: "2026-08-31",
    is_active: true,
    bonus_logic: "+2% commission on May & Sep intakes (India, Nigeria, Philippines, Vietnam)",
    target_countries: ["India", "Nigeria", "Philippines", "Vietnam"],
    eligible_institutions: ["mock-inst-seneca"],
    promotion_ids: ["promo-1"],
    claim_impact: "Increases expected claim total by ~12%",
    renewal_impact: "Strengthens renewal case",
    channel: "email",
  },
  {
    id: "cmp-2",
    institution_id: "mock-inst-centennial",
    name: "Bangladesh corridor",
    period_from: "2026-02-01",
    period_to: "2026-12-31",
    is_active: true,
    bonus_logic: "+CAD 300 per Bangladesh enrolment",
    target_countries: ["Bangladesh"],
    eligible_institutions: ["mock-inst-centennial"],
    promotion_ids: ["promo-3"],
    claim_impact: "Per-student fixed bonus",
    renewal_impact: "Demonstrates new-market growth",
    channel: "whatsapp",
  },
  {
    id: "cmp-3",
    institution_id: null,
    name: "Counselor incentive Q1 2026",
    period_from: "2026-01-01",
    period_to: "2026-03-31",
    is_active: false,
    bonus_logic: "CAD 150 per closed enrolment, all institutions",
    target_countries: [],
    eligible_institutions: [],
    promotion_ids: [],
    claim_impact: "No direct impact",
    renewal_impact: "Channel partner activity boost",
    channel: "internal",
  },
];

export const mockSources: MockSource[] = [
  { id: "src-1", institution_id: "mock-inst-seneca", source_type: "website_url", name: "Seneca Programs", url: "https://senecapolytechnic.ca/programs", uploaded_at: "2025-10-12T00:00:00Z", confidence_score: 92, status: "completed", linked_agreement_id: "mock-agr-seneca" },
  { id: "src-2", institution_id: "mock-inst-seneca", source_type: "pdf_brochure", name: "Seneca Intl Brochure 2025", url: null, uploaded_at: "2025-09-04T00:00:00Z", confidence_score: 88, status: "completed", linked_agreement_id: "mock-agr-seneca" },
  { id: "src-3", institution_id: "mock-inst-conestoga", source_type: "excel_sheet", name: "Conestoga Commission Sheet", url: null, uploaded_at: "2025-11-21T00:00:00Z", confidence_score: 96, status: "completed", linked_agreement_id: "mock-agr-conestoga" },
  { id: "src-4", institution_id: "mock-inst-centennial", source_type: "scholarship_page", name: "Centennial Scholarships", url: "https://centennialcollege.ca/scholarships", uploaded_at: "2026-01-08T00:00:00Z", confidence_score: 74, status: "running", linked_agreement_id: "mock-agr-centennial" },
  { id: "src-5", institution_id: "mock-inst-fanshawe", source_type: "website_url", name: "Fanshawe Intl", url: "https://fanshawec.ca/international", uploaded_at: "2025-08-01T00:00:00Z", confidence_score: 41, status: "failed", linked_agreement_id: "mock-agr-fanshawe" },
];

export const mockSuggestions: MockSuggestion[] = [
  { id: "sug-1", institution_id: "mock-inst-centennial", suggestion_type: "renewal", severity: "warning", title: "Centennial agreement expires in 45 days", description: "Initiate renewal review and confirm updated commission terms.", confidence: 92, status: "pending", affected_record: "mock-agr-centennial" },
  { id: "sug-2", institution_id: "mock-inst-seneca", suggestion_type: "claim", severity: "critical", title: "Claim deadline approaching for Fall 2025", description: "5 days left to submit cycle cc-2 (Seneca). 1 invoice still overdue.", confidence: 95, status: "pending", affected_record: "cc-2" },
  { id: "sug-3", institution_id: "mock-inst-seneca", suggestion_type: "consent", severity: "warning", title: "1 student missing commission consent (Maria Garcia)", description: "Cannot be claimed until consent uploaded.", confidence: 100, status: "pending", affected_record: "stu-4" },
  { id: "sug-4", institution_id: "mock-inst-fanshawe", suggestion_type: "rule_mismatch", severity: "warning", title: "Commission rules conflict (slab tiers)", description: "Two overlapping slab tiers detected — verify policy.", confidence: 80, status: "pending", affected_record: "mock-com-fanshawe" },
  { id: "sug-5", institution_id: "mock-inst-seneca", suggestion_type: "carry_forward", severity: "info", title: "Carry forward 1 deferred student to Winter 2026", description: "Long Nguyen deferred from Sep 2025 — already linked.", confidence: 99, status: "accepted", affected_record: "stu-5" },
  { id: "sug-6", institution_id: "mock-inst-conestoga", suggestion_type: "invoice", severity: "warning", title: "No invoice submitted yet for Winter 2026", description: "Cycle cc-3 has eligible students but no invoice drafted.", confidence: 90, status: "pending", affected_record: "cc-3" },
  { id: "sug-7", institution_id: "mock-inst-centennial", suggestion_type: "campaign_active", severity: "info", title: "Bangladesh corridor campaign active", description: "Track enrolments to maximize bonus capture.", confidence: 100, status: "pending", affected_record: "cmp-2" },
  { id: "sug-8", institution_id: "mock-inst-fanshawe", suggestion_type: "underperforming", severity: "warning", title: "Fanshawe underperforming this intake", description: "Enrolments down 60% vs prior cycle. Consider reactivation.", confidence: 85, status: "pending", affected_record: "mock-inst-fanshawe" },
];