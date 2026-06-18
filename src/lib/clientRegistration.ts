import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/leads";
import { leadToBackgroundState } from "@/lib/leadBackground";
import { EMPTY_LANGUAGE_TESTS, type LanguageTestsValue } from "@/lib/languageTests";
import { ensureClientProfileSynced } from "@/lib/clientProfileSync";
import { runWithAuthRetry } from "@/lib/supabaseSafeInsert";

export interface FamilyMember extends FamilyMemberExtras {
  id: string;
  primary_client_id: string | null;
  primary_lead_id: string | null;
  relationship: "spouse" | "child" | "parent" | "sibling" | "other";
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  application_mode: "together" | "separate_later";
  visa_services: string[];
  separate_lead_id: string | null;
  separate_applied_at: string | null;
  notes: string | null;
}

export interface EducationEntry {
  level?: string;
  institution?: string;
  year?: string | null;
  percentage_cgpa?: string;
  country?: string;
  specialization?: string;
}

export interface ExperienceEntry {
  company?: string;
  role?: string;
  start_date?: string | null;
  end_date?: string | null;
  currently_working?: boolean;
  country?: string;
  description?: string;
}

export interface FamilyMemberExtras {
  last_education?: string | null;
  institution_name?: string | null;
  year_of_passing?: string | null;
  percentage_cgpa?: string | null;
  english_test?: string | null;
  english_overall?: string | null;
  english_test_date?: string | null;
  english_test_expiry?: string | null;
  english_sections?: Record<string, string>;
  other_tests?: Array<{ type: string; score?: string; date?: string; sections?: Record<string, string> }>;
  education_history?: EducationEntry[];
  work_experience?: ExperienceEntry[];
}

export type FamilyDraft = Partial<Omit<FamilyMember, "id">> & {
  relationship: FamilyMember["relationship"];
  first_name: string;
  last_name: string;
};

export interface ClientRow {
  id: string;
  registration_number?: string | null;
  application_id?: string | null;
  source_lead_id?: string | null;
  source_lead_number?: string | null;
  registered_at?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  email?: string | null;
  email_alternate?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
  phone_alternate?: string | null;
  phone_alternate_country_code?: string | null;
  country?: string | null;
  country_of_citizenship?: string | null;
  country_of_residence?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  national_id_last4?: string | null;
  pan_number?: string | null;
  tax_id?: string | null;
  last_education?: string | null;
  last_education_other?: string | null;
  institution_name?: string | null;
  year_of_passing?: string | null;
  percentage_cgpa?: string | null;
  english_test?: string | null;
  english_overall?: string | null;
  english_test_date?: string | null;
  english_test_expiry?: string | null;
  other_tests?: Array<{ type: string; score?: string; date?: string; sections?: Record<string, string> }>;
  english_sections?: Record<string, string>;
  education_history?: EducationEntry[];
  work_experience?: ExperienceEntry[];
  language_tests?: LanguageTestsValue;
  branch?: string | null;
  department?: string | null;
  assigned_counselor_id?: string | null;
  intake?: string | null;
  interested_countries?: string[];
  client_type?: string | null;
  billing_entity?: string | null;
  payment_terms?: string | null;
  workflow_template_id?: string | null;
  counselor_notes?: string | null;
  counselor_notes_locked?: boolean;
  coaching_services?: string[];
  visa_services?: string[];
  admission_services?: string[];
  allied_services?: string[];
  travel_financial_services?: string[];
  service_fees?: Record<string, { amount: number; complimentary?: boolean; currency?: string }>;
  application_type?: string | null;
  sponsor?: string | null;
  sponsor_other?: string | null;
  start_timeline?: string | null;
  has_budget?: string | null;
  budget_currency?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  lead_source?: string | null;
  lead_temperature?: string | null;
  /** Legacy scalar budget (Overview); populated from journey range on conversion. */
  budget?: number | null;
}

export type ClientDraft = Partial<Omit<ClientRow, "id" | "registration_number" | "application_id">>;

