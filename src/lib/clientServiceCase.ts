import { supabase } from "@/integrations/supabase/client";
import { seedDefaultDocumentRequirementsForServiceCode } from "@/lib/documentWorkflow/seedDefaultDocumentRequirements";

export type CaseStatus = "open" | "closed";
export type CaseOutcome = "approved" | "refused" | "withdrawn";

import type { BillingTrigger } from "@/lib/serviceBilling";

export type ClientServiceCase = {
  id: string;
  clientId: string;
  serviceCode: string;
  pipelineId: string | null;
  attemptNumber: number;
  status: CaseStatus;
  outcome: CaseOutcome | null;
  outcomeAt: string | null;
  outcomeBy: string | null;
  outcomeDocumentId: string | null;
  refusalDocPending: boolean;
  reapplicationOf: string | null;
  requestedAmount: number | null;
  requestedCurrency: string | null;
  institutionRequiredDeposit: number | null;
  billingTrigger: BillingTrigger | null;
  institutionDepositReference: string | null;
  createdAt: string;
  closedAt: string | null;
};

function mapRow(r: Record<string, unknown>): ClientServiceCase {
  return {
    id: r.id as string,
    clientId: r.client_id as string,
    serviceCode: r.service_code as string,
    pipelineId: (r.pipeline_id as string | null) ?? null,
    attemptNumber: r.attempt_number as number,
    status: r.status as CaseStatus,
    outcome: (r.outcome as CaseOutcome | null) ?? null,
    outcomeAt: (r.outcome_at as string | null) ?? null,
    outcomeBy: (r.outcome_by as string | null) ?? null,
    outcomeDocumentId: (r.outcome_document_id as string | null) ?? null,
    refusalDocPending: Boolean(r.refusal_doc_pending),
    reapplicationOf: (r.reapplication_of as string | null) ?? null,
    requestedAmount: r.requested_amount != null ? Number(r.requested_amount) : null,
    requestedCurrency: (r.requested_currency as string | null) ?? null,
    institutionRequiredDeposit:
      r.institution_required_deposit != null ? Number(r.institution_required_deposit) : null,
    billingTrigger: (r.billing_trigger as BillingTrigger | null) ?? null,
    institutionDepositReference: (r.institution_deposit_reference as string | null) ?? null,
    createdAt: r.created_at as string,
    closedAt: (r.closed_at as string | null) ?? null,
  };
}

