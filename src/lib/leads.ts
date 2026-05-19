import { supabase } from "@/integrations/supabase/client";

export type LeadType = "warm" | "hot" | "cold";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "unqualified" | "lost";
export type LeadTemperature = "hot" | "warm" | "cold";

export interface Lead {
  id: string;
  lead_number: string;
  lead_type: LeadType;
  status: LeadStatus;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  country_of_citizenship?: string | null;
  country_of_residence?: string | null;
  coaching_services: string[];
  visa_services: string[];
  admission_services: string[];
  allied_services: string[];
  interested_countries: string[];
  visa_locked: boolean;
  visa_lock_reason?: string | null;
  last_education?: string | null;
  last_education_other?: string | null;
  start_timeline?: string | null;
  lead_source?: string | null;
  lead_temperature: LeadTemperature;
  branch?: string | null;
  department?: string | null;
  assigned_counselor_id?: string | null;
  is_cold_pool: boolean;
  cold_pool_campaign?: string | null;
  notes?: string | null;
  notes_locked: boolean;
  priority?: string | null;
  source?: string | null;
  created_by?: string | null;
  converted_to_client_id?: string | null;
  converted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadDraft = Partial<Omit<Lead, "id" | "lead_number" | "created_at" | "updated_at">>;

export async function createLead(draft: LeadDraft): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert([draft as never])
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Lead;
}

export async function updateLead(id: string, patch: LeadDraft): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update(patch as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Lead;
}

export async function fetchLeads(opts: { temperatures?: LeadTemperature[]; coldPool?: boolean; search?: string; limit?: number } = {}): Promise<Lead[]> {
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 200);
  if (opts.coldPool !== undefined) q = q.eq("is_cold_pool", opts.coldPool);
  if (opts.temperatures && opts.temperatures.length) q = q.in("lead_temperature", opts.temperatures);
  if (opts.search) {
    const s = `%${opts.search}%`;
    q = q.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s},phone.ilike.${s},lead_number.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Lead[];
}

export async function fetchLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as Lead | null;
}

/** Auto-save: insert (when id is null) or patch one or more fields. */
export async function upsertLeadAutosave(
  id: string | null,
  patch: LeadDraft,
): Promise<Lead> {
  if (id) return updateLead(id, patch);
  return createLead(patch);
}

/** Stub used by Stage 2 detail page; real client creation is Stage 3. */
export async function markLeadConverted(id: string): Promise<Lead> {
  return updateLead(id, { status: "converted" as never });
}

export async function fetchAllServiceCatalogue(): Promise<ServiceCatalogueItem[]> {
  const { data, error } = await supabase
    .from("service_catalogue")
    .select("*")
    .eq("is_active", true)
    .order("master_key", { ascending: true })
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ServiceCatalogueItem[];
}

export interface ServiceCatalogueItem {
  id: string;
  master_key: string;
  sub_category?: string | null;
  service_name: string;
  service_code?: string | null;
  pricing_type: "FIXED" | "FLEXIBLE" | "FREE" | "ON_REQUEST";
  fee_inr?: number | null;
  fee_cad?: number | null;
  fee_gbp?: number | null;
  fee_aud?: number | null;
  max_fee_inr?: number | null;
  country_tag?: string | null;
  is_active: boolean;
  is_bundled: boolean;
  bundle_note?: string | null;
  display_order: number;
  notes?: string | null;
}

export async function fetchServiceCatalogue(masterKey?: string): Promise<ServiceCatalogueItem[]> {
  let q = supabase
    .from("service_catalogue")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (masterKey) q = q.eq("master_key", masterKey);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ServiceCatalogueItem[];
}

export interface Branch {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  is_virtual: boolean;
  is_active: boolean;
  display_order: number;
}

export async function fetchBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as unknown as Branch[];
}

export interface Department {
  id: string;
  name: string;
  handles_services: string[];
  is_active: boolean;
  display_order: number;
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as unknown as Department[];
}

export function suggestDepartmentFromServices(
  selectedKeys: { coaching: boolean; visa: boolean; admission: boolean; allied: boolean; travel: boolean },
  departments: Department[],
): string | null {
  const wanted: string[] = [];
  if (selectedKeys.visa) wanted.push("visa_immigration");
  if (selectedKeys.coaching) wanted.push("coaching_services");
  if (selectedKeys.admission) wanted.push("admission_services");
  if (selectedKeys.allied) wanted.push("allied_services");
  if (selectedKeys.travel) wanted.push("travel_financial");
  for (const w of wanted) {
    const dept = departments.find((d) => d.handles_services?.includes(w));
    if (dept) return dept.name;
  }
  return null;
}