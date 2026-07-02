/**
 * Commercial Agreement Registry — universal agreement master data.
 * Existing UPI/Incentive tables remain; use adapter_source_* for linkage.
 */
import { supabase } from "@/integrations/supabase/client";
import { createBusinessEvent } from "../foe/businessEventService";
import type {
  AgreementPartyRole,
  CommercialAgreement,
  CommercialAgreementTemplate,
  CommercialAgreementVersion,
  CreateAgreementFromTemplateInput,
  CreateAgreementVersionInput,
} from "./types";

function mapAgreement(row: Record<string, unknown>): CommercialAgreement {
  return {
    id: String(row.id),
    agreementNumber: (row.agreement_number as string) ?? null,
    templateId: (row.template_id as string) ?? null,
    agreementType: String(row.agreement_type),
    status: row.status as CommercialAgreement["status"],
    currentVersionId: (row.current_version_id as string) ?? null,
    priority: Number(row.priority ?? 100),
    companyEntityId: (row.company_entity_id as string) ?? null,
    branchId: (row.branch_id as string) ?? null,
    countryCode: (row.country_code as string) ?? null,
    currency: String(row.currency ?? "INR"),
    validFrom: (row.valid_from as string) ?? null,
    validTo: (row.valid_to as string) ?? null,
    adapterSourceModule: (row.adapter_source_module as string) ?? null,
    adapterSourceRecordId: (row.adapter_source_record_id as string) ?? null,
    relationshipId: (row.relationship_id as string) ?? null,
    workflowInstanceId: (row.workflow_instance_id as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
  };
}

function mapVersion(row: Record<string, unknown>): CommercialAgreementVersion {
  return {
    id: String(row.id),
    agreementId: String(row.agreement_id),
    versionNumber: Number(row.version_number),
    status: row.status as CommercialAgreementVersion["status"],
    paymentBasis: (row.payment_basis as string) ?? null,
    settlementCycle: (row.settlement_cycle as string) ?? null,
    rulesJson: (row.rules_json as Record<string, unknown>) ?? {},
    taxRulesJson: (row.tax_rules_json as Record<string, unknown>) ?? {},
    paymentMethod: (row.payment_method as string) ?? null,
    effectiveFrom: String(row.effective_from),
    effectiveTo: (row.effective_to as string) ?? null,
    changeSummary: (row.change_summary as string) ?? null,
  };
}

export async function getAgreementTemplateByCode(
  templateCode: string,
): Promise<CommercialAgreementTemplate | null> {
  try {
    const { data } = await supabase
      .from("commercial_agreement_templates" as never)
      .select("*")
      .eq("template_code", templateCode as never)
      .eq("active", true as never)
      .maybeSingle();
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      templateCode: String(row.template_code),
      name: String(row.name),
      agreementType: String(row.agreement_type),
      description: (row.description as string) ?? null,
      defaultCurrency: String(row.default_currency ?? "INR"),
      defaultPaymentBasis: (row.default_payment_basis as string) ?? null,
      defaultSettlementCycle: (row.default_settlement_cycle as string) ?? null,
      defaultRules: (row.default_rules as Record<string, unknown>) ?? {},
      priority: Number(row.priority ?? 100),
      active: row.active !== false,
    };
  } catch {
    return null;
  }
}

