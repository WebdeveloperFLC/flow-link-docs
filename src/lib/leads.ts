import { supabase } from "@/integrations/supabase/client";
import type { EducationEntry, ExperienceEntry } from "@/lib/clientRegistration";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import type { LanguageTestsValue } from "@/lib/languageTests";
import { isExcludedCatalogueService } from "@/lib/service-library/excludedCatalogueServices";
import { isPipelineBackedLibraryId } from "@/lib/service-library/pipelineBackedLibraryIds";
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
import { formatServiceLibraryLabel } from "@/lib/service-library/resolveServiceLabel";

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
  travel_financial_services?: string[];
  interested_countries: string[];
  visa_locked: boolean;
  visa_lock_reason?: string | null;
  last_education?: string | null;
  last_education_other?: string | null;
  start_timeline?: string | null;
  sponsor?: string | null;
  sponsor_other?: string | null;
  has_budget?: string | null;
  budget_currency?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  lead_source?: string | null;
  lead_temperature: LeadTemperature;
  branch?: string | null;
  department?: string | null;
  assigned_counselor_id?: string | null;
  is_cold_pool: boolean;
  cold_pool_campaign?: string | null;
  notes?: string | null;
  notes_locked: boolean;
  next_followup_at?: string | null;
  followup_channel?: string | null;
  followup_note?: string | null;
  followup_history?: unknown[];
  education_history?: EducationEntry[];
  english_test?: string | null;
  english_test_status?: string | null;
  english_overall?: string | null;
  english_test_date?: string | null;
  english_test_expiry?: string | null;
  english_sections?: Record<string, string>;
  other_tests?: Array<{ type: string; score?: string; date?: string; sections?: Record<string, string> }>;
  work_experience?: ExperienceEntry[];
  language_tests?: LanguageTestsValue;
  priority?: string | null;
  source?: string | null;
  created_by?: string | null;
  converted_to_client_id?: string | null;
  converted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadDraft = Partial<Omit<Lead, "id" | "lead_number" | "created_at" | "updated_at">>;

const ENUM_NULL_IF_EMPTY: (keyof LeadDraft)[] = [
  "gender",
  "marital_status",
  "last_education",
  "start_timeline",
  "sponsor",
  "sponsor_other",
  "has_budget",
  "budget_currency",
  "lead_source",
  "branch",
  "department",
  "cold_pool_campaign",
];

/** Empty strings violate CHECK constraints on enum-like lead columns — store null instead. */
export function sanitizeLeadDraft(draft: LeadDraft): LeadDraft {
  const out = { ...draft };
  for (const key of ENUM_NULL_IF_EMPTY) {
    if (out[key] === "") (out as Record<string, unknown>)[key] = null;
  }
  if (out.email === "") out.email = null;
  if (out.phone === "") out.phone = null;
  if (out.phone_country_code === "") out.phone_country_code = null;
  return out;
}

/** patch_lead_draft fails when DB is missing columns its SQL references (e.g. followup_history). */
function isLeadRpcSchemaError(error: unknown): boolean {
  const msg = formatSupabaseError(error, "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    (msg.includes("does not exist") && msg.includes("column"))
  );
}

async function patchLeadDirect(id: string, payload: LeadDraft): Promise<Lead> {
  const body = { ...payload } as Record<string, unknown>;
  delete body.followup_history;
  const { data, error } = await supabase.from("leads").update(body as never).eq("id", id).select().single();
  if (error) throw error;
  return data as unknown as Lead;
}

async function createLeadDirect(payload: LeadDraft): Promise<Lead> {
  const body = { ...payload } as Record<string, unknown>;
  delete body.followup_history;
  const { data, error } = await supabase.from("leads").insert([body as never]).select().single();
  if (error) throw error;
  return data as unknown as Lead;
}

export async function createLead(draft: LeadDraft): Promise<Lead> {
  const payload = sanitizeLeadDraft(draft);
  const { data, error } = await supabase.rpc("create_lead_draft", { _data: payload });
  if (!error) return data as unknown as Lead;
  if (isLeadRpcSchemaError(error)) return createLeadDirect(payload);
  throw error;
}