/** Prefill a client draft from a lead row. */
export function prefillFromLead(lead: Lead): ClientDraft {
  const visaCode = (lead.visa_services && lead.visa_services[0]) || "";
  const bg = leadToBackgroundState(lead);
  let education_history = [...(bg.education_history ?? [])];
  if (!education_history.length && lead.last_education) {
    education_history = [{ level: lead.last_education }];
  } else if (lead.last_education && education_history[0] && !education_history[0].level) {
    education_history[0] = { ...education_history[0], level: lead.last_education };
  }
  const e0 = education_history[0];
  const interested = lead.interested_countries ?? [];
  const budgetMin = lead.budget_min ?? null;
  const budgetMax = lead.budget_max ?? null;
  return {
    source_lead_id: lead.id,
    first_name: lead.first_name,
    middle_name: lead.middle_name ?? null,
    last_name: lead.last_name,
    full_name: [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(" "),
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    phone_country_code: lead.phone_country_code ?? null,
    gender: lead.gender ?? null,
    marital_status: lead.marital_status ?? null,
    country_of_citizenship: lead.country_of_citizenship ?? null,
    country_of_residence: lead.country_of_residence ?? null,
    country: lead.country_of_residence ?? "India",
    last_education: lead.last_education ?? e0?.level ?? null,
    last_education_other: lead.last_education_other ?? null,
    institution_name: e0?.institution ?? null,
    year_of_passing: e0?.year ?? null,
    percentage_cgpa: e0?.percentage_cgpa ?? null,
    education_history,
    english_test: bg.english_test ?? null,
    english_overall: bg.english_overall ?? null,
    english_test_date: bg.english_test_date ?? null,
    english_test_expiry: bg.english_test_expiry ?? null,
    english_sections: bg.english_sections ?? {},
    other_tests: bg.other_tests ?? [],
    work_experience: bg.work_experience ?? [],
    language_tests: bg.language_tests ?? EMPTY_LANGUAGE_TESTS,
    interested_countries: interested,
    branch: lead.branch ?? null,
    department: lead.department ?? null,
    assigned_counselor_id: lead.assigned_counselor_id ?? null,
    owner_id: lead.assigned_counselor_id ?? null,
    coaching_services: lead.coaching_services ?? [],
    visa_services: lead.visa_services ?? [],
    admission_services: lead.admission_services ?? [],
    allied_services: lead.allied_services ?? [],
    travel_financial_services: lead.travel_financial_services ?? [],
    application_type: visaCode.includes("::") ? "Visa application" : visaCode || "Student Visa",
    sponsor: lead.sponsor ?? null,
    sponsor_other: lead.sponsor_other ?? null,
    start_timeline: lead.start_timeline ?? null,
    has_budget: lead.has_budget ?? null,
    budget_currency: lead.budget_currency ?? "INR",
    budget_min: budgetMin,
    budget_max: budgetMax,
    budget:
      lead.has_budget === "yes" && (budgetMin != null || budgetMax != null)
        ? (budgetMax ?? budgetMin)
        : null,
    lead_source: lead.lead_source ?? null,
    lead_temperature:
      lead.lead_temperature ??
      (lead.is_cold_pool || lead.lead_type === "cold" ? "cold" : "warm"),
    next_followup_at: lead.next_followup_at ?? null,
  };
}

export async function upsertClientRegistration(
  id: string | null,
  patch: ClientDraft,
): Promise<ClientRow> {
  // Build full_name from first/middle/last when present.
  const fn = (patch.first_name ?? "").trim();
  const mn = (patch.middle_name ?? "").trim();
  const ln = (patch.last_name ?? "").trim();
  const composedName = [fn, mn, ln].filter(Boolean).join(" ");
  const body: Record<string, unknown> = { ...patch };
  if (composedName) body.full_name = composedName;
  // Keep legacy scalar education fields in sync with education_history[0]
  // so older reads, exports and AI summaries continue to work.
  const eh = (patch.education_history ?? []) as EducationEntry[];
  if (eh.length > 0) {
    const e0 = eh[0];
    if (e0.level !== undefined) body.last_education = e0.level ?? null;
    if (e0.institution !== undefined) body.institution_name = e0.institution ?? null;
    if (e0.year !== undefined) body.year_of_passing = e0.year ?? null;
    if (e0.percentage_cgpa !== undefined) body.percentage_cgpa = e0.percentage_cgpa ?? null;
  }
  // clients table requires NOT NULL country and application_type at insert time.
  if (!id) {
    if (!body.country) body.country = "India";
    if (!body.application_type) body.application_type = "Student Visa";
  }
  // Strip null keys that the DB requires non-null at insert
  if (!id) {
    if (!composedName) throw new Error("First and last name required to save");
  }

  if (id) {
    const data = await runWithAuthRetry(() =>
      supabase.from("clients").update(body as never).eq("id", id).select().single(),
      { table: "clients", operation: "update" },
    );
    const row = data as unknown as ClientRow;
    await ensureClientProfileSynced(row.id).catch((e) =>
      console.warn("[upsertClientRegistration] profile sync failed", e),
    );
    return row;
  }
  const data = await runWithAuthRetry(() =>
    supabase.from("clients").insert([body as never]).select().single(),
    { table: "clients", operation: "insert" },
  );
  const row = data as unknown as ClientRow;
  await ensureClientProfileSynced(row.id).catch((e) =>
    console.warn("[upsertClientRegistration] profile sync failed", e),
  );
  return row;
}

export async function fetchClient(id: string): Promise<ClientRow | null> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as ClientRow | null;
}

