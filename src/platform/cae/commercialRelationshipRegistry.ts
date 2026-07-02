/**
 * Commercial Relationships — party ↔ party links (built before agreements).
 */
import { supabase } from "@/integrations/supabase/client";
import { createBusinessEvent } from "../foe/businessEventService";
import type {
  CommercialRelationship,
  CommercialRelationshipContact,
  CommercialRelationshipOwnership,
  CommercialRelationshipPartyRole,
  CreateCommercialRelationshipInput,
  RelationshipContactType,
  RelationshipPartyRoleCode,
} from "./types";

function mapRow(row: Record<string, unknown>): CommercialRelationship {
  return {
    id: String(row.id),
    relationshipType: String(row.relationship_type),
    partyAId: String(row.party_a_id),
    partyBId: String(row.party_b_id),
    companyEntityId: (row.company_entity_id as string) ?? null,
    branchId: (row.branch_id as string) ?? null,
    countryCode: (row.country_code as string) ?? null,
    status: row.status as CommercialRelationship["status"],
    validFrom: (row.valid_from as string) ?? null,
    validTo: (row.valid_to as string) ?? null,
    noticePeriodDays: row.notice_period_days != null ? Number(row.notice_period_days) : null,
    relationshipManagerId: (row.relationship_manager_id as string) ?? null,
    relationshipClassificationCode: (row.relationship_classification_code as string) ?? "standard",
    externalReference: (row.external_reference as string) ?? null,
    healthScore: row.health_score != null ? Number(row.health_score) : null,
    renewalDate: (row.renewal_date as string) ?? null,
    adapterSourceModule: (row.adapter_source_module as string) ?? null,
    adapterSourceRecordId: (row.adapter_source_record_id as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export async function createCommercialRelationship(
  input: CreateCommercialRelationshipInput,
): Promise<{ ok: boolean; relationship?: CommercialRelationship; error?: string }> {
  if (input.partyAId === input.partyBId) {
    return { ok: false, error: "Relationship parties must be distinct" };
  }

  try {
    if (input.adapterSourceModule && input.adapterSourceRecordId) {
      const existing = await getRelationshipByAdapter(
        input.adapterSourceModule,
        input.adapterSourceRecordId,
      );
      if (existing) return { ok: true, relationship: existing };
    }

    const event = await createBusinessEvent({
      domain: "generic",
      eventType: "cae_relationship_created",
      sourceModule: "CAE",
      sourceRecordId: `${input.partyAId}:${input.partyBId}`,
      metadata: { relationship_type: input.relationshipType },
    });

    const { data, error } = await supabase
      .from("commercial_relationships" as never)
      .insert({
        relationship_type: input.relationshipType,
        party_a_id: input.partyAId,
        party_b_id: input.partyBId,
        company_entity_id: input.companyEntityId ?? null,
        branch_id: input.branchId ?? null,
        country_code: input.countryCode ?? null,
        status: "active",
        valid_from: input.validFrom ?? null,
        valid_to: input.validTo ?? null,
        notice_period_days: input.noticePeriodDays ?? null,
        relationship_manager_id: input.relationshipManagerId ?? null,
        relationship_classification_code: input.relationshipClassificationCode ?? "standard",
        external_reference: input.externalReference ?? null,
        health_score: input.healthScore ?? null,
        renewal_date: input.renewalDate ?? null,
        adapter_source_module: input.adapterSourceModule ?? null,
        adapter_source_record_id: input.adapterSourceRecordId ?? null,
        metadata: { ...input.metadata, business_event_id: event.id },
      } as never)
      .select("*")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    return { ok: true, relationship: mapRow(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getRelationshipById(id: string): Promise<CommercialRelationship | null> {
  try {
    const { data } = await supabase
      .from("commercial_relationships" as never)
      .select("*")
      .eq("id", id as never)
      .maybeSingle();
    return data ? mapRow(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function getRelationshipByAdapter(
  sourceModule: string,
  sourceRecordId: string,
): Promise<CommercialRelationship | null> {
  try {
    const { data } = await supabase
      .from("commercial_relationships" as never)
      .select("*")
      .eq("adapter_source_module", sourceModule as never)
      .eq("adapter_source_record_id", sourceRecordId as never)
      .maybeSingle();
    return data ? mapRow(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function linkAgreementToRelationship(
  agreementId: string,
  relationshipId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("commercial_agreements" as never)
    .update({ relationship_id: relationshipId } as never)
    .eq("id", agreementId as never);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function mapPartyRoleRow(row: Record<string, unknown>): CommercialRelationshipPartyRole {
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

function mapOwnershipRow(row: Record<string, unknown>): CommercialRelationshipOwnership {
  return {
    id: String(row.id),
    relationshipId: String(row.relationship_id),
    subjectFinancialPartyId: String(row.subject_financial_party_id),
    ownershipStatus: row.ownership_status as CommercialRelationshipOwnership["ownershipStatus"],
    protectionLevel: row.protection_level as CommercialRelationshipOwnership["protectionLevel"],
    ownershipRuleCode: (row.ownership_rule_code as string) ?? null,
    validFrom: (row.valid_from as string) ?? null,
    validTo: (row.valid_to as string) ?? null,
    status: row.status as CommercialRelationshipOwnership["status"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapContactRow(row: Record<string, unknown>): CommercialRelationshipContact {
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

export async function listRelationshipPartyRoles(
  relationshipId: string,
): Promise<CommercialRelationshipPartyRole[]> {
  try {
    const { data } = await supabase
      .from("commercial_relationship_party_roles" as never)
      .select("*")
      .eq("relationship_id", relationshipId as never);
    return ((data ?? []) as Record<string, unknown>[]).map(mapPartyRoleRow);
  } catch {
    return [];
  }
}

export async function assignRelationshipPartyRole(input: {
  relationshipId: string;
  financialPartyId: string;
  roleCode: RelationshipPartyRoleCode | string;
  isPrimary?: boolean;
  validFrom?: string;
  validTo?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; role?: CommercialRelationshipPartyRole; error?: string }> {
  const { data, error } = await supabase
    .from("commercial_relationship_party_roles" as never)
    .upsert(
      {
        relationship_id: input.relationshipId,
        financial_party_id: input.financialPartyId,
        role_code: input.roleCode,
        is_primary: input.isPrimary ?? false,
        valid_from: input.validFrom ?? null,
        valid_to: input.validTo ?? null,
        metadata: input.metadata ?? {},
      } as never,
      { onConflict: "relationship_id,financial_party_id,role_code" } as never,
    )
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, role: mapPartyRoleRow(data as Record<string, unknown>) };
}

export async function listRelationshipOwnership(
  relationshipId: string,
): Promise<CommercialRelationshipOwnership[]> {
  try {
    const { data } = await supabase
      .from("commercial_relationship_ownership" as never)
      .select("*")
      .eq("relationship_id", relationshipId as never)
      .eq("status", "active" as never);
    return ((data ?? []) as Record<string, unknown>[]).map(mapOwnershipRow);
  } catch {
    return [];
  }
}

export async function upsertRelationshipOwnership(input: {
  relationshipId: string;
  subjectFinancialPartyId: string;
  ownershipStatus: CommercialRelationshipOwnership["ownershipStatus"];
  protectionLevel?: CommercialRelationshipOwnership["protectionLevel"];
  ownershipRuleCode?: string;
  validFrom?: string;
  validTo?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; ownership?: CommercialRelationshipOwnership; error?: string }> {
  const { data, error } = await supabase
    .from("commercial_relationship_ownership" as never)
    .upsert(
      {
        relationship_id: input.relationshipId,
        subject_financial_party_id: input.subjectFinancialPartyId,
        ownership_status: input.ownershipStatus,
        protection_level: input.protectionLevel ?? "block_settlement",
        ownership_rule_code: input.ownershipRuleCode ?? null,
        valid_from: input.validFrom ?? null,
        valid_to: input.validTo ?? null,
        status: "active",
        metadata: input.metadata ?? {},
      } as never,
      { onConflict: "relationship_id,subject_financial_party_id,ownership_rule_code" } as never,
    )
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, ownership: mapOwnershipRow(data as Record<string, unknown>) };
}

export async function listRelationshipContacts(
  relationshipId: string,
): Promise<CommercialRelationshipContact[]> {
  try {
    const { data } = await supabase
      .from("commercial_relationship_contacts" as never)
      .select("*")
      .eq("relationship_id", relationshipId as never)
      .eq("active", true as never);
    return ((data ?? []) as Record<string, unknown>[]).map(mapContactRow);
  } catch {
    return [];
  }
}

export async function upsertRelationshipContact(input: {
  relationshipId: string;
  contactType: RelationshipContactType;
  fullName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  profileId?: string;
  isPrimary?: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; contact?: CommercialRelationshipContact; error?: string }> {
  const { data, error } = await supabase
    .from("commercial_relationship_contacts" as never)
    .insert({
      relationship_id: input.relationshipId,
      contact_type: input.contactType,
      full_name: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      job_title: input.jobTitle ?? null,
      profile_id: input.profileId ?? null,
      is_primary: input.isPrimary ?? false,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    } as never)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, contact: mapContactRow(data as Record<string, unknown>) };
}
