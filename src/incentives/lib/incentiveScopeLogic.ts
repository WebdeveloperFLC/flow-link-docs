/**
 * Incentive rule scope matching — presets, dimensions, rule pay helpers.
 */

export type ScopeJson = {
  master_keys?: string[];
  service_codes?: string[];
  sub_categories?: string[];
  exclude_master_keys?: string[];
  country_codes?: string[];
  country_tags?: string[];
  institution_ids?: string[];
  intakes?: string[];
  program_names?: string[];
};

export type LineDimensions = {
  master_key?: string | null;
  service_code?: string | null;
  sub_category?: string | null;
  country_code?: string | null;
  country_tag?: string | null;
  institution_id?: string | null;
  intake?: string | null;
  program_name?: string | null;
  is_first_payment?: boolean;
};

export const SCOPE_PRESET_KEYS = [
  "all_services",
  "allied_travel",
  "all_allied",
  "all_travel",
  "core_only",
] as const;

export type ScopePresetKey = (typeof SCOPE_PRESET_KEYS)[number];

export const SCOPE_PRESET_LABELS: Record<ScopePresetKey, string> = {
  all_services: "All services (coaching + visa + admission + allied + travel)",
  allied_travel: "Allied & Travel tab",
  all_allied: "Allied services only",
  all_travel: "Travel & financial only",
  core_only: "Core only (coaching + visa + admission)",
};

export function resolveScopePreset(preset: string | null | undefined): ScopeJson {
  switch (preset) {
    case "allied_travel":
      return { master_keys: ["allied_services", "travel_financial"] };
    case "all_allied":
      return { master_keys: ["allied_services"] };
    case "all_travel":
      return { master_keys: ["travel_financial"] };
    case "core_only":
      return { master_keys: ["coaching_services", "visa_immigration", "admission_services"] };
    case "all_services":
    default:
      return {
        master_keys: [
          "coaching_services",
          "visa_immigration",
          "admission_services",
          "allied_services",
          "travel_financial",
        ],
      };
  }
}

export function mergeScope(preset: string | null | undefined, scopeJson: ScopeJson | null | undefined): ScopeJson {
  const base = resolveScopePreset(preset);
  const extra = scopeJson ?? {};
  return {
    master_keys: extra.master_keys?.length ? extra.master_keys : base.master_keys,
    service_codes: extra.service_codes,
    sub_categories: extra.sub_categories,
    exclude_master_keys: extra.exclude_master_keys,
    country_codes: extra.country_codes,
    country_tags: extra.country_tags,
    institution_ids: extra.institution_ids,
    intakes: extra.intakes,
    program_names: extra.program_names,
  };
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function inList(val: string | null | undefined, list: string[] | undefined): boolean {
  if (!list?.length) return true;
  const v = norm(val);
  return list.some((x) => norm(x) === v || (v && v.includes(norm(x))));
}

function serviceCodeMatches(code: string | null | undefined, filter: string): boolean {
  const c = norm(code);
  const f = norm(filter);
  if (!c || !f) return false;
  return c === f || c.startsWith(f + "::") || c.split("::")[0] === f;
}

export function matchesScope(
  scope: ScopeJson,
  dims: LineDimensions,
  opts?: { requireFirstPayment?: boolean },
): boolean {
  if (opts?.requireFirstPayment && dims.is_first_payment === false) return false;

  const mk = norm(dims.master_key);
  if (scope.exclude_master_keys?.some((x) => norm(x) === mk)) return false;

  if (scope.master_keys?.length && !scope.master_keys.some((x) => norm(x) === mk)) return false;

  if (scope.service_codes?.length) {
    const hit = scope.service_codes.some((f) => serviceCodeMatches(dims.service_code, f));
    if (!hit) return false;
  }

  if (scope.sub_categories?.length && !inList(dims.sub_category, scope.sub_categories)) return false;
  if (scope.country_codes?.length && !inList(dims.country_code, scope.country_codes)) return false;
  if (scope.country_tags?.length && !inList(dims.country_tag, scope.country_tags)) return false;
  if (scope.institution_ids?.length && !inList(dims.institution_id, scope.institution_ids)) return false;
  if (scope.intakes?.length && !inList(dims.intake, scope.intakes)) return false;
  if (scope.program_names?.length && !inList(dims.program_name, scope.program_names)) return false;

  return true;
}

/** Legacy slab service_filter: blank = all; else match service_code or master_key */
export function matchesServiceFilter(
  filter: string | null | undefined,
  dims: LineDimensions,
): boolean {
  const f = (filter ?? "").trim();
  if (!f) return true;
  if (norm(dims.master_key) === norm(f)) return true;
  return serviceCodeMatches(dims.service_code, f);
}

export function classifySourceFromMaster(masterKey?: string | null): "service_revenue" | "ancillary" {
  const m = norm(masterKey);
  if (m === "allied_services" || m === "travel_financial") return "ancillary";
  return "service_revenue";
}

export function formatIntake(term?: string | null, year?: number | null): string | null {
  const t = (term ?? "").trim();
  if (!t && year == null) return null;
  if (year != null && t) return `${t}-${year}`;
  return t || String(year);
}
