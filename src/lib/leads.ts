import { supabase } from "@/integrations/supabase/client";
import { isExcludedCatalogueService } from "@/lib/service-library/excludedCatalogueServices";
import {
  resolveAlliedAdmissionGrouping,
  resolveCoachingFamilyKey,
  resolveCoachingVariantLabel,
} from "@/lib/leads/servicePickerGroups";
import { coachingFamilyLabel, resolveServiceCountries } from "@/lib/service-library/serviceNavClassification";
import { VISA_COUNTRY_PRIORITY } from "@/lib/service-library/countryBadges";
import {
  buildLibraryFeeMaps,
  pickFeePair,
  pickGovtFee,
  type FeeItemRow,
  type LibraryGovtFee,
} from "@/lib/leads/serviceFeeItems";
import { convertGovtFee } from "@/lib/leads/govtFeeFx";

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

type PickerVariantRow = {
  library_id: string;
  country: string;
  variant_key: string;
  picker_label: string;
  group_label: string;
  fee_inr: number;
  fee_cad: number;
  govt_fee_inr?: number | null;
  govt_fee_cad?: number | null;
  govt_amount?: number | null;
  govt_currency?: string | null;
  display_order: number;
};

function visaVariantGroupKey(groupLabel: string): string {
  return groupLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function resolveVariantGovtOverride(v: PickerVariantRow): {
  inr?: number | null;
  cad?: number | null;
  amount?: number | null;
  currency?: string | null;
} | undefined {
  if (v.govt_amount != null && v.govt_currency) {
    const amount = Number(v.govt_amount);
    const currency = String(v.govt_currency).toUpperCase();
    return {
      amount,
      currency,
      inr:
        v.govt_fee_inr != null
          ? Number(v.govt_fee_inr)
          : convertGovtFee(amount, currency, "INR"),
      cad:
        v.govt_fee_cad != null
          ? Number(v.govt_fee_cad)
          : convertGovtFee(amount, currency, "CAD"),
    };
  }
  if (v.govt_fee_inr != null || v.govt_fee_cad != null) {
    return {
      inr: v.govt_fee_inr != null ? Number(v.govt_fee_inr) : null,
      cad: v.govt_fee_cad != null ? Number(v.govt_fee_cad) : null,
    };
  }
  return undefined;
}

function withLibraryFees(
  item: ServiceCatalogueItem,
  libraryId: string,
  consultMap: Map<string, { inr: number | null; cad: number | null }>,
  govtMap: Map<string, LibraryGovtFee>,
  variantGovt?: {
    inr?: number | null;
    cad?: number | null;
    amount?: number | null;
    currency?: string | null;
  },
): ServiceCatalogueItem {
  const consult = pickFeePair(consultMap, libraryId);
  const govt = pickGovtFee(govtMap, libraryId, variantGovt);
  const feeInr = item.fee_inr ?? consult.inr;
  const feeCad = item.fee_cad ?? consult.cad;
  const pricing =
    item.pricing_type === "ON_REQUEST" && (feeInr != null || feeCad != null) ? "FIXED" : item.pricing_type;

  let govtAmount = variantGovt?.amount ?? govt.native?.amount ?? null;
  let govtCurrency = variantGovt?.currency ?? govt.native?.currency ?? null;
  let govtInr = govt.inr;
  let govtCad = govt.cad;

  if (govtAmount != null && govtCurrency && govtInr == null) {
    govtInr = convertGovtFee(govtAmount, govtCurrency, "INR");
  }
  if (govtAmount != null && govtCurrency && govtCad == null) {
    govtCad = convertGovtFee(govtAmount, govtCurrency, "CAD");
  }

  return {
    ...item,
    library_id: libraryId,
    fee_inr: feeInr,
    fee_cad: feeCad,
    govt_amount: govtAmount,
    govt_currency: govtCurrency,
    govt_fee_inr: govtInr,
    govt_fee_cad: govtCad,
    pricing_type: pricing,
  };
}

export async function fetchAllServiceCatalogue(): Promise<ServiceCatalogueItem[]> {
  // Source of truth: service_library + picker_variants + fee_items.
  const libRes = await supabase
    .from("service_library")
    .select(
      "id, service_category, service, sub_service, display_order, is_active, academy_metadata, service_library_countries(country)",
    )
    .eq("is_active", true)
    .order("service_category", { ascending: true })
    .order("display_order", { ascending: true })
    .order("service", { ascending: true });
  const { data, error } = libRes;
  if (error) throw error;

  const variantSelectFull =
    "library_id, country, variant_key, picker_label, group_label, fee_inr, fee_cad, govt_fee_inr, govt_fee_cad, govt_amount, govt_currency, display_order";
  const variantSelectMid =
    "library_id, country, variant_key, picker_label, group_label, fee_inr, fee_cad, govt_fee_inr, govt_fee_cad, display_order";
  const variantSelectBase =
    "library_id, country, variant_key, picker_label, group_label, fee_inr, fee_cad, display_order";

  let variantRes = await supabase
    .from("service_library_picker_variants")
    .select(variantSelectFull)
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (variantRes.error) {
    variantRes = await supabase
      .from("service_library_picker_variants")
      .select(variantSelectMid)
      .eq("is_active", true)
      .order("display_order", { ascending: true });
  }
  if (variantRes.error) {
    variantRes = await supabase
      .from("service_library_picker_variants")
      .select(variantSelectBase)
      .eq("is_active", true)
      .order("display_order", { ascending: true });
  }

  const variants = variantRes.error
    ? []
    : ((variantRes.data ?? []) as unknown as PickerVariantRow[]);
  const variantsByParent = new Map<string, PickerVariantRow[]>();
  for (const v of variants) {
    const key = `${v.library_id}::${v.country}`;
    variantsByParent.set(key, [...(variantsByParent.get(key) ?? []), v]);
  }
  type Row = {
    id: string;
    service_category: string;
    service: string;
    sub_service: string;
    display_order: number;
    is_active: boolean;
    academy_metadata?: { displayName?: string } | null;
    service_library_countries: { country: string }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const libraryIds = rows.map((r) => r.id);
  const feeRes =
    libraryIds.length > 0
      ? await supabase
          .from("service_library_fee_items")
          .select("library_id, fee_label, amount, currency, country")
          .in("library_id", libraryIds)
      : { data: [] as FeeItemRow[], error: null };
  const { consultancy: consultMap, government: govtMap } = buildLibraryFeeMaps(
    (feeRes.data ?? []) as unknown as FeeItemRow[],
  );

  const items: ServiceCatalogueItem[] = [];
  for (const r of rows) {
    const countries = (r.service_library_countries ?? []).map((c) => c.country);
    const displayLabel =
      (r.academy_metadata as { displayName?: string } | null)?.displayName ?? null;

    if (
      isExcludedCatalogueService({
        subService: r.sub_service,
        serviceName: displayLabel ?? r.sub_service,
        serviceCode: r.id,
        serviceField: r.service,
      })
    ) {
      continue;
    }

    if (r.service_category === "visa_immigration") {
      const visaDisplayLabel = displayLabel ?? r.sub_service;
      const serviceNorm = r.service.trim().toLowerCase();
      const isCountryRow =
        VISA_COUNTRY_PRIORITY.some((c) => c.toLowerCase() === serviceNorm) ||
        resolveServiceCountries(r.service, countries).some((c) => c.toLowerCase() === serviceNorm);
      const hasAcademyContent = !!displayLabel;
      if (!isCountryRow && !hasAcademyContent) continue;

      // Emit one row per country so the per-country filter in ServiceTabs works.
      const list = countries.length > 0 ? countries : [null];
      for (const c of list) {
        const parentKey = c ? `${r.id}::${c}` : r.id;
        const parentVariants = c ? variantsByParent.get(`${r.id}::${c}`) : undefined;

        if (parentVariants && parentVariants.length > 0) {
          for (const v of parentVariants) {
            const groupKey = visaVariantGroupKey(v.group_label);
            items.push(
              withLibraryFees(
                {
                  id: `${r.id}::${c}::${v.variant_key}`,
                  master_key: r.service_category,
                  service_name: v.picker_label,
                  sub_category: c,
                  group_key: groupKey,
                  group_label: v.group_label,
                  service_code: `${r.id}::${c}::${v.variant_key}`,
                  pricing_type: "FIXED",
                  fee_inr: Number(v.fee_inr),
                  fee_cad: Number(v.fee_cad),
                  country_tag: c,
                  is_active: r.is_active,
                  is_bundled: false,
                  display_order: v.display_order,
                },
                r.id,
                consultMap,
                govtMap,
                resolveVariantGovtOverride(v),
              ),
            );
          }
          continue;
        }

        items.push(
          withLibraryFees(
            {
              id: parentKey,
              master_key: r.service_category,
              service_name: visaDisplayLabel,
              sub_category: c ?? r.service,
              service_code: c ? `${r.id}::${c}` : r.id,
              pricing_type: "ON_REQUEST",
              country_tag: c,
              is_active: r.is_active,
              is_bundled: false,
              display_order: r.display_order ?? 0,
            },
            r.id,
            consultMap,
            govtMap,
          ),
        );
      }
    } else {
      const familyField = r.service;

      if (r.service_category === "coaching_services") {
        const variantLabel = resolveCoachingVariantLabel(familyField, r.sub_service, displayLabel);
        const groupKey = resolveCoachingFamilyKey(familyField, r.sub_service);
        items.push(
          withLibraryFees(
            {
              id: r.id,
              master_key: r.service_category,
              service_name: variantLabel,
              sub_category: null,
              group_key: groupKey,
              group_label: coachingFamilyLabel(groupKey),
              service_code: r.id,
              pricing_type: "ON_REQUEST",
              country_tag: null,
              is_active: r.is_active,
              is_bundled: false,
              display_order: r.display_order ?? 0,
            },
            r.id,
            consultMap,
            govtMap,
          ),
        );
      } else {
        const variantLabel = displayLabel ?? r.sub_service;
        const grouped = resolveAlliedAdmissionGrouping(familyField, r.sub_service, variantLabel);
        items.push(
          withLibraryFees(
            {
              id: r.id,
              master_key: r.service_category,
              service_name: grouped.itemLabel,
              sub_category: grouped.groupLabel,
              group_key: grouped.groupKey,
              group_label: grouped.groupLabel,
              service_code: r.id,
              pricing_type: "ON_REQUEST",
              country_tag: null,
              is_active: r.is_active,
              is_bundled: false,
              display_order: r.display_order ?? 0,
            },
            r.id,
            consultMap,
            govtMap,
          ),
        );
      }
    }
  }
  return items;
}

export interface ServiceCatalogueItem {
  id: string;
  library_id?: string;
  master_key: string;
  sub_category?: string | null;
  group_key?: string | null;
  group_label?: string | null;
  service_name: string;
  service_code?: string | null;
  pricing_type: "FIXED" | "FLEXIBLE" | "FREE" | "ON_REQUEST";
  fee_inr?: number | null;
  fee_cad?: number | null;
  govt_amount?: number | null;
  govt_currency?: string | null;
  govt_fee_inr?: number | null;
  govt_fee_cad?: number | null;
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

/** Lookup by virtual catalogue id or composite service_code. */
export function buildCatalogueLookup(items: ServiceCatalogueItem[]): Map<string, ServiceCatalogueItem> {
  const m = new Map<string, ServiceCatalogueItem>();
  for (const s of items) {
    m.set(s.id, s);
    if (s.service_code) m.set(s.service_code, s);
  }
  return m;
}

export async function fetchServiceCatalogue(masterKey?: string): Promise<ServiceCatalogueItem[]> {
  const all = await fetchAllServiceCatalogue();
  if (!masterKey) return all;
  return all.filter((s) => s.master_key === masterKey);
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

let _serviceMapCache: Map<string, string> | null = null;
export function clearServiceCodeMapCache() {
  _serviceMapCache = null;
}
export async function fetchServiceCodeMap(): Promise<Map<string, string>> {
  if (_serviceMapCache) return _serviceMapCache;
  const m = new Map<string, string>();

  // Primary source: service_library IDs used by the lead/client service picker.
  const catalogue = await fetchAllServiceCatalogue();
  for (const s of catalogue) {
    const code = s.service_code || s.id;
    const chipLabel =
      s.group_label &&
      (s.master_key === "coaching_services" || s.master_key === "visa_immigration")
        ? `${s.group_label} — ${s.service_name}`
        : s.service_name;
    m.set(code, chipLabel);
    m.set(s.id, chipLabel);
    if (s.sub_category) m.set(`${code}::label`, s.sub_category);
    if (s.group_label) m.set(`${code}::group`, s.group_label);
  }

  _serviceMapCache = m;
  return m;
}