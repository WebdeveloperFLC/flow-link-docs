import type { Master } from "@/lib/serviceLibrary";
import { countryBadgeCode, sortVisaCountries, VISA_COUNTRY_PRIORITY } from "@/lib/service-library/countryBadges";
import {
  classifyCoachingVariant,
  coachingFamilyLabel,
  coachingVariantLabel,
  resolveServiceCountries,
  type CoachingVariant,
} from "@/lib/service-library/serviceNavClassification";
import { isExcludedCatalogueService } from "@/lib/service-library/excludedCatalogueServices";
import {
  resolveCoachingFamilyKey,
  resolveCoachingVariantLabel,
} from "@/lib/leads/servicePickerGroups";
import { stripCountryPrefix } from "@/lib/service-library/serviceDisplayLabels";

export type AcademyCategoryFilter = "visa" | "coaching";

export type AcademyNavStep =
  | "countries"
  | "coaching_families"
  | "coaching_variants"
  | "services";

export type AcademyServiceItem = {
  id: string;
  label: string;
  countryBadge?: string;
  needsReview?: boolean;
  inactive?: boolean;
};

export type AcademyNavCountryPicker = {
  country: string;
  countryBadge: string;
  count: number;
};

export type AcademyNavSubBucket = {
  key: string;
  label: string;
  count: number;
};

export type AcademyNavCoachingFamily = {
  key: string;
  label: string;
  count: number;
};

export type AcademyNavCoachingVariant = {
  key: CoachingVariant;
  label: string;
  count: number;
};

export type AcademyNavGroup = {
  key: AcademyCategoryFilter;
  label: string;
  step: AcademyNavStep;
  items?: AcademyServiceItem[];
  countryPickers?: AcademyNavCountryPicker[];
  subBuckets?: AcademyNavSubBucket[];
  coachingFamilies?: AcademyNavCoachingFamily[];
  coachingVariants?: AcademyNavCoachingVariant[];
};

export const ACADEMY_CATEGORY_TABS: { key: AcademyCategoryFilter; label: string }[] = [
  { key: "visa", label: "Visa & Immigration" },
  { key: "coaching", label: "Coaching" },
];

type MasterRow = Master & {
  service_library_countries?: { country: string }[];
  academy_metadata?: unknown;
};

const LEGACY_SUB_SERVICES = new Set(["application", "assessment"]);

/** Admission / workflow labels wrongly stored under visa_immigration — not country visa services. */
const NON_VISA_SERVICE_FIELDS = new Set([
  "documents",
  "shortlisting",
  "offer management",
  "application",
  "financial",
  "general",
  "other",
  "admission",
  "english proficiency",
  "graduate admissions",
  "european languages",
]);

/** True when row belongs in counselor Visa & Immigration nav (excludes admission junk). */
export function isAcademyVisaServiceRow(m: MasterRow): boolean {
  if (isLegacyVisaRow(m)) return false;

  if (
    isExcludedCatalogueService({
      subService: m.sub_service,
      serviceField: m.service,
      serviceCode: m.id,
    })
  ) {
    return false;
  }

  const meta = metaOf(m);
  if (meta?.displayName) return true;

  const countries = resolveServiceCountries(
    m.service,
    (m.service_library_countries ?? []).map((c) => c.country),
  );

  // Mapped to a priority country → include (Work & Holiday, WHV, custom visa types, etc.)
  if (countries.some((c) => VISA_COUNTRY_PRIORITY.includes(c))) return true;

  const serviceNorm = m.service.trim().toLowerCase();
  if (NON_VISA_SERVICE_FIELDS.has(serviceNorm)) return false;

  if (VISA_COUNTRY_PRIORITY.some((c) => c.toLowerCase() === serviceNorm)) return true;

  return countries.some((c) => c.toLowerCase() === serviceNorm);
}

