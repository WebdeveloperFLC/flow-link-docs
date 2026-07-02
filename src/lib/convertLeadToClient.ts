import { supabase } from "@/integrations/supabase/client";
import { type ClientRow } from "@/lib/clientRegistration";
import type { Lead } from "@/lib/leads";
import { fetchAllServiceCatalogue } from "@/lib/leads";
import { autoDraftInvoiceForServices } from "@/lib/autoDraftInvoice";
import { ensureFreshSession, AuthExpiredError, PermissionDeniedError } from "@/lib/supabaseSafeInsert";
import { autoAssignPipelineForClient } from "@/lib/stagePipelines";
import { completeClientServiceEnrollment } from "@/lib/service-library/completeClientServiceEnrollment";
import { notifyUsers, resolveCounselorNotificationUserIds } from "@/lib/appNotifications";
import { syncClientBackgroundAfterConversion } from "@/lib/clientBackgroundSync";
import { copyLeadHistoryToClientActivity, appendClientActivityLog } from "@/lib/clientActivityLog";
import { createTask } from "@/lib/clientTasks";
import { followupChannelLabel } from "@/lib/leadFollowup";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";

export type ConvertLeadOptions = {
  leadNotes?: string;
  slCountry?: string | null;
  slVisaService?: string | null;
  slServiceLabel?: string | null;
  slLibraryId?: string | null;
  slSubService?: string | null;
  slServiceCategory?: string | null;
};

export type ConversionStepId =
  | "client"
  | "backgroundSync"
  | "serviceEnrollment"
  | "invoice"
  | "notifications"
  | "activityHistory"
  | "followupTask";

export type ConversionStepStatus = {
  id: ConversionStepId;
  label: string;
  status: "success" | "failed" | "skipped";
  error?: string;
};

export type ConvertLeadResult = {
  clientId: string;
  registrationNumber: string | null;
  invoiceLinesCreated: number;
  alreadyConverted: boolean;
  steps: ConversionStepStatus[];
  lead: Lead;
  opts: ConvertLeadOptions;
};

type ConvertLeadRpcResult = {
  client_id: string;
  registration_number: string | null;
  already_converted: boolean;
};

function stepError(e: unknown): string {
  return e instanceof Error ? e.message : "Step failed";
}

function pushStep(
  steps: ConversionStepStatus[],
  id: ConversionStepId,
  label: string,
  status: ConversionStepStatus["status"],
  error?: string,
) {
  steps.push({ id, label, status, ...(error ? { error } : {}) });
}

export function serviceSelectionFromLead(lead: Lead): ServiceSelection {
  return {
    coaching_services: lead.coaching_services ?? [],
    visa_services: lead.visa_services ?? [],
    admission_services: lead.admission_services ?? [],
    allied_services: lead.allied_services ?? [],
    travel_services: lead.travel_financial_services ?? [],
  };
}

export function countLeadServices(lead: Lead): number {
  const sel = serviceSelectionFromLead(lead);
  return (
    (sel.coaching_services?.length ?? 0) +
    (sel.visa_services?.length ?? 0) +
    (sel.admission_services?.length ?? 0) +
    (sel.allied_services?.length ?? 0) +
    (sel.travel_services?.length ?? 0)
  );
}

async function runServiceEnrollment(
  clientId: string,
  lead: Lead,
  opts: ConvertLeadOptions,
): Promise<void> {
  const interestedCountries = lead.interested_countries ?? [];
  const primaryCountry = interestedCountries[0] ?? opts.slCountry ?? null;
  const services = serviceSelectionFromLead(lead);

  if (opts.slLibraryId && (opts.slServiceLabel || opts.slSubService)) {
    await completeClientServiceEnrollment({
      clientId,
      libraryId: opts.slLibraryId,
      country: opts.slCountry ?? primaryCountry,
      serviceTitle: opts.slServiceLabel ?? undefined,
      subService: opts.slSubService ?? undefined,
      serviceCode: opts.slVisaService ?? undefined,
      serviceCategory: opts.slServiceCategory ?? undefined,
      counselorNote: opts.slServiceLabel ? `Service Library application: ${opts.slServiceLabel}` : null,
    });
    return;
  }

  const firstCoaching = services.coaching_services?.[0] ?? null;
  if (firstCoaching?.includes("::")) {
    await completeClientServiceEnrollment({
      clientId,
      serviceCode: firstCoaching,
      country: primaryCountry,
      serviceCategory: "coaching_services",
    });
    return;
  }

  const firstVisa = services.visa_services?.[0] ?? null;
  if (firstVisa?.includes("::")) {
    await completeClientServiceEnrollment({
      clientId,
      serviceCode: firstVisa,
      country: primaryCountry,
    });
    return;
  }

  if (opts.slServiceLabel && opts.slSubService) {
    await autoAssignPipelineForClient({
      clientId,
      country: primaryCountry,
      interestedCountries,
      serviceTitle: opts.slServiceLabel,
      subService: opts.slSubService,
    });
    return;
  }

  await autoAssignPipelineForClient({
    clientId,
    country: primaryCountry,
    interestedCountries,
    serviceCategory: firstVisa,
  });
}

