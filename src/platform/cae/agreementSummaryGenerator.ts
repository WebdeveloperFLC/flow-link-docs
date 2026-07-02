/**
 * Agreement Summary Generator — read-only, generated from live master data.
 * Never persisted as an editable object. Regenerated on every request.
 */
import { supabase } from "@/integrations/supabase/client";
import { getRelationshipById } from "./commercialRelationshipRegistry";
import { listOfferOverlaysForAgreement } from "./commercialOfferOverlayService";
import { resolveAgreementVersionAtDate } from "./commercialAgreementRegistry";
import { getFinancialPartyById } from "./financialPartyRegistry";
import type {
  AgreementSummary,
  AgreementSummaryCommissionRule,
  AgreementSummaryOverview,
  AgreementSummaryValidityItem,
  CommercialAgreementVersion,
  CommercialValidityStatus,
  InstitutionApplicationFeeWaiver,
} from "./types";
import { computeCommercialValidityStatus, settlementAllowedForValidity } from "./validityStatus";

const SETTLEMENT_CYCLE_LABELS: Record<string, string> = {
  immediate: "immediately",
  on_university_payment: "after university payment is received",
  on_collection: "after collection is received",
  on_visa_approval: "after visa approval",
  on_course_start: "after course start",
  monthly: "monthly",
  quarterly: "quarterly",
};

const PAYMENT_BASIS_LABELS: Record<string, string> = {
  percentage: "percentage",
  fixed_amount: "fixed amount",
  per_student: "per student",
  revenue_share: "revenue share",
  hourly: "hourly rate",
  retainer: "retainer",
};

function businessLanguageFromVersion(version: CommercialAgreementVersion): string[] {
  const rules = version.rulesJson ?? {};
  const lines: string[] = [];
  const basis = version.paymentBasis ?? (rules.rate_type as string) ?? "percentage";
  const rate = rules.rate_value ?? rules.percentage ?? rules.rate;
  const cycle = version.settlementCycle ?? (rules.settlement_cycle as string) ?? "on_collection";

  if (rate != null && basis === "percentage") {
    lines.push(`Commission is calculated at **${rate}%** of tuition received.`);
  } else if (rate != null && basis === "fixed_amount") {
    lines.push(`Commission is a **fixed amount of ${rate}** ${version.rulesJson?.currency ?? ""}.`.trim());
  } else if (basis === "per_student") {
    lines.push(`Commission is **${rate ?? "a fixed amount"} per student**.`);
  }

  const cycleLabel = SETTLEMENT_CYCLE_LABELS[cycle] ?? cycle.replace(/_/g, " ");
  lines.push(`Commission becomes payable **${cycleLabel}**.`);

  if (rules.claim_window_days) {
    lines.push(`Claims must be submitted within **${rules.claim_window_days} days**.`);
  }
  if (rules.countries) {
    const countries = Array.isArray(rules.countries) ? rules.countries.join(", ") : String(rules.countries);
    lines.push(`Agreement covers **${countries}** programs.`);
  }
  if (rules.scope_description) {
    lines.push(String(rules.scope_description));
  }

  return lines.length ? lines : ["Commercial terms are defined in the active agreement version."];
}

function commissionRulesFromVersion(
  version: CommercialAgreementVersion,
  asOf: string,
): AgreementSummaryCommissionRule[] {
  const rules = version.rulesJson ?? {};
  const validity = computeCommercialValidityStatus(version.effectiveFrom, version.effectiveTo ?? null, asOf);
  const basis = version.paymentBasis ?? (rules.rate_type as string) ?? "percentage";
  const rate = rules.rate_value ?? rules.percentage;

  let businessSummary = `${rate ?? ""}% commission`.trim();
  if (basis === "fixed_amount") businessSummary = `Fixed ${rate} per qualifying event`;
  if (basis === "per_student") businessSummary = `${rate ?? "Fixed amount"} per student`;

  return [
    {
      commissionType: (rules.commission_type as string) ?? basis,
      calculationMethod: PAYMENT_BASIS_LABELS[basis] ?? basis,
      triggerEvent: (rules.trigger_event as string) ?? (rules.milestone as string) ?? "qualifying event",
      settlementCycle: version.settlementCycle ?? "on_collection",
      currency: (rules.currency as string) ?? "INR",
      taxTreatment: (rules.tax_treatment as string) ?? version.taxRulesJson?.treatment as string,
      minimumThreshold: rules.min_threshold != null ? Number(rules.min_threshold) : null,
      maximumLimit: rules.max_threshold != null ? Number(rules.max_threshold) : null,
      applicableCountries: (rules.countries as string[]) ?? [],
      applicableInstitutions: (rules.institution_ids as string[]) ?? [],
      applicablePrograms: (rules.programs as string[]) ?? [],
      effectiveDate: version.effectiveFrom,
      expiryDate: version.effectiveTo ?? null,
      currentStatus: validity,
      businessSummary,
    },
  ];
}