function isLegacyVisaRow(m: MasterRow): boolean {
  const meta = m.academy_metadata as { displayName?: string } | null | undefined;
  if (meta?.displayName) return false;

  const sub = m.sub_service.trim().toLowerCase();
  const svc = m.service.trim().toLowerCase();
  if (LEGACY_SUB_SERVICES.has(sub)) return true;
  if (sub === svc) return true;
  if (VISA_COUNTRY_PRIORITY.some((c) => c.toLowerCase() === sub)) return true;

  return false;
}

function metaOf(m: MasterRow) {
  return m.academy_metadata as {
    displayName?: string;
    shortDescription?: string;
    reviewStatus?: string;
  } | undefined;
}

function coachingFamilyKey(m: MasterRow): string {
  return resolveCoachingFamilyKey(m.service, m.sub_service);
}

function coachingVariantOf(m: MasterRow): CoachingVariant {
  const label = resolveCoachingVariantLabel(m.service, m.sub_service, metaOf(m)?.displayName);
  return classifyCoachingVariant(label, metaOf(m)?.displayName);
}

/** Hide bare family parent when specific variants exist (e.g. French Language vs French Language A1). */
function dropGenericCoachingParent(rows: MasterRow[], familyKey: string): MasterRow[] {
  if (rows.length <= 1) return rows;

  const familyNorm = familyKey.trim().toLowerCase();
  const variantLabel = (m: MasterRow) =>
    resolveCoachingVariantLabel(m.service, m.sub_service, metaOf(m)?.displayName).trim().toLowerCase();

  const hasSpecificVariant = rows.some((m) => {
    const label = variantLabel(m);
    return label !== familyNorm && label.startsWith(familyNorm);
  });

  if (!hasSpecificVariant) return rows;

  return rows.filter((m) => variantLabel(m) !== familyNorm);
}

function itemLabel(m: MasterRow, activeCountry?: string): string {
  const meta = metaOf(m);
  let label: string;

  if (meta?.displayName) {
    label = meta.displayName;
  } else if (activeCountry && activeCountry !== "ALL") {
    label = m.sub_service;
  } else if (m.service_category === "coaching_services") {
    label = resolveCoachingVariantLabel(m.service, m.sub_service, meta?.displayName);
  } else {
    const countries = resolveServiceCountries(
      m.service,
      (m.service_library_countries ?? []).map((c) => c.country),
    );
    const country = countries.length === 1 ? countries[0] : m.service;
    label =
      m.service_category === "visa_immigration" && country
        ? `${country} – ${m.sub_service}`
        : m.sub_service;
  }

  if (activeCountry && activeCountry !== "ALL") {
    return stripCountryPrefix(label, activeCountry);
  }
  return label;
}

