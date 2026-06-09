import { supabase } from "@/integrations/supabase/client";
import { joinPhone } from "@/lib/countryCodes";
import { VISA_IMMIGRATION } from "./types";
import {
  resolveSettleAbroadMapping,
  usesSettleAbroadAssessment,
} from "./settleAbroadBridge";

export type NewEligibilityClient = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
  country?: string;
};

function formatPhone(countryCode?: string | null, phone?: string | null): string | null {
  const digits = joinPhone(countryCode, phone);
  if (!digits) return null;
  const cc = String(countryCode ?? "").replace(/\D/g, "");
  const local = String(phone ?? "").replace(/\D/g, "");
  if (cc && local) return `+${cc} ${local}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

async function loadVisaService(libraryId: string) {
  const { data, error } = await supabase
    .from("service_library")
    .select("service, sub_service, service_category")
    .eq("id", libraryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.service_category !== VISA_IMMIGRATION) {
    throw new Error("Eligibility assessment is only available for Visa & Immigration services");
  }
  return data;
}

export type StaffAssessmentResult = {
  sessionId: string;
  clientId: string;
  runner: "settle_abroad" | "service_eligibility";
};

/** Full Settle Abroad questionnaire (CRS / Chancenkarte) linked to a service library item. */
export async function createStaffSettleAbroadSession(params: {
  libraryId: string;
  clientId?: string;
  newClient?: NewEligibilityClient;
}): Promise<StaffAssessmentResult> {
  const mapping = resolveSettleAbroadMapping(params.libraryId);
  if (!mapping) throw new Error("This service does not use the full Settle Abroad assessment");

  const svc = await loadVisaService(params.libraryId);
  let clientId = params.clientId ?? null;

  if (!clientId && params.newClient) {
    const nc = params.newClient;
    const fullName = nc.full_name.trim();
    if (!fullName) throw new Error("Client name required");
    const phone = formatPhone(nc.phone_country_code, nc.phone);
    const { data: client, error: clientErr } = await supabase.rpc("create_client", {
      _full_name: fullName,
      _country: nc.country?.trim() || svc.service || "India",
      _application_type: `${svc.sub_service} — eligibility assessment`,
      _email: nc.email?.trim() || null,
      _phone: phone,
    });
    if (clientErr) throw new Error(clientErr.message);
    clientId = (client as { id: string }).id;
    const ccDigits = nc.phone_country_code?.replace(/\D/g, "") || null;
    if (ccDigits) {
      await supabase
        .from("clients")
        .update({ phone_country_code: `+${ccDigits}`, country_code: ccDigits } as never)
        .eq("id", clientId);
    }
  }
  if (!clientId) throw new Error("Select a client or enter new client details");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: ses, error: sesErr } = await supabase
    .from("assessment_sessions")
    .insert({
      client_id: clientId,
      library_id: params.libraryId,
      assessment_kind: "settle_abroad",
      source: "staff",
      country: mapping.country,
      goal: mapping.goal,
      status: "draft",
      answers: {},
      assigned_counselor_id: user.id,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (sesErr || !ses) throw new Error(sesErr?.message ?? "Could not create session");
  return { sessionId: ses.id, clientId, runner: "settle_abroad" };
}

/** Staff flow — Settle Abroad full assessment or short service eligibility checklist. */
export async function createStaffAssessmentSession(params: {
  libraryId: string;
  clientId?: string;
  newClient?: NewEligibilityClient;
  prefillAnswers?: Record<string, unknown>;
}): Promise<StaffAssessmentResult> {
  if (usesSettleAbroadAssessment(params.libraryId)) {
    return createStaffSettleAbroadSession(params);
  }
  const { sessionId, clientId } = await createStaffEligibilitySession(params);
  return { sessionId, clientId, runner: "service_eligibility" };
}

/** Staff flow — short checklist only (service_eligibility_questions). */
export async function createStaffEligibilitySession(params: {
  libraryId: string;
  clientId?: string;
  newClient?: NewEligibilityClient;
  prefillAnswers?: Record<string, unknown>;
}): Promise<{ sessionId: string; clientId: string }> {
  const svc = await loadVisaService(params.libraryId);

  let clientId = params.clientId ?? null;

  if (!clientId && params.newClient) {
    const nc = params.newClient;
    const fullName = nc.full_name.trim();
    if (!fullName) throw new Error("Client name required");

    const phone = formatPhone(nc.phone_country_code, nc.phone);
    const { data: client, error: clientErr } = await supabase.rpc("create_client", {
      _full_name: fullName,
      _country: nc.country?.trim() || svc.service || "India",
      _application_type: `${svc.sub_service} — eligibility`,
      _email: nc.email?.trim() || null,
      _phone: phone,
    });
    if (clientErr) throw new Error(clientErr.message);

    const row = client as { id: string };
    clientId = row.id;

    const ccDigits = nc.phone_country_code?.replace(/\D/g, "") || null;
    if (ccDigits) {
      await supabase
        .from("clients")
        .update({ phone_country_code: `+${ccDigits}`, country_code: ccDigits } as never)
        .eq("id", clientId);
    }
  }

  if (!clientId) throw new Error("Select a client or enter new client details");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: ses, error: sesErr } = await supabase
    .from("assessment_sessions")
    .insert({
      client_id: clientId,
      library_id: params.libraryId,
      assessment_kind: "service_eligibility",
      source: "staff",
      country: svc.service ?? "Canada",
      goal: "service_eligibility",
      status: "draft",
      answers: params.prefillAnswers ?? {},
      assigned_counselor_id: user.id,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (sesErr || !ses) throw new Error(sesErr?.message ?? "Could not create session");
  return { sessionId: ses.id, clientId };
}

/** Public prospect flow — edge function when deployed, else direct anon insert. */
export async function createPublicEligibilitySession(params: {
  libraryId: string;
  name: string;
  email: string;
  phone?: string | null;
  phone_country_code?: string | null;
}): Promise<{ sessionId: string }> {
  const svc = await loadVisaService(params.libraryId);
  const phone = formatPhone(params.phone_country_code, params.phone);

  const edgeBody = {
    action: "public_create",
    libraryId: params.libraryId,
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    phone,
  };

  const { data, error } = await supabase.functions.invoke("service-eligibility-session", { body: edgeBody });
  if (!error && data?.sessionId) return { sessionId: data.sessionId };

  const token = crypto.randomUUID();
  const { data: ses, error: insErr } = await supabase
    .from("assessment_sessions")
    .insert({
      library_id: params.libraryId,
      assessment_kind: "service_eligibility",
      source: "public_link",
      public_token: token,
      prospect_name: params.name.trim(),
      prospect_email: params.email.trim().toLowerCase(),
      prospect_phone: phone,
      country: svc.service ?? "Canada",
      goal: "service_eligibility",
      status: "draft",
    } as never)
    .select("id")
    .single();

  if (insErr || !ses) {
    const msg = insErr?.message ?? error?.message ?? "Could not start assessment";
    throw new Error(msg);
  }
  return { sessionId: ses.id };
}

export async function savePublicEligibilitySession(params: {
  publicToken: string;
  answers: Record<string, unknown>;
  prospectNotes?: string;
  pendingItems?: unknown[];
  output?: unknown;
  submit?: boolean;
}): Promise<void> {
  const body = {
    action: params.submit ? "public_submit" : "public_save",
    publicToken: params.publicToken,
    answers: params.answers,
    prospectNotes: params.prospectNotes,
    pendingItems: params.pendingItems,
    output: params.output,
  };

  const { error } = await supabase.functions.invoke("service-eligibility-session", { body });
  if (!error) return;

  const patch: Record<string, unknown> = {
    answers: params.answers,
    updated_at: new Date().toISOString(),
    status: params.submit ? "submitted" : "in_progress",
  };
  if (params.prospectNotes != null) patch.prospect_notes = params.prospectNotes;
  if (params.pendingItems != null) patch.pending_items = params.pendingItems;
  if (params.output != null) patch.output = params.output;
  if (params.submit) patch.submitted_at = new Date().toISOString();

  const { error: updErr } = await supabase
    .from("assessment_sessions")
    .update(patch as never)
    .eq("public_token", params.publicToken)
    .eq("assessment_kind", "service_eligibility");

  if (updErr) throw new Error(updErr.message);
}
