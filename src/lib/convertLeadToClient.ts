import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

export type ConvertLeadResult = {
  clientId: string;
  registrationNumber: string | null;
  invoiceLinesCreated: number;
  alreadyConverted: boolean;
};

type ConvertLeadRpcResult = {
  client_id: string;
  registration_number: string | null;
  already_converted: boolean;
};

function serviceSelectionFromLead(lead: Lead): ServiceSelection {
  return {
    coaching_services: lead.coaching_services ?? [],
    visa_services: lead.visa_services ?? [],
    admission_services: lead.admission_services ?? [],
    allied_services: lead.allied_services ?? [],
    travel_services: lead.travel_financial_services ?? [],
  };
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
  try {
    const { data: cli } = await supabase
      .from("clients")
      .select("assigned_counselor_id, owner_id, full_name")
      .eq("id", clientId)
      .maybeSingle();
    const userIds = resolveCounselorNotificationUserIds(cli, { context: "lead_converted" });
    const name = [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(" ");
    if (userIds.length) {
      notifyUsers({
        userIds,
        category: "lead_converted",
        title: `Lead converted: ${cli?.full_name ?? name}`,
        link: `/clients/${clientId}`,
        dedupeKey: `lead:${lead.id}:converted`,
      });
    }
  } catch {
    /* best-effort */
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

  let rpcResult: ConvertLeadRpcResult;
  try {
    rpcResult = await atomicConvertLead(lead, opts);
  } catch (e) {
    if (e instanceof AuthExpiredError || e instanceof PermissionDeniedError) throw e;
    throw e;
  }

  if (rpcResult.already_converted) {
    return {
      clientId: rpcResult.client_id,
      registrationNumber: rpcResult.registration_number ?? null,
      invoiceLinesCreated: 0,
      alreadyConverted: true,
    };
  }

  const registered: ClientRow = {
    id: rpcResult.client_id,
    registration_number: rpcResult.registration_number ?? null,
  };

  try {
    await syncClientBackgroundAfterConversion(registered.id);
  } catch (e) {
    console.warn("[convertLeadToClient] background sync failed", e);
    toast.message("Client created — background education sync failed; open the profile to verify.");
  }

  try {
    await runServiceEnrollment(registered.id, lead, opts);
  } catch (e) {
    console.warn("[convertLeadToClient] service enrollment failed", e);
    toast.message("Client created — service enrollment could not be completed automatically");
  }

  let invoiceLinesCreated = 0;
  try {
    const catalogue = await fetchAllServiceCatalogue();
    invoiceLinesCreated = await autoDraftInvoiceForServices(
      registered.id,
      serviceSelectionFromLead(lead),
      catalogue,
    );
  } catch (e) {
    console.warn("[convertLeadToClient] draft invoice failed", e);
    toast.message("Client created — draft invoice could not be generated automatically");
  }

  await notifyLeadConverted(registered.id, lead);

  await copyLeadHistoryToClientActivity(lead.id, registered.id).catch((e) =>
    console.warn("[convertLeadToClient] activity log copy failed", e),
  );
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
  }).catch(() => {});

  if (lead.next_followup_at) {
    const channel = followupChannelLabel(lead.followup_channel);
    const title = lead.followup_note?.trim() || `Follow up (${channel})`;
    await createTask({
      clientId: registered.id,
      title,
      description: lead.followup_note?.trim() || null,
      kind: "reminder",
      dueAt: lead.next_followup_at,
      assignedTo: lead.assigned_counselor_id ?? null,
    }).catch((e) => console.warn("[convertLeadToClient] follow-up task failed", e));
  }

  return {
    clientId: registered.id,
    registrationNumber: registered.registration_number ?? null,
    invoiceLinesCreated,
    alreadyConverted: false,
  };
}