async function loadInstitutionFeeWaivers(institutionId: string): Promise<InstitutionApplicationFeeWaiver[]> {
  try {
    const { data } = await supabase
      .from("v_cae_institution_application_fee_waiver" as never)
      .select("*")
      .eq("institution_id", institutionId as never);

    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      institutionId: String(row.institution_id),
      institutionName: String(row.institution_name ?? ""),
      amount: Number(row.amount ?? 0),
      currency: String(row.currency ?? "CAD"),
      validFrom: String(row.valid_from),
      validUntil: (row.valid_until as string) ?? null,
      validityStatus: (row.validity_status as CommercialValidityStatus) ?? "active",
      isWaiver: row.is_waiver === true,
      programId: (row.program_id as string) ?? null,
      partnershipRouteId: (row.partnership_route_id as string) ?? null,
      masterUpdatedAt: row.master_updated_at as string | undefined,
      readOnly: true as const,
    }));
  } catch {
    return [];
  }
}

async function resolveInstitutionIdFromAgreement(
  adapterModule?: string | null,
  adapterRecordId?: string | null,
): Promise<string | null> {
  if (adapterModule === "upi_institutions" && adapterRecordId) return adapterRecordId;
  if (adapterModule === "upi_agreements" && adapterRecordId) {
    const { data } = await supabase
      .from("upi_agreements")
      .select("institution_id")
      .eq("id", adapterRecordId)
      .maybeSingle();
    return (data as { institution_id?: string } | null)?.institution_id ?? null;
  }
  return null;
}

/**
 * Generate Agreement Summary from live sources — never reads/writes a summary table.
 */
