import { supabase } from "@/integrations/supabase/client";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { collectClientServices } from "@/lib/clientActiveService";
import { fetchCasesForClient, type ClientServiceCase } from "@/lib/clientServiceCase";
import { findCatalogueItemForStoredCode } from "@/lib/service-library/resolveServiceLabel";
import { parseLibraryIdFromServiceCode } from "@/lib/service-library/serviceCodes";
import { appendClientActivityLog } from "@/lib/clientActivityLog";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import { removeStoredServiceCode } from "@/lib/service-library/serviceSelectionMatch";
import {
  assessServiceFinancialDependencies,
  cleanupPreFinancialServiceDrafts,
  preFinancialDraftSummary,
  type FinancialTransferReason,
  type ServiceFinancialDependencies,
} from "@/lib/serviceFinancialDependencies";

export type DocumentDisposition = "move" | "unassign";

export type ServiceRemovalBlockReason = "financial" | "application_submitted" | null;

export interface ServiceRemovalAssessment {
  serviceCode: string;
  serviceLabel: string;
  canRemove: boolean;
  tier: "pre_financial" | "financial";
  blockReason: ServiceRemovalBlockReason;
  blockMessage: string | null;
  draftCleanupSummary: string | null;
  dependencies: ServiceFinancialDependencies;
  linkedRecords: {
    documents: number;
    openCases: number;
    hasFinancialData: boolean;
    hasSubmittedApplication: boolean;
  };
  openCaseIds: string[];
  otherActiveServices: { code: string; label: string; caseId: string | null }[];
}

export interface ExecuteServiceRemovalParams {
  clientId: string;
  serviceCode: string;
  reason?: string | null;
  documentDisposition: DocumentDisposition;
  targetCaseId?: string | null;
  catalogue?: ServiceCatalogueItem[];
}

function serviceCodesMatch(a: string, b: string, catalogue: ServiceCatalogueItem[]): boolean {
  if (a === b) return true;
  const libA = parseLibraryIdFromServiceCode(a);
  const libB = parseLibraryIdFromServiceCode(b);
  if (libA && libB && libA === libB) return true;
  const itemA = findCatalogueItemForStoredCode(a, catalogue);
  const itemB = findCatalogueItemForStoredCode(b, catalogue);
  return Boolean(itemA && itemB && itemA.id === itemB.id);
}

function serviceLabelForCode(code: string, catalogue: ServiceCatalogueItem[]): string {
  const item = findCatalogueItemForStoredCode(code, catalogue);
  return item?.service_name ?? item?.sub_category ?? code;
}

function categoryKeyForCode(code: string, selection: ServiceSelection): keyof ServiceSelection | null {
  if ((selection.visa_services ?? []).includes(code)) return "visa_services";
  if ((selection.coaching_services ?? []).includes(code)) return "coaching_services";
  if ((selection.admission_services ?? []).includes(code)) return "admission_services";
  if ((selection.allied_services ?? []).includes(code)) return "allied_services";
  if ((selection.travel_services ?? []).includes(code)) return "travel_services";
  return null;
}

async function hasSubmittedApplicationForCases(caseIds: string[]): Promise<boolean> {
  if (caseIds.length === 0) return false;

  const { data: milestones } = await supabase
    .from("application_milestones" as never)
    .select("application_submitted_date, client_service_case_id")
    .in("client_service_case_id", caseIds);
  if (
    ((milestones ?? []) as { application_submitted_date?: string | null }[]).some(
      (m) => m.application_submitted_date,
    )
  ) {
    return true;
  }

  const { data: quals } = await supabase
    .from("client_institution_qualifications" as never)
    .select("status, client_service_case_id")
    .in("client_service_case_id", caseIds);
  const submittedStatuses = new Set(["APPLIED", "VISA_FILED", "VISA_APPROVED", "ENROLLED"]);
  if (
    ((quals ?? []) as { status?: string }[]).some((q) =>
      submittedStatuses.has(String(q.status ?? "").toUpperCase()),
    )
  ) {
    return true;
  }

  const { data: stages } = await supabase
    .from("client_stage_completions")
    .select("case_id, stage_id")
    .in("case_id", caseIds);

  if ((stages ?? []).length > 0) {
    const stageIds = [...new Set((stages ?? []).map((s) => (s as { stage_id: string }).stage_id))];
    const { data: pipelineStages } = await supabase
      .from("pipeline_stages")
      .select("id, key")
      .in("id", stageIds);
    const lodgedKeys = new Set(["visa_lodged", "application_submitted"]);
    if (
      ((pipelineStages ?? []) as { key?: string }[]).some((ps) =>
        lodgedKeys.has(String(ps.key ?? "")),
      )
    ) {
      return true;
    }
  }

  return false;
}

