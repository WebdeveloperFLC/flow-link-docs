/**
 * Universal Financial Party Registry — enterprise source of truth for parties.
 * Party type is metadata only; never drives payment logic.
 */
import { supabase } from "@/integrations/supabase/client";
import { createBusinessEvent } from "../foe/businessEventService";
import type { CreateFinancialPartyInput, FinancialParty } from "./types";

function mapRow(row: Record<string, unknown>): FinancialParty {
  return {
    id: String(row.id),
    partyType: String(row.party_type),
    displayName: String(row.display_name),
    sourceModule: (row.source_module as string) ?? null,
    sourceRecordId: (row.source_record_id as string) ?? null,
    companyEntityId: (row.company_entity_id as string) ?? null,
    branchId: (row.branch_id as string) ?? null,
    countryCode: (row.country_code as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    active: row.active !== false,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

export async function resolveOrCreateFinancialParty(
  input: CreateFinancialPartyInput,
): Promise<{ ok: boolean; party?: FinancialParty; error?: string }> {
  if (input.sourceModule && input.sourceRecordId) {
    const existing = await getFinancialPartyBySource(input.sourceModule, input.sourceRecordId);
    if (existing) return { ok: true, party: existing };
  }

  try {
    const { data, error } = await supabase
      .from("financial_parties" as never)
      .insert({
        party_type: input.partyType,
        display_name: input.displayName,
        source_module: input.sourceModule ?? null,
        source_record_id: input.sourceRecordId ?? null,
        company_entity_id: input.companyEntityId ?? null,
        branch_id: input.branchId ?? null,
        country_code: input.countryCode ?? null,
        metadata: input.metadata ?? {},
      } as never)
      .select("*")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    const party = mapRow(data as Record<string, unknown>);

    await createBusinessEvent({
      domain: "generic",
      eventType: "cae_financial_party_registered",
      sourceModule: "CAE",
      sourceRecordId: party.id,
      metadata: { party_type: party.partyType, source_module: party.sourceModule },
    }).catch(() => undefined);

    return { ok: true, party };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getFinancialPartyBySource(
  sourceModule: string,
  sourceRecordId: string,
): Promise<FinancialParty | null> {
  try {
    const { data } = await supabase
      .from("financial_parties" as never)
      .select("*")
      .eq("source_module", sourceModule as never)
      .eq("source_record_id", sourceRecordId as never)
      .maybeSingle();
    return data ? mapRow(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function getFinancialPartyById(id: string): Promise<FinancialParty | null> {
  try {
    const { data } = await supabase
      .from("financial_parties" as never)
      .select("*")
      .eq("id", id as never)
      .maybeSingle();
    return data ? mapRow(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Bridge CRM client → financial party (adapter pattern) */
export async function resolveClientAsFinancialParty(clientId: string): Promise<FinancialParty | null> {
  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, branch")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return null;

  const result = await resolveOrCreateFinancialParty({
    partyType: "client",
    displayName: (client as { full_name?: string }).full_name ?? `Client ${clientId.slice(0, 8)}`,
    sourceModule: "clients",
    sourceRecordId: clientId,
  });
  return result.party ?? null;
}

/** Bridge counselor profile → financial party */
export async function resolveCounselorAsFinancialParty(profileId: string): Promise<FinancialParty | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return null;

  const result = await resolveOrCreateFinancialParty({
    partyType: "consultant",
    displayName: (profile as { full_name?: string }).full_name ?? `Counselor ${profileId.slice(0, 8)}`,
    sourceModule: "profiles",
    sourceRecordId: profileId,
  });
  return result.party ?? null;
}

/** Bridge UPI institution → financial party */
export async function resolveInstitutionAsFinancialParty(institutionId: string): Promise<FinancialParty | null> {
  const { data: inst } = await supabase
    .from("upi_institutions")
    .select("id, name")
    .eq("id", institutionId)
    .maybeSingle();
  if (!inst) return null;

  const result = await resolveOrCreateFinancialParty({
    partyType: "university",
    displayName: (inst as { name?: string }).name ?? `Institution ${institutionId.slice(0, 8)}`,
    sourceModule: "upi_institutions",
    sourceRecordId: institutionId,
  });
  return result.party ?? null;
}

/** Bridge aggregator → financial party */
export async function resolveAggregatorAsFinancialParty(aggregatorId: string): Promise<FinancialParty | null> {
  const { data: agg } = await supabase
    .from("upi_aggregators")
    .select("id, name")
    .eq("id", aggregatorId)
    .maybeSingle();
  if (!agg) return null;

  const result = await resolveOrCreateFinancialParty({
    partyType: "aggregator",
    displayName: (agg as { name?: string }).name ?? `Aggregator ${aggregatorId.slice(0, 8)}`,
    sourceModule: "upi_aggregators",
    sourceRecordId: aggregatorId,
  });
  return result.party ?? null;
}

/** Bridge vendor → financial party */
export async function resolveVendorAsFinancialParty(vendorId: string): Promise<FinancialParty | null> {
  const { data: vendor } = await supabase
    .from("accounting_vendors")
    .select("id, name")
    .eq("id", vendorId)
    .maybeSingle();
  if (!vendor) return null;

  const result = await resolveOrCreateFinancialParty({
    partyType: "vendor",
    displayName: (vendor as { name?: string }).name ?? `Vendor ${vendorId.slice(0, 8)}`,
    sourceModule: "accounting_vendors",
    sourceRecordId: vendorId,
  });
  return result.party ?? null;
}
