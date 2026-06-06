import type { Master } from "@/lib/serviceLibrary";
import { countryBadgeCode, sortVisaCountries, VISA_COUNTRY_PRIORITY } from "@/lib/service-library/countryBadges";

export type AcademyCategoryFilter = "visa" | "coaching" | "allied_travel";

export type AcademyServiceItem = {
  id: string;
  label: string;
  countryBadge?: string;
  needsReview?: boolean;
};

export type AcademyNavCountryPicker = {
  country: string;
  countryBadge: string;
  count: number;
};

export type AcademyNavGroup = {
  key: AcademyCategoryFilter;
  label: string;
  items?: AcademyServiceItem[];
  countryPickers?: AcademyNavCountryPicker[];
};

export const ACADEMY_CATEGORY_TABS: { key: AcademyCategoryFilter; label: string }[] = [
  { key: "visa", label: "Visa & Immigration" },
  { key: "coaching", label: "Coaching" },
  { key: "allied_travel", label: "Allied & Travel" },
];

type MasterRow = Master & {
  service_library_countries?: { country: string }[];
  academy_metadata?: unknown;
};

const LEGACY_SUB_SERVICES = new Set(["application", "assessment"]);

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

function itemLabel(m: MasterRow, activeCountry?: string): string {
  const meta = m.academy_metadata as { displayName?: string } | undefined;
  if (meta?.displayName) return meta.displayName;

  if (activeCountry && activeCountry !== "ALL") {
    return m.sub_service;
  }

  const countries = (m.service_library_countries ?? []).map((c) => c.country);
  const country = countries.length === 1 ? countries[0] : m.service;
  if (m.service_category === "visa_immigration" && country) {
    return `${country} – ${m.sub_service}`;
  }
  return m.sub_service;
}

function matchesSearch(m: MasterRow, q: string): boolean {
  if (!q) return true;
  const meta = m.academy_metadata as { displayName?: string; shortDescription?: string } | undefined;
  const hay = [
    m.service,
    m.sub_service,
    meta?.displayName,
    meta?.shortDescription,
    ...(m.service_library_countries ?? []).map((c) => c.country),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function toItem(m: MasterRow, needsReview: boolean, badge?: string, activeCountry?: string): AcademyServiceItem {
  return {
    id: m.id,
    label: itemLabel(m, activeCountry),
    countryBadge: badge,
    needsReview,
  };
}

function matchesCategory(m: MasterRow, category: AcademyCategoryFilter): boolean {
  if (category === "visa") return m.service_category === "visa_immigration";
  if (category === "coaching") return m.service_category === "coaching_services";
  return m.service_category === "allied_services" || m.service_category === "travel_financial";
}

export function buildAcademyNav(
  masters: MasterRow[],
  opts: {
    categoryFilter: AcademyCategoryFilter;
    countryFilter: string;
    search: string;
    statusFilter: "all" | "active" | "review";
  },
): { group: AcademyNavGroup | null; activeCount: number; reviewCount: number } {
  const q = opts.search.trim().toLowerCase();

  const coachingItems: AcademyServiceItem[] = [];
  const alliedTravelItems: AcademyServiceItem[] = [];
  const visaByCountry: Record<string, AcademyServiceItem[]> = {};
  const visaFlat: AcademyServiceItem[] = [];

  let activeCount = 0;
  let reviewCount = 0;

  for (const m of masters) {
    if (!m.is_active) continue;
    activeCount++;
    const meta = m.academy_metadata as { reviewStatus?: string } | undefined;
    const needsReview = meta?.reviewStatus === "needs_review";
    if (needsReview) reviewCount++;

    if (opts.statusFilter === "review" && !needsReview) continue;
    if (!matchesSearch(m, q)) continue;
    if (!matchesCategory(m, opts.categoryFilter)) continue;

    const countries = (m.service_library_countries ?? []).map((c) => c.country);

    if (m.service_category === "visa_immigration") {
      if (isLegacyVisaRow(m)) continue;

      if (opts.countryFilter !== "ALL") {
        if (!countries.includes(opts.countryFilter)) continue;
        visaFlat.push(toItem(m, needsReview, countryBadgeCode(opts.countryFilter), opts.countryFilter));
        continue;
      }
      const buckets = countries.length > 0 ? countries : ["Unassigned"];
      for (const country of buckets) {
        visaByCountry[country] ??= [];
        if (!visaByCountry[country].some((i) => i.id === m.id)) {
          visaByCountry[country].push(toItem(m, needsReview, countryBadgeCode(country), country));
        }
      }
      continue;
    }

    if (m.service_category === "coaching_services") {
      coachingItems.push(toItem(m, needsReview));
    } else {
      alliedTravelItems.push(toItem(m, needsReview));
    }
  }

  const sortItems = (items: AcademyServiceItem[]) =>
    [...items].sort((a, b) => a.label.localeCompare(b.label));

  for (const key of Object.keys(visaByCountry)) {
    visaByCountry[key] = sortItems(visaByCountry[key]);
  }

  if (opts.categoryFilter === "visa") {
    const visaCountryKeys = sortVisaCountries(Object.keys(visaByCountry));
    if (visaCountryKeys.length === 0) {
      return { group: null, activeCount, reviewCount };
    }
    if (opts.countryFilter !== "ALL") {
      return {
        group: {
          key: "visa",
          label: "Visa & Immigration",
          items: sortItems(visaFlat),
        },
        activeCount,
        reviewCount,
      };
    }
    return {
      group: {
        key: "visa",
        label: "Visa & Immigration",
        countryPickers: visaCountryKeys.map((country) => ({
          country,
          countryBadge: countryBadgeCode(country),
          count: visaByCountry[country].length,
        })),
      },
      activeCount,
      reviewCount,
    };
  }

  if (opts.categoryFilter === "coaching") {
    return {
      group: coachingItems.length
        ? { key: "coaching", label: "Coaching", items: sortItems(coachingItems) }
        : null,
      activeCount,
      reviewCount,
    };
  }

  return {
    group: alliedTravelItems.length
      ? { key: "allied_travel", label: "Allied & Travel", items: sortItems(alliedTravelItems) }
      : null,
    activeCount,
    reviewCount,
  };
}

export function flattenNavItemIds(group: AcademyNavGroup | null): string[] {
  if (!group?.items) return [];
  return group.items.map((i) => i.id);
}