export async function assessClientServiceRemoval(params: {
  clientId: string;
  serviceCode: string;
  currentSelection: ServiceSelection;
  catalogue?: ServiceCatalogueItem[];
}): Promise<ServiceRemovalAssessment> {
  const catalogue = params.catalogue ?? (await fetchAllServiceCatalogue().catch(() => []));
  const label = serviceLabelForCode(params.serviceCode, catalogue);
  const cases = await fetchCasesForClient(params.clientId);
  const openCases = cases.filter(
    (c) => serviceCodesMatch(c.serviceCode, params.serviceCode, catalogue) && c.status === "open",
  );
  const openCaseIds = openCases.map((c) => c.id);

  const dependencies = await assessServiceFinancialDependencies({
    clientId: params.clientId,
    serviceCode: params.serviceCode,
    catalogue,
  });

  const hasSubmittedApplication = await hasSubmittedApplicationForCases(openCaseIds);

  const otherCodes = collectClientServices({
    visa_services: params.currentSelection.visa_services,
    coaching_services: params.currentSelection.coaching_services,
    admission_services: params.currentSelection.admission_services,
    allied_services: params.currentSelection.allied_services,
    travel_financial_services: params.currentSelection.travel_services,
  }).filter((c) => !serviceCodesMatch(c, params.serviceCode, catalogue));

  const otherActiveServices = otherCodes.map((code) => {
    const match = cases.find((c) => c.serviceCode === code && c.status === "open");
    return { code, label: serviceLabelForCode(code, catalogue), caseId: match?.id ?? null };
  });

  let blockReason: ServiceRemovalBlockReason = null;
  let blockMessage: string | null = null;

  if (dependencies.tier === "financial" || dependencies.block_removal) {
    blockReason = "financial";
    blockMessage =
      "This service contains financial transactions and cannot be removed. Transfer financials to another service, process a refund, or cancel.";
    await logServiceAudit({
      clientId: params.clientId,
      caseId: openCaseIds[0] ?? null,
      serviceCode: params.serviceCode,
      action: "removal_blocked",
      reason: blockMessage,
      metadata: { dependencies, block_reason: "financial" },
    }).catch(() => null);
  } else if (hasSubmittedApplication) {
    blockReason = "application_submitted";
    blockMessage =
      "An application has already been submitted for this service. You can only change the service status to Cancelled, Withdrawn, Rejected, or Closed.";
  }

  return {
    serviceCode: params.serviceCode,
    serviceLabel: label,
    canRemove: blockReason === null,
    tier: dependencies.tier,
    blockReason,
    blockMessage,
    draftCleanupSummary: preFinancialDraftSummary(dependencies),
    dependencies,
    linkedRecords: {
      documents: dependencies.non_financial.documents.count,
      openCases: openCases.length,
      hasFinancialData: dependencies.has_financial_data,
      hasSubmittedApplication,
    },
    openCaseIds,
    otherActiveServices,
  };
}

