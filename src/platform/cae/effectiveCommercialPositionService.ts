/**
 * Effective commercial position — as-of resolver (DB function wrapper + client helpers).
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  CommercialOfferOverlay,
  CommercialRelationshipContact,
  CommercialRelationshipOwnership,
  CommercialRelationshipPartyRole,
  EffectiveCommercialPosition,
  RelationshipContactType,
  RelationshipOwnershipStatus,
  RelationshipPartyRoleCode,
  RelationshipProtectionLevel,
} from "./types";

function mapPartyRole(row: Record<string, unknown>): CommercialRelationshipPartyRole {
  return {
    id: String(row.id),
    relationshipId: String(row.relationship_id),
    financialPartyId: String(row.financial_party_id),
    roleCode: row.role_code as RelationshipPartyRoleCode,
    isPrimary: Boolean(row.is_primary),
    validFrom: (row.valid_from as string) ?? null,
    validTo: (row.valid_to as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapOwnership(row: Record<string, unknown>): CommercialRelationshipOwnership {
  return {
    id: String(row.id),
    relationshipId: String(row.relationship_id),
    subjectFinancialPartyId: String(row.subject_financial_party_id),
    ownershipStatus: row.ownership_status as RelationshipOwnershipStatus,
    protectionLevel: row.protection_level as RelationshipProtectionLevel,
    ownershipRuleCode: (row.ownership_rule_code as string) ?? null,
    validFrom: (row.valid_from as string) ?? null,
    validTo: (row.valid_to as string) ?? null,
    status: row.status as CommercialRelationshipOwnership["status"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapContact(row: Record<string, unknown>): CommercialRelationshipContact {
  return {
    id: String(row.id),
    relationshipId: String(row.relationship_id),
    contactType: row.contact_type as RelationshipContactType,
    fullName: String(row.full_name),
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    jobTitle: (row.job_title as string) ?? null,
    profileId: (row.profile_id as string) ?? null,
    isPrimary: Boolean(row.is_primary),
    active: Boolean(row.active),
    notes: (row.notes as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapOverlay(row: Record<string, unknown>): CommercialOfferOverlay {
  return {
    id: String(row.id),
    masterAgreementId: String(row.master_agreement_id),
    relationshipId: (row.relationship_id as string) ?? null,
    offerType: String(row.offer_type),
    name: String(row.name),
    description: (row.description as string) ?? null,
    financialImpact: (row.financial_impact as Record<string, unknown>) ?? {},
    validFrom: String(row.valid_from),
    validUntil: String(row.valid_until),
    status: String(row.status ?? row.validity_status ?? "active"),
    precedenceRank: row.precedence_rank != null ? Number(row.precedence_rank) : undefined,
    stackLayer: (row.stack_layer as string) ?? undefined,
    supersedesOverlayId: (row.supersedes_overlay_id as string) ?? null,
    appliesToJson: (row.applies_to_json as Record<string, unknown>) ?? {},
    supportingDocumentPaths: (row.supporting_document_paths as string[]) ?? [],
    approvalReference: (row.approval_reference as string) ?? null,
    budgetAmount: row.budget_amount != null ? Number(row.budget_amount) : null,
    budgetCurrency: (row.budget_currency as string) ?? null,
    targetJson: (row.target_json as Record<string, unknown>) ?? {},
    adapterSourceModule: (row.adapter_source_module as string) ?? null,
    adapterSourceRecordId: (row.adapter_source_record_id as string) ?? null,
  };
}

export function mapEffectiveCommercialPosition(raw: Record<string, unknown>): EffectiveCommercialPosition {
  const blockReasons = Array.isArray(raw.block_reasons)
    ? (raw.block_reasons as string[])
    : [];

  return {
    found: Boolean(raw.found),
    asOf: String(raw.as_of ?? new Date().toISOString().slice(0, 10)),
    relationshipId: raw.relationship_id
      ? String(raw.relationship_id)
      : (raw.relationship as Record<string, unknown> | undefined)?.id
        ? String((raw.relationship as Record<string, unknown>).id)
        : undefined,
    agreementId: raw.agreement_id != null ? String(raw.agreement_id) : null,
    agreementVersionId: raw.agreement_version_id != null ? String(raw.agreement_version_id) : null,
    partyRoles: ((raw.party_roles as Record<string, unknown>[]) ?? []).map(mapPartyRole),
    ownership: ((raw.ownership as Record<string, unknown>[]) ?? []).map(mapOwnership),
    contacts: ((raw.contacts as Record<string, unknown>[]) ?? []).map(mapContact),
    overlays: ((raw.overlays as Record<string, unknown>[]) ?? []).map(mapOverlay),
    settlementAllowed: Boolean(raw.settlement_allowed),
    blockReasons,
  };
}

/** Client-side mirror of ownership gate in fn_cae_resolve_effective_commercial_position */
export function ownershipBlocksSettlement(
  ownership: CommercialRelationshipOwnership[],
  asOfDate?: string,
): boolean {
  const asOf = asOfDate ?? new Date().toISOString().slice(0, 10);
  return ownership.some(
    (o) =>
      o.status === "active" &&
      o.protectionLevel === "block_settlement" &&
      o.ownershipStatus !== "override_approved" &&
      (o.validFrom == null || o.validFrom <= asOf) &&
      (o.validTo == null || o.validTo >= asOf),
  );
}

export async function resolveEffectiveCommercialPosition(
  relationshipId: string,
  opts?: { agreementId?: string; asOfDate?: string },
): Promise<EffectiveCommercialPosition> {
  const asOf = opts?.asOfDate ?? new Date().toISOString().slice(0, 10);
  try {
    const { data, error } = await supabase.rpc("fn_cae_resolve_effective_commercial_position" as never, {
      p_relationship_id: relationshipId,
      p_agreement_id: opts?.agreementId ?? null,
      p_as_of: asOf,
    } as never);

    if (error || !data) {
      return {
        found: false,
        asOf,
        settlementAllowed: false,
        blockReasons: error ? [error.message] : ["not_found"],
      };
    }

    return mapEffectiveCommercialPosition(data as Record<string, unknown>);
  } catch (e) {
    return {
      found: false,
      asOf,
      settlementAllowed: false,
      blockReasons: [(e as Error).message],
    };
  }
}