/** Assign FL-YYYY-NNNN when formal registration completes (invoice / explicit step). Idempotent. */
export async function assignClientRegistrationNumber(clientId: string): Promise<ClientRow> {
  const { data, error } = await supabase.rpc("assign_client_registration_number", {
    _client_id: clientId,
  });
  if (error) throw error;
  return data as unknown as ClientRow;
}

// ---------- Family members ----------

export async function fetchFamilyMembers(opts: { client_id?: string | null; lead_id?: string | null }): Promise<FamilyMember[]> {
  let q = supabase.from("client_family_members").select("*").order("created_at");
  if (opts.client_id) q = q.eq("primary_client_id", opts.client_id);
  else if (opts.lead_id) q = q.eq("primary_lead_id", opts.lead_id);
  else return [];
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as FamilyMember[];
}

export async function upsertFamilyMember(
  id: string | null,
  patch: Partial<FamilyMember>,
): Promise<FamilyMember> {
  if (id) {
    const data = await runWithAuthRetry(() =>
      supabase.from("client_family_members").update(patch as never).eq("id", id).select().single(),
      { table: "client_family_members", operation: "update" },
    );
    return data as unknown as FamilyMember;
  }
  const data = await runWithAuthRetry(() =>
    supabase.from("client_family_members").insert([patch as never]).select().single(),
    { table: "client_family_members", operation: "insert" },
  );
  return data as unknown as FamilyMember;
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const { error } = await supabase.from("client_family_members").delete().eq("id", id);
  if (error) throw error;
}

export async function createLeadFromFamilyMember(family_member_id: string): Promise<{ id: string; lead_number: string }> {
  const { data, error } = await supabase.rpc("create_lead_from_family_member", { _family_member_id: family_member_id });
  if (error) throw error;
  const row = data as unknown as { id: string; lead_number: string };
  return row;
}

// ---------- Accounting entities ----------

export interface BillingEntity { id: string; name: string; type: string; currency: string | null; }

export async function fetchAccountingEntities(): Promise<BillingEntity[]> {
  const { data, error } = await supabase
    .from("accounting_entities")
    .select("id,name,type,currency")
    .eq("is_active", true)
    .eq("type", "COMPANY")
    .order("name");
  if (error) {
    console.warn("accounting_entities read denied; falling back to empty list", error);
    return [];
  }
  return (data ?? []) as BillingEntity[];
}

// ---------- Service offers ----------

export interface ServiceOffer {
  id: string;
  offer_name: string;
  offer_code: string | null;
  offer_type: "PERCENT" | "FIXED_INR" | "COMBO";
  discount_percent: number | null;
  discount_amount_inr: number | null;
  valid_until: string | null;
}