export async function updateLead(id: string, patch: LeadDraft): Promise<Lead> {
  const payload = sanitizeLeadDraft(patch);
  const { data, error } = await supabase.rpc("patch_lead_draft", { _id: id, _data: payload });
  if (!error) return data as unknown as Lead;
  if (isLeadRpcSchemaError(error)) return patchLeadDirect(id, payload);
  throw error;
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

/** Active (non-converted) leads matching email or phone — duplicate guard for warm/hot saves. */
export async function findDuplicateLeads(opts: {
  email?: string | null;
  phone?: string | null;
  excludeId?: string | null;
}): Promise<Array<{ id: string; lead_number: string; email: string | null; phone: string | null }>> {
  const email = opts.email?.trim().toLowerCase();
  const phone = opts.phone?.trim();
  if (!email && !phone) return [];

  let q = supabase
    .from("leads")
    .select("id, lead_number, email, phone")
    .is("converted_to_client_id", null);
  if (opts.excludeId) q = q.neq("id", opts.excludeId);

  const orParts: string[] = [];
  if (email) orParts.push(`email.ilike.${email}`);
  if (phone) orParts.push(`phone.eq.${phone}`);
  if (orParts.length) q = q.or(orParts.join(","));

  const { data, error } = await q.limit(5);
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; lead_number: string; email: string | null; phone: string | null }>;
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

/** Standard-tier fees only — picker variants are not separate visa services. */
function pickCanonicalVariantFees(
  variants: PickerVariantRow[] | undefined,
): PickerVariantRow | undefined {
  if (!variants?.length) return undefined;
  return (
    variants.find((v) => v.variant_key === "standard") ??
    variants.find((v) => /standard/i.test(v.picker_label)) ??
    variants[0]
  );
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
  // Visa: service_library display names only (one row per country). Variants → fee hints, not pickers.
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
  const seenIds = new Set<string>();
  const pushItem = (item: ServiceCatalogueItem) => {
    if (seenIds.has(item.id)) return;
    seenIds.add(item.id);
    items.push(item);
  };

  for (const r of rows) {
    const countries = [
      ...new Set((r.service_library_countries ?? []).map((c) => c.country).filter(Boolean)),
    ];
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
      if (!isPipelineBackedLibraryId(r.id)) continue;
      const visaDisplayLabel = formatServiceLibraryLabel({
        id: r.id,
        service: r.service,
        sub_service: r.sub_service,
        academy_metadata: r.academy_metadata,
      });
      const serviceNorm = r.service.trim().toLowerCase();
      const mappedCountries = [
        ...new Set((r.service_library_countries ?? []).map((c) => c.country).filter(Boolean)),
      ];
      const resolvedCountries = resolveServiceCountries(r.service, mappedCountries);
      const isCountryRow =
        VISA_COUNTRY_PRIORITY.some((c) => c.toLowerCase() === serviceNorm) ||
        resolvedCountries.some((c) => c.toLowerCase() === serviceNorm);
      const hasAcademyContent = !!displayLabel;
      if (!isCountryRow && !hasAcademyContent) continue;

      // Emit one row per country so the per-country filter in ServiceTabs works.
      let countryList = resolvedCountries.length > 0 ? resolvedCountries : [];
      if (countryList.length === 0) {
        const fromVariants = [
          ...new Set(
            variants.filter((pv) => pv.library_id === r.id).map((pv) => pv.country).filter(Boolean),
          ),
        ];
        if (fromVariants.length > 0) countryList = fromVariants;
      }
      const list = countryList.length > 0 ? countryList : [null];
      for (const c of list) {
        const parentKey = c ? `${r.id}::${c}` : r.id;
        const parentVariants = c ? variantsByParent.get(`${r.id}::${c}`) : undefined;
        const feeVariant = pickCanonicalVariantFees(parentVariants);
        const hasFees = feeVariant && (feeVariant.fee_inr > 0 || feeVariant.fee_cad > 0);

        pushItem(
          withLibraryFees(
            {
              id: parentKey,
              master_key: r.service_category,
              service_name: visaDisplayLabel,
              sub_category: c ?? r.service,
              service_code: c ? `${r.id}::${c}` : r.id,
              pricing_type: hasFees ? "FIXED" : "ON_REQUEST",
              fee_inr: feeVariant ? Number(feeVariant.fee_inr) : undefined,
              fee_cad: feeVariant ? Number(feeVariant.fee_cad) : undefined,
              country_tag: c,
              is_active: r.is_active,
              is_bundled: false,
              display_order: r.display_order ?? 0,
            },
            r.id,
            consultMap,
            govtMap,
            feeVariant ? resolveVariantGovtOverride(feeVariant) : undefined,
          ),
        );
      }
    } else {
      const familyField = r.service;

      if (r.service_category === "coaching_services") {
        const variantLabel = resolveCoachingVariantLabel(familyField, r.sub_service, displayLabel);
        const groupKey = resolveCoachingFamilyKey(familyField, r.sub_service);
        pushItem(
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
        pushItem(
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