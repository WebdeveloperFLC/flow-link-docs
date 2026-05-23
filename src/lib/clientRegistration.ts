import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/leads";

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
  year?: number | null;
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
  year_of_passing?: number | null;
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
  year_of_passing?: number | null;
  percentage_cgpa?: string | null;
  english_test?: string | null;
  english_overall?: string | null;
  english_test_date?: string | null;
  english_test_expiry?: string | null;
  other_tests?: Array<{ type: string; score?: string; date?: string; sections?: Record<string, string> }>;
  english_sections?: Record<string, string>;
  education_history?: EducationEntry[];
  work_experience?: ExperienceEntry[];
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
}

export type ClientDraft = Partial<Omit<ClientRow, "id" | "registration_number" | "application_id">>;

/** Prefill a client draft from a lead row. */
export function prefillFromLead(lead: Lead): ClientDraft {
  const visaCode = (lead.visa_services && lead.visa_services[0]) || "";
  const seededHistory: EducationEntry[] = lead.last_education
    ? [{ level: lead.last_education ?? undefined }]
    : [];
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
    last_education: lead.last_education ?? null,
    last_education_other: lead.last_education_other ?? null,
    education_history: seededHistory,
    interested_countries: lead.interested_countries ?? [],
    branch: lead.branch ?? null,
    department: lead.department ?? null,
    coaching_services: lead.coaching_services ?? [],
    visa_services: lead.visa_services ?? [],
    admission_services: lead.admission_services ?? [],
    allied_services: lead.allied_services ?? [],
    application_type: visaCode || "Student Visa",
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
    const { data, error } = await supabase
      .from("clients")
      .update(body as never)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ClientRow;
  }
  const { data, error } = await supabase
    .from("clients")
    .insert([body as never])
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ClientRow;
}

export async function fetchClient(id: string): Promise<ClientRow | null> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as ClientRow | null;
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
    const { data, error } = await supabase.from("client_family_members").update(patch as never).eq("id", id).select().single();
    if (error) throw error;
    return data as unknown as FamilyMember;
  }
  const { data, error } = await supabase.from("client_family_members").insert([patch as never]).select().single();
  if (error) throw error;
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

export async function createDraftInvoice(args: {
  client_id: string;
  client_name: string;
  entity: string | null;
  payment_terms: string | null;
  lines: InvoiceLineDraft[];
}): Promise<CreateInvoiceResult> {
  const today = new Date().toISOString().slice(0, 10);
  const stamp = Date.now().toString().slice(-7);
  const invoice_number = `INV-DRAFT-${stamp}`;

  let subtotal = 0, taxTotal = 0, grandTotal = 0;
  const computed = args.lines.map((l) => {
    const base = l.is_complimentary ? 0 : Math.max(0, l.unit_price * l.quantity - l.discount_amount);
    const gst = base * (l.gst_rate / 100);
    const total = base + gst;
    subtotal += base;
    taxTotal += gst;
    grandTotal += total;
    return { ...l, gst_amount: gst, line_total: total };
  });

  const { data: { user } } = await supabase.auth.getUser();
  const { data: inv, error: invErr } = await supabase
    .from("accounting_ar_invoices")
    .insert([{
      invoice_number,
      client_id: args.client_id,
      client_name: args.client_name,
      invoice_date: today,
      status: "DRAFT",
      currency: "INR",
      subtotal,
      tax_amount: taxTotal,
      total_amount: grandTotal,
      outstanding_balance: grandTotal,
      entity: args.entity,
      payment_terms: args.payment_terms,
      created_by: user?.id ?? null,
    } as never])
    .select("id, invoice_number")
    .single();
  if (invErr) throw invErr;

  if (computed.length) {
    const rows = computed.map((c) => ({
      invoice_id: (inv as { id: string }).id,
      service_code: c.service_code,
      service_name: c.service_name,
      person_type: c.person_type,
      person_name: c.person_name,
      family_member_id: c.family_member_id,
      quantity: c.quantity,
      unit_price: c.unit_price,
      discount_amount: c.discount_amount,
      gst_rate: c.gst_rate,
      gst_amount: c.gst_amount,
      line_total: c.line_total,
      is_complimentary: c.is_complimentary,
      offer_id: c.offer_id,
    }));
    const { error: linesErr } = await supabase.from("ar_invoice_line_items").insert(rows as never);
    if (linesErr) throw linesErr;
  }

  return { invoice_id: (inv as { id: string }).id, invoice_number: (inv as { invoice_number: string }).invoice_number };
}