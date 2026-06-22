import { supabase } from "@/integrations/supabase/client";
import {
  createServiceCase as insertServiceCase,
  type ClientServiceCase,
} from "@/lib/clientServiceCase";
import { resolveServiceDocumentProfile } from "./resolveServiceDocumentProfile";
import {
  seedDefaultDocumentRequirementsForServiceCode,
  seedDefaultDocumentRequirementsIfEmpty,
} from "./seedDefaultDocumentRequirements";

function mapCaseRow(existing: Record<string, unknown>): ClientServiceCase {
  return {
    id: existing.id as string,
    clientId: existing.client_id as string,
    serviceCode: existing.service_code as string,
    pipelineId: (existing.pipeline_id as string | null) ?? null,
    attemptNumber: existing.attempt_number as number,
    status: existing.status as ClientServiceCase["status"],
    outcome: (existing.outcome as ClientServiceCase["outcome"]) ?? null,
    outcomeAt: (existing.outcome_at as string | null) ?? null,
    outcomeBy: (existing.outcome_by as string | null) ?? null,
    outcomeDocumentId: (existing.outcome_document_id as string | null) ?? null,
    refusalDocPending: Boolean(existing.refusal_doc_pending),
    reapplicationOf: (existing.reapplication_of as string | null) ?? null,
    requestedAmount: existing.requested_amount != null ? Number(existing.requested_amount) : null,
    requestedCurrency: (existing.requested_currency as string | null) ?? null,
    institutionRequiredDeposit:
      existing.institution_required_deposit != null
        ? Number(existing.institution_required_deposit)
        : null,
    billingTrigger: (existing.billing_trigger as ClientServiceCase["billingTrigger"]) ?? null,
    institutionDepositReference: (existing.institution_deposit_reference as string | null) ?? null,
    createdAt: existing.created_at as string,
    closedAt: (existing.closed_at as string | null) ?? null,
  };
}

/** Create or reuse open service case and seed default document requirements. */
export async function ensureServiceCaseWithDocumentDefaults(params: {
  clientId: string;
  serviceCode: string;
  pipelineId: string;
  attemptNumber?: number;
}): Promise<ClientServiceCase> {
  const { data: openRows } = await supabase
    .from("client_service_cases")
    .select("*")
    .eq("client_id", params.clientId)
    .eq("service_code", params.serviceCode)
    .eq("status", "open")
    .order("attempt_number", { ascending: false })
    .limit(1);

  if (openRows?.[0]) {
    const existing = mapCaseRow(openRows[0] as Record<string, unknown>);
    await seedDefaultDocumentRequirementsIfEmpty({
      caseId: existing.id,
      serviceCode: params.serviceCode,
    });
    return existing;
  }

  const created = await insertServiceCase({
    clientId: params.clientId,
    serviceCode: params.serviceCode,
    pipelineId: params.pipelineId,
    attemptNumber: params.attemptNumber ?? 1,
  });

  const profile = resolveServiceDocumentProfile(params.serviceCode);
  await supabase
    .from("client_service_cases")
    .update({
      document_profile_type: profile.profileType,
      destination_country: profile.country,
    } as never)
    .eq("id", created.id)
    .then(() => null)
    .catch(() => null);

  await seedDefaultDocumentRequirementsForServiceCode({
    caseId: created.id,
    serviceCode: params.serviceCode,
  });

  return created;
}