export async function fetchActiveOffers(): Promise<ServiceOffer[]> {
  const { data, error } = await supabase
    .from("service_offers")
    .select("id,offer_name,offer_code,offer_type,discount_percent,discount_amount_inr,valid_until")
    .eq("is_active", true)
    .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString().slice(0, 10)}`);
  if (error) {
    console.warn("service_offers read denied", error);
    return [];
  }
  return (data ?? []) as ServiceOffer[];
}

// ---------- Invoice creation ----------

export interface InvoiceLineDraft {
  service_code: string | null;
  service_name: string;
  person_type: "primary" | "spouse" | "dependent" | "other";
  person_name: string;
  family_member_id: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  gst_rate: number;
  is_complimentary: boolean;
  offer_id: string | null;
}

export interface CreateInvoiceResult { invoice_id: string; invoice_number: string; }

function invoiceDueDate(paymentTerms: string | null | undefined): string | null {
  const today = new Date();
  const addDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  switch (paymentTerms) {
    case "DUE_ON_RECEIPT": return today.toISOString().slice(0, 10);
    case "NET_7": return addDays(7);
    case "NET_15": return addDays(15);
    case "NET_30": return addDays(30);
    default: return null;
  }
}

function invoiceLineSignature(lines: Array<Record<string, unknown>>): string {
  return JSON.stringify(lines.map((l) => ({
    service_code: String(l.service_code ?? ""),
    person_type: String(l.person_type ?? ""),
    person_name: String(l.person_name ?? ""),
    family_member_id: String(l.family_member_id ?? ""),
    quantity: Number(l.quantity ?? 1),
    unit_price: Number(l.unit_price ?? l.amount ?? 0),
    discount_amount: Number(l.discount_amount ?? l.discount ?? 0),
    is_complimentary: !!l.is_complimentary,
  })).sort((a, b) => `${a.service_code}|${a.person_type}|${a.person_name}|${a.family_member_id}`.localeCompare(`${b.service_code}|${b.person_type}|${b.person_name}|${b.family_member_id}`)));
}

export async function createDraftInvoice(args: {
  client_id: string;
  client_name: string;
  entity: string | null;
  payment_terms: string | null;
  lines: InvoiceLineDraft[];
}): Promise<CreateInvoiceResult> {
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = invoiceDueDate(args.payment_terms);
  let grandTotal = 0;
  const computed = args.lines.map((l) => {
    const base = l.is_complimentary ? 0 : Math.max(0, l.unit_price * l.quantity - l.discount_amount);
    const gst = base * (l.gst_rate / 100);
    const total = base + gst;
    grandTotal += total;
    return {
      service_id: l.service_code ?? null,
      service_code: l.service_code,
      service_name: l.service_name,
      description: l.service_name,
      person_type: l.person_type,
      person_name: l.person_name,
      family_member_id: l.family_member_id,
      quantity: l.quantity,
      currency: "INR",
      amount: l.unit_price,
      unit_price: l.unit_price,
      discount: l.discount_amount,
      discount_amount: l.discount_amount,
      tax: gst,
      gst_rate: l.gst_rate,
      gst_amount: gst,
      total,
      line_total: total,
      is_complimentary: l.is_complimentary,
      offer_id: l.offer_id,
    };
  });
  const signature = invoiceLineSignature(computed);

  const { data: existing } = await supabase
    .from("client_invoices")
    .select("id,invoice_number,status,line_items")
    .eq("client_id", args.client_id)
    .is("archived_at", null)
    .not("status", "in", "(cancelled,void,refunded)");
  const duplicate = (existing ?? []).find((inv) => invoiceLineSignature(Array.isArray(inv.line_items) ? inv.line_items as Array<Record<string, unknown>> : []) === signature);
  if (duplicate) return { invoice_id: duplicate.id, invoice_number: duplicate.invoice_number };

  const { data: { user } } = await supabase.auth.getUser();
  const { data: inv, error: invErr } = await supabase
    .from("client_invoices")
    .insert([{
      client_id: args.client_id,
      invoice_number: `TEMP-${crypto.randomUUID()}`,
      amount: grandTotal,
      currency: "INR",
      status: "draft",
      due_date: dueDate,
      line_items: computed,
      created_by: user?.id ?? null,
      invoice_entity_code: args.entity ? args.entity.slice(0, 12).replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "FLC" : "FLC",
      invoice_branch_code: "GEN",
      invoice_year: Number(today.slice(0, 4)),
      fx_snapshot_date: today,
      fx_rate_to_inr: 1,
      fx_rate_to_cad: 1,
      fx_rate_to_usd: 1,
      fx_provider: "manual",
      fx_manual_override: true,
      subtotal_in_inr: grandTotal,
      subtotal_in_cad: grandTotal,
      subtotal_in_usd: grandTotal,
      balance_due_in_inr: grandTotal,
      balance_due_in_cad: grandTotal,
      balance_due_in_usd: grandTotal,
    } as never])
    .select("id, invoice_number")
    .single();
  if (invErr) throw invErr;

  return { invoice_id: (inv as { id: string }).id, invoice_number: (inv as { invoice_number: string }).invoice_number };
}