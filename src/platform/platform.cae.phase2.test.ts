import { describe, expect, it } from "vitest";
import { canTransitionAgreement } from "@/platform/cae/agreementLifecycleService";
import { ownershipPrecedesAgreement } from "@/platform/cae/agreementPriority";
import { evaluateCustomerOwnershipRules } from "@/platform/cae/customerOwnershipRules";
import { DEFAULT_COMMERCIAL_AGREEMENT_CONFIG } from "@/platform/cae/defaultCommercialAgreementConfig";
import { evaluateExistingCustomerRules } from "@/platform/cae/existingCustomerRules";
import { evaluateFraudChecks } from "@/platform/cae/fraudDetectionService";
import { adapterTemplateForLegacyModule } from "@/platform/cae/adapters/adapterStrategy";
import { ownershipBlocksSettlement } from "@/platform/cae/effectiveCommercialPositionService";
import { sortOverlaysByPrecedence, winningOverlay } from "@/platform/cae/overlayPrecedence";
import type {
  CommercialOfferOverlay,
  CommercialRelationshipOwnership,
  CustomerOwnershipSnapshot,
  SettlementEligibilityRequest,
} from "@/platform/cae/types";

const baseRequest = (overrides?: Partial<SettlementEligibilityRequest>): SettlementEligibilityRequest => ({
  settlementType: "incentive_counselor",
  clientId: "client-1",
  sourceModule: "test",
  sourceRecordId: "src-1",
  ...overrides,
});

const snapshot = (overrides?: Partial<CustomerOwnershipSnapshot>): CustomerOwnershipSnapshot => ({
  clientId: "client-1",
  hasCrmRecord: true,
  ...overrides,
});

describe("CAE Phase 2 — existing customer rules (config-driven)", () => {
  it("blocks existing student when hasActiveProgram", () => {
    const reasons = evaluateExistingCustomerRules(snapshot({ hasActiveProgram: true }));
    expect(reasons).toContain("existing_student");
  });

  it("blocks continuing student when prior payment before event", () => {
    const reasons = evaluateExistingCustomerRules(
      snapshot({ hasPriorVerifiedPaymentBeforeEvent: true }),
    );
    expect(reasons).toContain("continuing_student");
  });
});

describe("CAE Phase 2 — fraud detection framework", () => {
  it("detects self-referral", () => {
    const result = evaluateFraudChecks(
      baseRequest({ settlementType: "referral_bonus" }),
      snapshot({ selfReferralSignal: true }),
    );
    expect(result.triggered).toContain("self_referral");
  });

  it("detects counselor own student", () => {
    const result = evaluateFraudChecks(
      baseRequest({ settlementType: "incentive_counselor", claimantCounselorId: "c1" }),
      snapshot({ counselorOwnStudentSignal: true }),
    );
    expect(result.triggered).toContain("counselor_own_student");
  });
});

describe("CAE Phase 2 — constitutional priority", () => {
  it("ownership precedes commercial agreement in priority stack", () => {
    expect(ownershipPrecedesAgreement()).toBe(true);
  });
});

describe("CAE Phase 2 — agreement lifecycle", () => {
  it("allows draft → submitted", () => {
    expect(canTransitionAgreement("draft", "submitted")).toBe(true);
  });

  it("blocks active → draft", () => {
    expect(canTransitionAgreement("active", "draft")).toBe(false);
  });
});

describe("CAE Phase 2 — ownership evaluation integrates fraud", () => {
  it("returns fraudReasons on blocked referral", () => {
    const decision = evaluateCustomerOwnershipRules(
      baseRequest({ settlementType: "referral_bonus" }),
      snapshot({ hasPriorVerifiedPayment: true, selfReferralSignal: true }),
      DEFAULT_COMMERCIAL_AGREEMENT_CONFIG,
    );
    expect(decision.eligible).toBe(false);
    expect(decision.fraudReasons.length).toBeGreaterThan(0);
  });
});

describe("CAE Phase 2 — adapter strategy", () => {
  it("maps upi_agreements to university_commission template", () => {
    expect(adapterTemplateForLegacyModule("upi_agreements")).toBe("university_commission");
  });

  it("maps incentive_plans to incentive template", () => {
    expect(adapterTemplateForLegacyModule("incentive_plans")).toBe("incentive");
  });
});

describe("CAE Phase 2 — relationship governance config", () => {
  it("seeds relationship classifications and role codes", () => {
    expect(DEFAULT_COMMERCIAL_AGREEMENT_CONFIG.relationshipClassifications).toContain("university_partnership");
    expect(DEFAULT_COMMERCIAL_AGREEMENT_CONFIG.relationshipRoleCodes).toContain("subject_client");
    expect(DEFAULT_COMMERCIAL_AGREEMENT_CONFIG.overlayStackLayers).toContain("customer_ownership");
  });
});

describe("CAE Phase 2 — overlay precedence", () => {
  const base = (overrides: Partial<CommercialOfferOverlay>): CommercialOfferOverlay => ({
    id: overrides.id ?? "o1",
    masterAgreementId: "agr-1",
    offerType: "bonus",
    name: "Test",
    validFrom: "2026-01-01",
    validUntil: "2026-12-31",
    status: "active",
    ...overrides,
  });

  it("orders constitutional layers before overlay layer", () => {
    const sorted = sortOverlaysByPrecedence([
      base({ id: "o1", stackLayer: "overlay", precedenceRank: 10 }),
      base({ id: "o2", stackLayer: "customer_ownership", precedenceRank: 200 }),
    ]);
    expect(sorted[0]?.stackLayer).toBe("customer_ownership");
  });

  it("picks winning overlay by precedence rank within same layer", () => {
    const winner = winningOverlay([
      base({ id: "o1", precedenceRank: 50, offerType: "bonus" }),
      base({ id: "o2", precedenceRank: 10, offerType: "bonus" }),
    ], { offerType: "bonus" });
    expect(winner?.id).toBe("o2");
  });
});

describe("CAE Phase 2 — effective commercial position ownership gate", () => {
  const ownership = (
    overrides: Partial<CommercialRelationshipOwnership>,
  ): CommercialRelationshipOwnership => ({
    id: "ow-1",
    relationshipId: "rel-1",
    subjectFinancialPartyId: "party-1",
    ownershipStatus: "protected",
    protectionLevel: "block_settlement",
    status: "active",
    ...overrides,
  });

  it("blocks settlement when active ownership protection applies", () => {
    expect(
      ownershipBlocksSettlement([ownership({ ownershipStatus: "protected" })], "2026-06-01"),
    ).toBe(true);
  });

  it("allows settlement when override approved", () => {
    expect(
      ownershipBlocksSettlement([ownership({ ownershipStatus: "override_approved" })], "2026-06-01"),
    ).toBe(false);
  });
});