export async function createAgreementFromTemplate(
  input: CreateAgreementFromTemplateInput,
): Promise<{ ok: boolean; agreement?: CommercialAgreement; error?: string }> {
  const template = await getAgreementTemplateByCode(input.templateCode);
  if (!template) return { ok: false, error: `Template not found: ${input.templateCode}` };

  try {
    const event = await createBusinessEvent({
      domain: "generic",
      eventType: "cae_agreement_draft_created",
      sourceModule: "CAE",
      sourceRecordId: input.templateCode,
      createdBy: input.createdBy ?? null,
      metadata: { template_code: input.templateCode },
    });

    const { data, error } = await supabase
      .from("commercial_agreements" as never)
      .insert({
        template_id: template.id,
        agreement_type: input.agreementType ?? template.agreementType,
        status: "draft",
        priority: template.priority,
        company_entity_id: input.companyEntityId ?? null,
        branch_id: input.branchId ?? null,
        country_code: input.countryCode ?? null,
        currency: input.currency ?? template.defaultCurrency,
        valid_from: input.validFrom ?? null,
        valid_to: input.validTo ?? null,
        adapter_source_module: input.adapterSourceModule ?? null,
        adapter_source_record_id: input.adapterSourceRecordId ?? null,
        business_event_id: event.id,
        created_by: input.createdBy ?? null,
      } as never)
      .select("*")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    const agreement = mapAgreement(data as Record<string, unknown>);

    if (input.partyIds?.length) {
      for (const p of input.partyIds) {
        await linkPartyToAgreement(agreement.id, p.financialPartyId, p.role, p.isPrimary);
      }
    }

    return { ok: true, agreement };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createAgreementVersion(
  input: CreateAgreementVersionInput,
): Promise<{ ok: boolean; version?: CommercialAgreementVersion; error?: string }> {
  try {
    const { data: latest } = await supabase
      .from("commercial_agreement_versions" as never)
      .select("version_number")
      .eq("agreement_id", input.agreementId as never)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = ((latest as { version_number?: number } | null)?.version_number ?? 0) + 1;

    const { data, error } = await supabase
      .from("commercial_agreement_versions" as never)
      .insert({
        agreement_id: input.agreementId,
        version_number: nextVersion,
        status: "draft",
        payment_basis: input.paymentBasis ?? null,
        settlement_cycle: input.settlementCycle ?? null,
        rules_json: input.rulesJson ?? {},
        tax_rules_json: input.taxRulesJson ?? {},
        payment_method: input.paymentMethod ?? null,
        effective_from: input.effectiveFrom,
        effective_to: input.effectiveTo ?? null,
        change_summary: input.changeSummary ?? null,
        created_by: input.createdBy ?? null,
      } as never)
      .select("*")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    return { ok: true, version: mapVersion(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function linkPartyToAgreement(
  agreementId: string,
  financialPartyId: string,
  role: AgreementPartyRole,
  isPrimary = false,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("commercial_agreement_parties" as never).insert({
      agreement_id: agreementId,
      financial_party_id: financialPartyId,
      party_role: role,
      is_primary: isPrimary,
    } as never);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getActiveAgreementsForParty(
  financialPartyId: string,
  asOfDate?: string,
): Promise<CommercialAgreement[]> {
  const asOf = asOfDate ?? new Date().toISOString().slice(0, 10);
  try {
    const { data: links } = await supabase
      .from("commercial_agreement_parties" as never)
      .select("agreement_id")
      .eq("financial_party_id", financialPartyId as never);

    const ids = ((links ?? []) as { agreement_id: string }[]).map((l) => l.agreement_id);
    if (!ids.length) return [];

    const { data } = await supabase
      .from("commercial_agreements" as never)
      .select("*")
      .in("id", ids as never)
      .eq("status", "active" as never)
      .lte("valid_from", asOf as never)
      .or(`valid_to.is.null,valid_to.gte.${asOf}` as never);

    return ((data ?? []) as Record<string, unknown>[]).map(mapAgreement);
  } catch {
    return [];
  }
}

export async function resolveAgreementVersionAtDate(
  agreementId: string,
  asOfDate?: string,
): Promise<CommercialAgreementVersion | null> {
  try {
    const { data, error } = await supabase.rpc("fn_cae_resolve_agreement_version" as never, {
      p_agreement_id: agreementId,
      p_as_of: asOfDate ?? new Date().toISOString().slice(0, 10),
    } as never);
    if (error || !data) return null;

    const versionId = data as string;
    const { data: row } = await supabase
      .from("commercial_agreement_versions" as never)
      .select("*")
      .eq("id", versionId as never)
      .maybeSingle();
    return row ? mapVersion(row as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function getAgreementByAdapter(
  sourceModule: string,
  sourceRecordId: string,
): Promise<CommercialAgreement | null> {
  try {
    const { data } = await supabase
      .from("commercial_agreements" as never)
      .select("*")
      .eq("adapter_source_module", sourceModule as never)
      .eq("adapter_source_record_id", sourceRecordId as never)
      .maybeSingle();
    return data ? mapAgreement(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
