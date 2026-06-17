import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  prefillFromLead,
  upsertClientRegistration,
  type ClientDraft,
  type ClientRow,
} from "@/lib/clientRegistration";
import type { Lead } from "@/lib/leads";
import { fetchAllServiceCatalogue } from "@/lib/leads";
import { autoDraftInvoiceForServices } from "@/lib/autoDraftInvoice";
import { ensureFreshSession, AuthExpiredError, PermissionDeniedError } from "@/lib/supabaseSafeInsert";
import { autoAssignPipelineForClient } from "@/lib/stagePipelines";
import { completeClientServiceEnrollment } from "@/lib/service-library/completeClientServiceEnrollment";
import { notifyUsers, resolveCounselorNotificationUserIds } from "@/lib/appNotifications";
import { ensureClientProfileSynced } from "@/lib/clientProfileSync";
import { copyLeadHistoryToClientActivity, appendClientActivityLog } from "@/lib/clientActivityLog";
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

function buildClientDraftFromLead(lead: Lead, leadNotes?: string): ClientDraft {
  const draft = prefillFromLead(lead);
  return {
    ...draft,
    lead_source: lead.lead_source ?? null,
    counselor_notes: leadNotes?.trim() || lead.notes?.trim() || null,
  };
}

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

/**
 * One-click lead → client conversion:
 * creates client, syncs profile, auto draft invoice, pipeline enrollment, marks lead converted (DB trigger).
 */
export async function convertLeadToClient(
  lead: Lead,
  opts: ConvertLeadOptions = {},
): Promise<ConvertLeadResult> {
  if (lead.converted_to_client_id) {
    return {
      clientId: lead.converted_to_client_id,
      registrationNumber: null,
      invoiceLinesCreated: 0,
      alreadyConverted: true,
    };
  }

  const ok = await ensureFreshSession();
  if (!ok) throw new AuthExpiredError("Your session expired. Please sign in again.");

  const draft = buildClientDraftFromLead(lead, opts.leadNotes);
  let saved: ClientRow;
  try {
    saved = await upsertClientRegistration(null, draft);
  } catch (e) {
    if (e instanceof AuthExpiredError || e instanceof PermissionDeniedError) throw e;
    throw e;
  }

  await ensureClientProfileSynced(saved.id).catch((e) =>
    console.warn("[convertLeadToClient] profile sync failed", e),
  );

  await runServiceEnrollment(saved.id, lead, opts);

  let invoiceLinesCreated = 0;
  try {
    const catalogue = await fetchAllServiceCatalogue();
    invoiceLinesCreated = await autoDraftInvoiceForServices(
      saved.id,
      serviceSelectionFromLead(lead),
      catalogue,
    );
  } catch (e) {
    console.warn("[convertLeadToClient] draft invoice failed", e);
    toast.message("Client created — draft invoice could not be generated automatically");
  }

  await notifyLeadConverted(saved.id, lead);

  await copyLeadHistoryToClientActivity(lead.id, saved.id).catch((e) =>
    console.warn("[convertLeadToClient] activity log copy failed", e),
  );
  await appendClientActivityLog({
    clientId: saved.id,
    action: "client_created",
    summary: "Client created from lead",
    newValue: saved.registration_number ?? saved.id,
    metadata: { source_lead_id: lead.id, invoice_lines: invoiceLinesCreated },
  }).catch(() => {});

  return {
    clientId: saved.id,
    registrationNumber: saved.registration_number ?? null,
    invoiceLinesCreated,
    alreadyConverted: false,
  };
}