async function notifyLeadConverted(clientId: string, lead: Lead): Promise<void> {
  const { data: cli } = await supabase
    .from("clients")
    .select("assigned_counselor_id, owner_id, full_name")
    .eq("id", clientId)
    .maybeSingle();
  const userIds = resolveCounselorNotificationUserIds(cli, { context: "lead_converted" });
  const name = [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(" ");
  if (userIds.length) {
    await notifyUsers({
      userIds,
      category: "lead_converted",
      title: `Lead converted: ${cli?.full_name ?? name}`,
      link: `/clients/${clientId}`,
      dedupeKey: `lead:${lead.id}:converted`,
    });
  }
}

async function atomicConvertLead(lead: Lead, opts: ConvertLeadOptions): Promise<ConvertLeadRpcResult> {
  const { data, error } = await supabase.rpc("convert_lead_to_client", {
    _lead_id: lead.id,
    _opts: {
      counselor_notes: opts.leadNotes?.trim() || lead.notes?.trim() || null,
    },
  });
  if (error) throw error;
  return data as ConvertLeadRpcResult;
}

async function runPostConversionSteps(
  registered: ClientRow,
  lead: Lead,
  opts: ConvertLeadOptions,
  steps: ConversionStepStatus[],
): Promise<number> {
  try {
    await syncClientBackgroundAfterConversion(registered.id);
    pushStep(steps, "backgroundSync", "Background profile sync", "success");
  } catch (e) {
    console.warn("[convertLeadToClient] background sync failed", e);
    pushStep(steps, "backgroundSync", "Background profile sync", "failed", stepError(e));
  }

  try {
    await runServiceEnrollment(registered.id, lead, opts);
    pushStep(steps, "serviceEnrollment", "Service enrollment", "success");
  } catch (e) {
    console.warn("[convertLeadToClient] service enrollment failed", e);
    pushStep(steps, "serviceEnrollment", "Service enrollment", "failed", stepError(e));
  }

  let invoiceLinesCreated = 0;
  try {
    const catalogue = await fetchAllServiceCatalogue();
    invoiceLinesCreated = await autoDraftInvoiceForServices(
      registered.id,
      serviceSelectionFromLead(lead),
      catalogue,
    );
    pushStep(steps, "invoice", "Draft invoice", "success");
  } catch (e) {
    console.warn("[convertLeadToClient] draft invoice failed", e);
    pushStep(steps, "invoice", "Draft invoice", "failed", stepError(e));
  }

  try {
    await notifyLeadConverted(registered.id, lead);
    pushStep(steps, "notifications", "Team notifications", "success");
  } catch (e) {
    console.warn("[convertLeadToClient] notifications failed", e);
    pushStep(steps, "notifications", "Team notifications", "failed", stepError(e));
  }

  try {
    await copyLeadHistoryToClientActivity(lead.id, registered.id);
    await appendClientActivityLog({
      clientId: registered.id,
      action: "client_created",
      summary: "Client created from lead",
      newValue: registered.registration_number ?? registered.id,
      metadata: {
        source_lead_id: lead.id,
        source_lead_number: lead.lead_number,
        invoice_lines: invoiceLinesCreated,
      },
    });
    pushStep(steps, "activityHistory", "Activity history", "success");
  } catch (e) {
    console.warn("[convertLeadToClient] activity log copy failed", e);
    pushStep(steps, "activityHistory", "Activity history", "failed", stepError(e));
  }

  if (lead.next_followup_at) {
    try {
      const channel = followupChannelLabel(lead.followup_channel);
      const title = lead.followup_note?.trim() || `Follow up (${channel})`;
      await createTask({
        clientId: registered.id,
        title,
        description: lead.followup_note?.trim() || null,
        kind: "reminder",
        dueAt: lead.next_followup_at,
        assignedTo: lead.assigned_counselor_id ?? null,
      });
      pushStep(steps, "followupTask", "Follow-up task", "success");
    } catch (e) {
      console.warn("[convertLeadToClient] follow-up task failed", e);
      pushStep(steps, "followupTask", "Follow-up task", "failed", stepError(e));
    }
  } else {
    pushStep(steps, "followupTask", "Follow-up task", "skipped");
  }

  return invoiceLinesCreated;
}

/**
 * Lead → client conversion:
 * atomic DB RPC (client row, reg #, profile sync, queue close) then enrollment, invoice, notifications.
 */
export async function convertLeadToClient(
  lead: Lead,
  opts: ConvertLeadOptions = {},
): Promise<ConvertLeadResult> {
  const ok = await ensureFreshSession();
  if (!ok) throw new AuthExpiredError("Your session expired. Please sign in again.");

  const steps: ConversionStepStatus[] = [];

  let rpcResult: ConvertLeadRpcResult;
  try {
    rpcResult = await atomicConvertLead(lead, opts);
  } catch (e) {
    if (e instanceof AuthExpiredError || e instanceof PermissionDeniedError) throw e;
    throw e;
  }

  if (rpcResult.already_converted) {
    pushStep(steps, "client", "Client file", "success");
    return {
      clientId: rpcResult.client_id,
      registrationNumber: rpcResult.registration_number ?? null,
      invoiceLinesCreated: 0,
      alreadyConverted: true,
      steps,
      lead,
      opts,
    };
  }

  pushStep(steps, "client", "Client file", "success");

  const registered: ClientRow = {
    id: rpcResult.client_id,
    registration_number: rpcResult.registration_number ?? null,
  };

  const invoiceLinesCreated = await runPostConversionSteps(registered, lead, opts, steps);

  return {
    clientId: registered.id,
    registrationNumber: registered.registration_number ?? null,
    invoiceLinesCreated,
    alreadyConverted: false,
    steps,
    lead,
    opts,
  };
}

export function conversionHasFailures(result: ConvertLeadResult): boolean {
  return result.steps.some((s) => s.status === "failed");
}

export function primaryConversionFailures(result: ConvertLeadResult): ConversionStepStatus[] {
  const primary: ConversionStepId[] = ["backgroundSync", "serviceEnrollment", "invoice"];
  return result.steps.filter((s) => primary.includes(s.id) && s.status === "failed");
}

export async function retryConversionStep(
  result: ConvertLeadResult,
  stepId: ConversionStepId,
): Promise<ConvertLeadResult> {
  const step = result.steps.find((s) => s.id === stepId);
  if (!step || step.status !== "failed") return result;

  const nextSteps = result.steps.map((s) => ({ ...s }));
  const idx = nextSteps.findIndex((s) => s.id === stepId);
  const registered: ClientRow = {
    id: result.clientId,
    registration_number: result.registrationNumber,
  };

  try {
    if (stepId === "backgroundSync") {
      await syncClientBackgroundAfterConversion(result.clientId);
    } else if (stepId === "serviceEnrollment") {
      await runServiceEnrollment(result.clientId, result.lead, result.opts);
    } else if (stepId === "invoice") {
      const catalogue = await fetchAllServiceCatalogue();
      const lines = await autoDraftInvoiceForServices(
        result.clientId,
        serviceSelectionFromLead(result.lead),
        catalogue,
      );
      return {
        ...result,
        invoiceLinesCreated: lines,
        steps: nextSteps.map((s) =>
          s.id === stepId ? { ...s, status: "success" as const, error: undefined } : s,
        ),
      };
    } else if (stepId === "notifications") {
      await notifyLeadConverted(result.clientId, result.lead);
    } else if (stepId === "activityHistory") {
      await copyLeadHistoryToClientActivity(result.lead.id, result.clientId);
      await appendClientActivityLog({
        clientId: result.clientId,
        action: "client_created",
        summary: "Client created from lead",
        newValue: result.registrationNumber ?? result.clientId,
        metadata: {
          source_lead_id: result.lead.id,
          source_lead_number: result.lead.lead_number,
          invoice_lines: result.invoiceLinesCreated,
        },
      });
    } else if (stepId === "followupTask" && result.lead.next_followup_at) {
      const channel = followupChannelLabel(result.lead.followup_channel);
      const title = result.lead.followup_note?.trim() || `Follow up (${channel})`;
      await createTask({
        clientId: result.clientId,
        title,
        description: result.lead.followup_note?.trim() || null,
        kind: "reminder",
        dueAt: result.lead.next_followup_at,
        assignedTo: result.lead.assigned_counselor_id ?? null,
      });
    } else {
      return result;
    }

    nextSteps[idx] = { ...nextSteps[idx], status: "success", error: undefined };
    return { ...result, steps: nextSteps };
  } catch (e) {
    nextSteps[idx] = { ...nextSteps[idx], status: "failed", error: stepError(e) };
    return { ...result, steps: nextSteps };
  }
}