export async function fetchServiceCase(caseId: string): Promise<ClientServiceCase | null> {
  const { data } = await supabase
    .from("client_service_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function fetchCasesForClient(clientId: string): Promise<ClientServiceCase[]> {
  const { data } = await supabase
    .from("client_service_cases")
    .select("*")
    .eq("client_id", clientId)
    .order("service_code")
    .order("attempt_number", { ascending: true });
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

/** Resolve active case: explicit id, else latest open for service, else latest attempt. */
export async function resolveActiveServiceCase(params: {
  clientId: string;
  serviceCode: string | null;
  caseIdFromUrl?: string | null;
  pipelineId?: string | null;
}): Promise<ClientServiceCase | null> {
  if (params.caseIdFromUrl) {
    const explicit = await fetchServiceCase(params.caseIdFromUrl);
    if (explicit && explicit.clientId === params.clientId) return explicit;
  }

  if (!params.serviceCode) {
    const { data } = await supabase
      .from("client_service_cases")
      .select("*")
      .eq("client_id", params.clientId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? mapRow(data as Record<string, unknown>) : null;
  }

  const { data: openRows } = await supabase
    .from("client_service_cases")
    .select("*")
    .eq("client_id", params.clientId)
    .eq("service_code", params.serviceCode)
    .eq("status", "open")
    .order("attempt_number", { ascending: false })
    .limit(1);

  if (openRows?.[0]) return mapRow(openRows[0] as Record<string, unknown>);

  const { data: latest } = await supabase
    .from("client_service_cases")
    .select("*")
    .eq("client_id", params.clientId)
    .eq("service_code", params.serviceCode)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) return mapRow(latest as Record<string, unknown>);

  if (params.pipelineId) {
    const created = await createServiceCase({
      clientId: params.clientId,
      serviceCode: params.serviceCode,
      pipelineId: params.pipelineId,
      attemptNumber: 1,
    });
    await seedDefaultDocumentRequirementsForServiceCode({
      caseId: created.id,
      serviceCode: params.serviceCode,
    }).catch(() => null);
    return created;
  }

  return null;
}

export async function createServiceCase(params: {
  clientId: string;
  serviceCode: string;
  pipelineId: string | null;
  attemptNumber: number;
  reapplicationOf?: string | null;
}): Promise<ClientServiceCase> {
  const { data, error } = await supabase
    .from("client_service_cases")
    .insert({
      client_id: params.clientId,
      service_code: params.serviceCode,
      pipeline_id: params.pipelineId,
      attempt_number: params.attemptNumber,
      reapplication_of: params.reapplicationOf ?? null,
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

export async function nextAttemptNumber(clientId: string, serviceCode: string): Promise<number> {
  const { data } = await supabase
    .from("client_service_cases")
    .select("attempt_number")
    .eq("client_id", clientId)
    .eq("service_code", serviceCode)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { attempt_number?: number } | null)?.attempt_number ?? 0) + 1;
}

export function caseIsClosed(serviceCase: ClientServiceCase | null): boolean {
  return serviceCase?.status === "closed";
}

export function caseAttemptLabel(serviceCase: ClientServiceCase, serviceLabel?: string | null): string {
  const base = serviceLabel ?? serviceCase.serviceCode;
  return serviceCase.attemptNumber > 1 ? `${base} · Attempt ${serviceCase.attemptNumber}` : base;
}

export async function updateCaseBillingProfile(params: {
  caseId: string;
  requestedAmount?: number | null;
  requestedCurrency?: string | null;
  institutionRequiredDeposit?: number | null;
  billingTrigger?: BillingTrigger | null;
  institutionDepositReference?: string | null;
  requestedSource?: string;
}): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const patch: Record<string, unknown> = {};
  if (params.requestedAmount !== undefined) {
    patch.requested_amount = params.requestedAmount;
    patch.requested_set_at = new Date().toISOString();
    patch.requested_set_by = u?.user?.id ?? null;
    patch.requested_source = params.requestedSource ?? "ACCOUNTS_MANUAL";
  }
  if (params.requestedCurrency !== undefined) patch.requested_currency = params.requestedCurrency;
  if (params.institutionRequiredDeposit !== undefined) {
    patch.institution_required_deposit = params.institutionRequiredDeposit;
  }
  if (params.billingTrigger !== undefined) patch.billing_trigger = params.billingTrigger;
  if (params.institutionDepositReference !== undefined) {
    patch.institution_deposit_reference = params.institutionDepositReference;
  }
  const { data: cs, error } = await supabase
    .from("client_service_cases")
    .update(patch as never)
    .eq("id", params.caseId)
    .select("client_id")
    .single();
  if (error) throw error;
  const clientId = (cs as { client_id?: string })?.client_id;
  if (clientId && params.requestedAmount !== undefined) {
    await supabase.from("client_service_billing_events" as never).insert({
      case_id: params.caseId,
      client_id: clientId,
      event_type: "REQUESTED_SET",
      amount: params.requestedAmount,
      currency: params.requestedCurrency ?? null,
      actor_id: u?.user?.id ?? null,
      metadata: { source: params.requestedSource ?? "ACCOUNTS_MANUAL" },
    } as never);
  }
}

/** Seed requested amount from catalogue fee when case has none. */
export async function ensureCaseRequestedFromCatalogue(params: {
  caseId: string;
  feeCad: number | null;
  feeInr: number | null;
  currency: string;
}): Promise<number | null> {
  const { data: row } = await supabase
    .from("client_service_cases")
    .select("requested_amount, requested_currency")
    .eq("id", params.caseId)
    .maybeSingle();
  if ((row as { requested_amount?: number | null })?.requested_amount != null) {
    return Number((row as { requested_amount: number }).requested_amount);
  }
  const fee =
    params.currency === "CAD"
      ? params.feeCad
      : params.currency === "USD"
        ? params.feeCad
        : params.feeInr;
  if (fee == null || fee <= 0) return null;
  await updateCaseBillingProfile({
    caseId: params.caseId,
    requestedAmount: fee,
    requestedCurrency: params.currency,
    requestedSource: "CATALOGUE_DEFAULT",
  });
  return fee;
}
