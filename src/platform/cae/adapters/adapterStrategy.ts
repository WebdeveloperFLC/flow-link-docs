/**
 * CAE adapter strategy — links legacy module tables to universal registry.
 * UPI/Incentive tables are NOT replaced; adapters create financial_parties + commercial_agreements rows.
 */

export const CAE_ADAPTER_MODULES = {
  clients: "clients",
  profiles: "profiles",
  upiInstitutions: "upi_institutions",
  upiAggregators: "upi_aggregators",
  accountingVendors: "accounting_vendors",
  upiAgreements: "upi_agreements",
  incentivePlans: "incentive_plans",
} as const;

export type CaeAdapterModule = (typeof CAE_ADAPTER_MODULES)[keyof typeof CAE_ADAPTER_MODULES];

/** Maps legacy source module → agreement template code */
export const LEGACY_ADAPTER_TEMPLATE_MAP: Record<string, string> = {
  upi_agreements: "university_commission",
  upi_aggregators: "aggregator_commission",
  incentive_plans: "incentive",
  referrals: "referral_agreement",
};

export interface AdapterLinkInput {
  adapterSourceModule: CaeAdapterModule;
  adapterSourceRecordId: string;
  templateCode: string;
  partyType: string;
  displayName: string;
  agreementType?: string;
}

/**
 * Strategy: when migrating a legacy record, call resolveOrCreateFinancialParty + createAgreementFromTemplate
 * with adapter_source_* set. Settlement Engine (future) resolves via getAgreementByAdapter().
 */
export function adapterTemplateForLegacyModule(sourceModule: string): string | null {
  return LEGACY_ADAPTER_TEMPLATE_MAP[sourceModule] ?? null;
}