async function logServiceAudit(opts: {
  clientId: string;
  caseId?: string | null;
  serviceCode: string;
  action:
    | "added"
    | "modified"
    | "reassigned"
    | "cancelled"
    | "removed"
    | "payment_reassigned"
    | "transfer_requested"
    | "removal_blocked"
    | "draft_invoice_cancelled"
    | "draft_invoice_lines_removed";
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("client_service_audit_log" as never).insert({
    client_id: opts.clientId,
    case_id: opts.caseId ?? null,
    service_code: opts.serviceCode,
    action: opts.action,
    actor_id: u?.user?.id ?? null,
    previous_value: opts.previousValue ?? null,
    new_value: opts.newValue ?? null,
    reason: opts.reason ?? null,
    metadata: opts.metadata ?? {},
  } as never);

  await appendClientActivityLog({
    clientId: opts.clientId,
    action: `service.${opts.action}`,
    summary: `Service ${opts.action}: ${opts.serviceCode}`,
    previousValue:
      typeof opts.previousValue === "string"
        ? opts.previousValue
        : JSON.stringify(opts.previousValue ?? null),
    newValue:
      typeof opts.newValue === "string" ? opts.newValue : JSON.stringify(opts.newValue ?? null),
    metadata: { service_code: opts.serviceCode, reason: opts.reason, ...(opts.metadata ?? {}) },
  }).catch(() => null);
}

export async function executeClientServiceRemoval(
  params: ExecuteServiceRemovalParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const catalogue = params.catalogue ?? (await fetchAllServiceCatalogue().catch(() => []));
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select(
      "visa_services, coaching_services, admission_services, allied_services, travel_financial_services, pipeline_id, application_type",
    )
    .eq("id", params.clientId)
    .maybeSingle();
  if (clientErr) return { ok: false, error: clientErr.message };
  if (!client) return { ok: false, error: "Client not found" };

  const selection: ServiceSelection = {
    visa_services: (client.visa_services as string[] | null) ?? [],
    coaching_services: (client.coaching_services as string[] | null) ?? [],
    admission_services: (client.admission_services as string[] | null) ?? [],
    allied_services: (client.allied_services as string[] | null) ?? [],
    travel_services: (client.travel_financial_services as string[] | null) ?? [],
  };

  const assessment = await assessClientServiceRemoval({
    clientId: params.clientId,
    serviceCode: params.serviceCode,
    currentSelection: selection,
    catalogue,
  });
  if (!assessment.canRemove) {
    return { ok: false, error: assessment.blockMessage ?? "Service cannot be removed." };
  }

  const { data: u } = await supabase.auth.getUser();

  if (assessment.tier === "pre_financial") {
    const cleanup = await cleanupPreFinancialServiceDrafts({
      clientId: params.clientId,
      serviceCode: params.serviceCode,
      catalogue,
      actorId: u?.user?.id ?? null,
      reason: params.reason ?? "service_removed_pre_financial",
    });
    if (!cleanup.ok) {
      return {
        ok: false,
        error: "Could not clean up draft invoices for this service. Removal aborted.",
      };
    }

    for (const invoiceId of cleanup.cancelled_invoices ?? []) {
      await logServiceAudit({
        clientId: params.clientId,
        caseId: assessment.openCaseIds[0] ?? null,
        serviceCode: params.serviceCode,
        action: "draft_invoice_cancelled",
        reason: params.reason ?? cleanup.cancellation_reason ?? null,
        metadata: { invoice_id: invoiceId, cleanup },
      }).catch(() => null);
    }

    for (const mod of cleanup.modified_invoices ?? []) {
      await logServiceAudit({
        clientId: params.clientId,
        caseId: assessment.openCaseIds[0] ?? null,
        serviceCode: params.serviceCode,
        action: "draft_invoice_lines_removed",
        reason: params.reason ?? cleanup.cancellation_reason ?? null,
        metadata: { ...mod, cleanup },
      }).catch(() => null);
    }
  }

  const categoryKey = categoryKeyForCode(params.serviceCode, selection);
  const nextSelection: ServiceSelection = {
    visa_services: removeStoredServiceCode(selection.visa_services ?? [], params.serviceCode, catalogue),
    coaching_services: removeStoredServiceCode(
      selection.coaching_services ?? [],
      params.serviceCode,
      catalogue,
    ),
    admission_services: removeStoredServiceCode(
      selection.admission_services ?? [],
      params.serviceCode,
      catalogue,
    ),
    allied_services: removeStoredServiceCode(selection.allied_services ?? [], params.serviceCode, catalogue),
    travel_services: removeStoredServiceCode(selection.travel_services ?? [], params.serviceCode, catalogue),
  };

  if (categoryKey === null && collectClientServices(nextSelection).length === collectClientServices(selection).length) {
    return { ok: false, error: "Service not found on client file." };
  }

  const now = new Date().toISOString();

  for (const caseId of assessment.openCaseIds) {
    await supabase
      .from("client_service_cases")
      .update({
        status: "closed",
        lifecycle_status: "archived",
        closed_at: now,
        removed_at: now,
        removed_by: u?.user?.id ?? null,
        removal_reason: params.reason ?? null,
      } as never)
      .eq("id", caseId);
  }

  if (assessment.linkedRecords.documents > 0) {
    if (params.documentDisposition === "move" && params.targetCaseId) {
      await supabase
        .from("client_documents")
        .update({ case_id: params.targetCaseId, assignment_status: "assigned" } as never)
        .eq("client_id", params.clientId)
        .in("case_id", assessment.openCaseIds);
    } else {
      await supabase
        .from("client_documents")
        .update({ case_id: null, assignment_status: "unassigned" } as never)
        .eq("client_id", params.clientId)
        .in("case_id", assessment.openCaseIds);
    }
  }

  const patch: Record<string, unknown> = {
    visa_services: nextSelection.visa_services,
    coaching_services: nextSelection.coaching_services,
    admission_services: nextSelection.admission_services,
    allied_services: nextSelection.allied_services,
    travel_financial_services: nextSelection.travel_services,
  };

  const remaining = collectClientServices(patch);
  const activeStillIncludesRemoved = remaining.some(
    (c) => c === params.serviceCode || c.startsWith(params.serviceCode),
  );
  if (!activeStillIncludesRemoved && remaining.length === 0) {
    patch.pipeline_id = null;
    patch.current_stage_id = null;
  }

  const { error: updateErr } = await supabase.from("clients").update(patch).eq("id", params.clientId);
  if (updateErr) return { ok: false, error: updateErr.message };

  await logServiceAudit({
    clientId: params.clientId,
    caseId: assessment.openCaseIds[0] ?? null,
    serviceCode: params.serviceCode,
    action: "removed",
    previousValue: selection,
    newValue: nextSelection,
    reason: params.reason,
    metadata: {
      document_disposition: params.documentDisposition,
      target_case_id: params.targetCaseId ?? null,
      archived_case_ids: assessment.openCaseIds,
      dependency_tier: assessment.tier,
      draft_cleanup: assessment.draftCleanupSummary,
    },
  });

  return { ok: true };
}

export async function recordFinancialTransferRequest(params: {
  clientId: string;
  sourceServiceCode: string;
  targetServiceCode: string;
  targetCaseId: string | null;
  reason: FinancialTransferReason;
  reasonNotes?: string;
  caseId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await logServiceAudit({
      clientId: params.clientId,
      caseId: params.caseId ?? params.targetCaseId ?? null,
      serviceCode: params.sourceServiceCode,
      action: "transfer_requested",
      reason: params.reasonNotes?.trim() || params.reason,
      metadata: {
        target_service_code: params.targetServiceCode,
        target_case_id: params.targetCaseId,
        transfer_reason: params.reason,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to record transfer request" };
  }
}

export function diffRemovedServiceCodes(
  before: ServiceSelection,
  after: ServiceSelection,
  catalogue: ServiceCatalogueItem[],
): string[] {
  const removed: string[] = [];
  const keys: (keyof ServiceSelection)[] = [
    "visa_services",
    "coaching_services",
    "admission_services",
    "allied_services",
    "travel_services",
  ];
  for (const key of keys) {
    const prev = new Set(before[key] ?? []);
    const next = new Set(after[key] ?? []);
    for (const code of prev) {
      if (!next.has(code)) removed.push(code);
    }
  }
  const seen = new Set<string>();
  return removed.filter((code) => {
    const norm = findCatalogueItemForStoredCode(code, catalogue)?.service_code ?? code;
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

export type { ClientServiceCase };