export async function generateAgreementSummary(input: {
  agreementId: string;
  asOfDate?: string;
}): Promise<{ ok: boolean; summary?: AgreementSummary; error?: string }> {
  const asOf = input.asOfDate ?? new Date().toISOString().slice(0, 10);

  try {
    const { data: agreementRow, error: agrErr } = await supabase
      .from("commercial_agreements" as never)
      .select("*")
      .eq("id", input.agreementId as never)
      .maybeSingle();
    if (agrErr || !agreementRow) return { ok: false, error: "Agreement not found" };

    const agreement = agreementRow as Record<string, unknown>;
    const version = await resolveAgreementVersionAtDate(input.agreementId, asOf);

    const relationship = agreement.relationship_id
      ? await getRelationshipById(String(agreement.relationship_id))
      : null;

    const { data: partyLinks } = await supabase
      .from("commercial_agreement_parties" as never)
      .select("party_role, financial_party_id")
      .eq("agreement_id", input.agreementId as never);

    const parties: AgreementSummaryOverview["parties"] = [];
    for (const link of (partyLinks ?? []) as { party_role: string; financial_party_id: string }[]) {
      const party = await getFinancialPartyById(link.financial_party_id);
      if (party) {
        parties.push({
          role: link.party_role,
          displayName: party.displayName,
          partyType: party.partyType,
        });
      }
    }

    const agreementHealth = computeCommercialValidityStatus(
      (agreement.valid_from as string) ?? version?.effectiveFrom ?? null,
      (agreement.valid_to as string) ?? version?.effectiveTo ?? null,
      asOf,
    );

    const overview: AgreementSummaryOverview = {
      agreementStatus: String(agreement.status),
      agreementType: String(agreement.agreement_type),
      relationship,
      parties,
      companyEntityId: (agreement.company_entity_id as string) ?? null,
      branchId: (agreement.branch_id as string) ?? null,
      effectiveDate: version?.effectiveFrom ?? (agreement.valid_from as string) ?? null,
      expiryDate: version?.effectiveTo ?? (agreement.valid_to as string) ?? null,
      renewalDate: (relationship?.validTo as string) ?? (agreement.valid_to as string) ?? null,
      noticePeriodDays: relationship?.noticePeriodDays ?? null,
      agreementHealth,
      relationshipManagerId: relationship?.relationshipManagerId ?? null,
      versionNumber: version?.versionNumber ?? null,
    };

    const commercialSummary = version ? businessLanguageFromVersion(version) : [];
    const commissionStructure = version ? commissionRulesFromVersion(version, asOf) : [];

    const temporaryOffers = await listOfferOverlaysForAgreement(input.agreementId, {
      includeExpired: true,
    });

    const validityItems: AgreementSummaryValidityItem[] = [];

    if (version) {
      const vStatus = computeCommercialValidityStatus(
        version.effectiveFrom,
        version.effectiveTo ?? null,
        asOf,
      );
      validityItems.push({
        itemType: "agreement_version",
        itemId: version.id,
        label: `Version ${version.versionNumber}`,
        validFrom: version.effectiveFrom,
        validUntil: version.effectiveTo ?? null,
        status: vStatus,
        settlementAllowed: settlementAllowedForValidity(vStatus),
      });
    }

    for (const offer of temporaryOffers) {
      const oStatus = computeCommercialValidityStatus(offer.validFrom, offer.validUntil, asOf);
      validityItems.push({
        itemType: "offer_overlay",
        itemId: offer.id,
        label: offer.name,
        validFrom: offer.validFrom,
        validUntil: offer.validUntil,
        status: oStatus,
        settlementAllowed: settlementAllowedForValidity(oStatus),
      });
    }

    const institutionId = await resolveInstitutionIdFromAgreement(
      agreement.adapter_source_module as string,
      agreement.adapter_source_record_id as string,
    );
    const institutionPromotions = institutionId
      ? await loadInstitutionFeeWaivers(institutionId)
      : [];

    for (const promo of institutionPromotions.filter((p) => p.isWaiver)) {
      validityItems.push({
        itemType: "institution_fee_waiver",
        itemId: promo.institutionId,
        label: `Application Fee Waiver — ${promo.institutionName}`,
        validFrom: promo.validFrom,
        validUntil: promo.validUntil ?? null,
        status: promo.validityStatus,
        settlementAllowed: settlementAllowedForValidity(promo.validityStatus),
      });
    }

    const summary: AgreementSummary = {
      generatedAt: new Date().toISOString(),
      asOfDate: asOf,
      agreementId: input.agreementId,
      overview,
      commercialSummary,
      commissionStructure,
      temporaryOffers,
      validityItems,
      institutionPromotions,
      figures: {
        estimatedRevenue: null,
        actualRevenue: null,
        revenueTarget: null,
        commissionEarned: null,
        commissionReceived: null,
        commissionOutstanding: null,
        temporaryBonusLiability: temporaryOffers
          .filter((o) => settlementAllowedForValidity(
            computeCommercialValidityStatus(o.validFrom, o.validUntil, asOf),
          ))
          .reduce((s, o) => s + Number(o.budgetAmount ?? o.financialImpact?.amount ?? 0), 0) || null,
        settlementValue: null,
        pendingClaims: null,
        performanceAgainstTarget: null,
      },
      sourceRefs: {
        agreementVersionId: version?.id ?? null,
        relationshipId: relationship?.id ?? null,
        institutionId,
        adapterSourceModule: (agreement.adapter_source_module as string) ?? null,
        adapterSourceRecordId: (agreement.adapter_source_record_id as string) ?? null,
      },
    };

    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