function matchesSearch(m: MasterRow, q: string): boolean {
  if (!q) return true;
  const meta = metaOf(m);
  const coachingHay =
    m.service_category === "coaching_services"
      ? [coachingFamilyKey(m), resolveCoachingVariantLabel(m.service, m.sub_service, meta?.displayName)]
      : [];
  const hay = [
    m.service,
    m.sub_service,
    meta?.displayName,
    meta?.shortDescription,
    ...coachingHay,
    ...(m.service_library_countries ?? []).map((c) => c.country),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function toItem(
  m: MasterRow,
  needsReview: boolean,
  badge?: string,
  activeCountry?: string,
  includeInactive?: boolean,
): AcademyServiceItem {
  return {
    id: m.id,
    label: itemLabel(m, activeCountry),
    countryBadge: badge,
    needsReview,
    inactive: includeInactive && !m.is_active ? true : undefined,
  };
}

function sortItems(items: AcademyServiceItem[]) {
  return [...items].sort((a, b) => a.label.localeCompare(b.label));
}

/** Counselor-facing label for a master row. */
export function masterDisplayLabel(m: MasterRow, activeCountry?: string): string {
  return itemLabel(m, activeCountry);
}

export function buildAcademyNav(
  masters: MasterRow[],
  opts: {
    categoryFilter: AcademyCategoryFilter;
    countryFilter: string;
    coachingFamily: string | null;
    coachingVariant: CoachingVariant | null;
    search: string;
    statusFilter: "all" | "active" | "review";
    /** Admin: include inactive rows in lists (marked with inactive flag). */
    includeInactive?: boolean;
  },
): { group: AcademyNavGroup | null; activeCount: number; reviewCount: number } {
  const q = opts.search.trim().toLowerCase();

  let activeCount = 0;
  let reviewCount = 0;

  const visaByCountry: Record<string, MasterRow[]> = {};
  const coachingRows: MasterRow[] = [];

  const includeInactive = !!opts.includeInactive;

  for (const m of masters) {
    if (!m.is_active && !includeInactive) continue;
    if (m.is_active) {
      activeCount++;
      const meta = metaOf(m);
      const needsReview = meta?.reviewStatus === "needs_review";
      if (needsReview) reviewCount++;
    }

    const meta = metaOf(m);
    const needsReview = meta?.reviewStatus === "needs_review";
    if (opts.statusFilter === "review" && !needsReview) continue;
    if (!matchesSearch(m, q)) continue;

    if (m.service_category === "visa_immigration") {
      if (!isAcademyVisaServiceRow(m)) continue;
      if (opts.categoryFilter !== "visa") continue;

      const countries = resolveServiceCountries(
        m.service,
        (m.service_library_countries ?? []).map((c) => c.country),
      );
      const buckets = countries.length > 0 ? countries : ["Unassigned"];
      for (const country of buckets) {
        visaByCountry[country] ??= [];
        if (!visaByCountry[country].some((x) => x.id === m.id)) {
          visaByCountry[country].push(m);
        }
      }
      continue;
    }

    if (m.service_category === "coaching_services") {
      if (opts.categoryFilter !== "coaching") continue;
      coachingRows.push(m);
    }
  }

  if (opts.categoryFilter === "visa") {
    const countryKeys = sortVisaCountries(Object.keys(visaByCountry));
    if (countryKeys.length === 0) {
      return { group: null, activeCount, reviewCount };
    }

    if (opts.countryFilter === "ALL") {
      return {
        group: {
          key: "visa",
          label: "Visa & Immigration",
          step: "countries",
          countryPickers: countryKeys.map((country) => ({
            country,
            countryBadge: countryBadgeCode(country),
            count: visaByCountry[country].length,
          })),
        },
        activeCount,
        reviewCount,
      };
    }

    const countryRows = visaByCountry[opts.countryFilter] ?? [];
    if (countryRows.length === 0) {
      return { group: null, activeCount, reviewCount };
    }

    return {
      group: {
        key: "visa",
        label: "Visa & Immigration",
        step: "services",
        items: sortItems(
          countryRows.map((m) =>
            toItem(
              m,
              metaOf(m)?.reviewStatus === "needs_review",
              countryBadgeCode(opts.countryFilter),
              opts.countryFilter,
              includeInactive,
            ),
          ),
        ),
      },
      activeCount,
      reviewCount,
    };
  }

  // Coaching flow — no country step
  if (coachingRows.length === 0) {
    return { group: null, activeCount, reviewCount };
  }

  if (!opts.coachingFamily) {
    const byFamily = new Map<string, MasterRow[]>();
    for (const m of coachingRows) {
      const key = coachingFamilyKey(m);
      byFamily.set(key, [...(byFamily.get(key) ?? []), m]);
    }
    const families = [...byFamily.entries()].sort(([a], [b]) => a.localeCompare(b));
    return {
      group: {
        key: "coaching",
        label: "Coaching",
        step: "coaching_families",
        coachingFamilies: families.map(([key, rows]) => ({
          key,
          label: coachingFamilyLabel(key),
          count: rows.length,
        })),
      },
      activeCount,
      reviewCount,
    };
  }

  const familyRows = coachingRows.filter((m) => coachingFamilyKey(m) === opts.coachingFamily);
  if (familyRows.length === 0) {
    return { group: null, activeCount, reviewCount };
  }

  const variantSet = new Set(familyRows.map((m) => coachingVariantOf(m)));
  const hasGeneralAcademicSplit =
    opts.coachingFamily.toLowerCase() === "ielts" ||
    (variantSet.has("general") && variantSet.has("academic"));

  if (hasGeneralAcademicSplit && !opts.coachingVariant) {
    const variants: CoachingVariant[] = ["general", "academic", "other"];
    return {
      group: {
        key: "coaching",
        label: coachingFamilyLabel(opts.coachingFamily),
        step: "coaching_variants",
        coachingVariants: variants
          .map((key) => ({
            key,
            label: coachingVariantLabel(key),
            count: familyRows.filter((m) => coachingVariantOf(m) === key).length,
          }))
          .filter((v) => v.count > 0),
      },
      activeCount,
      reviewCount,
    };
  }

  // Only IELTS (and similar general/academic splits) use format filtering.
  // Other families (CELPIP General, PTE Academic, French General / Custom) must not
  // default to variant "other" — their labels contain "general" or "academic" as test names.
  const variantFilter = hasGeneralAcademicSplit ? opts.coachingVariant : null;
  const filteredByVariant = variantFilter
    ? familyRows.filter((m) => coachingVariantOf(m) === variantFilter)
    : familyRows;
  const serviceRows = dropGenericCoachingParent(filteredByVariant, opts.coachingFamily);

  return {
    group: {
      key: "coaching",
      label: coachingFamilyLabel(opts.coachingFamily),
      step: "services",
      items: sortItems(
        serviceRows.map((m) =>
          toItem(m, metaOf(m)?.reviewStatus === "needs_review", undefined, undefined, includeInactive),
        ),
      ),
    },
    activeCount,
    reviewCount,
  };
}

export function flattenNavItemIds(group: AcademyNavGroup | null): string[] {
  if (!group?.items) return [];
  return group.items.map((i) => i.id);
}

/** Resolve nav filters so a deep-linked library id opens the service detail, not a picker step. */
export function resolveAcademyDeepLinkContext(
  masters: MasterRow[],
  libraryId: string,
): {
  category: AcademyCategoryFilter;
  country: string | null;
  coachingFamily: string | null;
  coachingVariant: CoachingVariant | null;
} | null {
  const m = masters.find((row) => row.id === libraryId);
  if (!m) return null;

  if (m.service_category === "coaching_services") {
    const family = coachingFamilyKey(m);
    const variant = coachingVariantOf(m);
    const familyRows = masters.filter(
      (row) => row.service_category === "coaching_services" && coachingFamilyKey(row) === family,
    );
    const variantSet = new Set(familyRows.map((row) => coachingVariantOf(row)));
    const hasGeneralAcademicSplit =
      family.toLowerCase() === "ielts" ||
      (variantSet.has("general") && variantSet.has("academic"));

    return {
      category: "coaching",
      country: null,
      coachingFamily: family,
      coachingVariant: hasGeneralAcademicSplit ? variant : null,
    };
  }

  if (m.service_category === "visa_immigration" && isAcademyVisaServiceRow(m)) {
    const countries = resolveServiceCountries(
      m.service,
      (m.service_library_countries ?? []).map((c) => c.country),
    );
    return {
      category: "visa",
      country: countries[0] ?? null,
      coachingFamily: null,
      coachingVariant: null,
    };
  }

  return null;
}

export function groupItemCount(group: AcademyNavGroup | null): number {
  if (!group) return 0;
  if (group.items) return group.items.length;
  if (group.countryPickers) return group.countryPickers.reduce((n, c) => n + c.count, 0);
  if (group.subBuckets) return group.subBuckets.reduce((n, b) => n + b.count, 0);
  if (group.coachingFamilies) return group.coachingFamilies.reduce((n, f) => n + f.count, 0);
  if (group.coachingVariants) return group.coachingVariants.reduce((n, v) => n + v.count, 0);
  return 0;
}
