import type { Master } from "@/lib/serviceLibrary";
import { countryBadgeCode, sortVisaCountries } from "@/lib/service-library/countryBadges";

export type AcademyServiceItem = {
  id: string;
  label: string;
  countryBadge?: string;
  needsReview?: boolean;
};

export type AcademyNavCountrySection = {
  country: string;
  countryBadge: string;
  items: AcademyServiceItem[];
};

export type AcademyNavGroup = {
  key: string;
  label: string;
  /** Flat list (education, financial, or visa when a country is selected). */
  items?: AcademyServiceItem[];
  /** Country sections (visa only, when country filter is ALL). */
  countries?: AcademyNavCountrySection[];
};

const GROUP_MAP: Record<string, { key: string; label: string }> = {
  visa_immigration: { key: "visa", label: "Visa & Immigration" },
  coaching_services: { key: "education", label: "Education Services" },
  allied_services: { key: "education", label: "Education Services" },
  travel_financial: { key: "financial", label: "Financial" },
};

type MasterRow = Master & {
  service_library_countries?: { country: string }[];
  academy_metadata?: unknown;
};

function itemLabel(m: MasterRow): string {
  const meta = m.academy_metadata as { displayName?: string } | undefined;
  if (meta?.displayName) return meta.displayName;
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

function toItem(m: MasterRow, needsReview: boolean, badge?: string): AcademyServiceItem {
  return {
    id: m.id,
    label: itemLabel(m),
    countryBadge: badge,
    needsReview,
  };
}

export function buildAcademyNav(
  masters: MasterRow[],
  opts: { countryFilter: string; search: string; statusFilter: "all" | "active" | "review" },
): { groups: AcademyNavGroup[]; activeCount: number; reviewCount: number } {
  const q = opts.search.trim().toLowerCase();

  const flatBuckets: Record<string, AcademyServiceItem[]> = {
    education: [],
    financial: [],
  };
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

    const g = GROUP_MAP[m.service_category];
    if (!g) continue;

    const countries = (m.service_library_countries ?? []).map((c) => c.country);

    if (m.service_category === "visa_immigration") {
      if (opts.countryFilter !== "ALL") {
        if (!countries.includes(opts.countryFilter)) continue;
        visaFlat.push(toItem(m, needsReview, countryBadgeCode(opts.countryFilter)));
        continue;
      }
      const buckets = countries.length > 0 ? countries : ["Unassigned"];
      for (const country of buckets) {
        visaByCountry[country] ??= [];
        visaByCountry[country].push(toItem(m, needsReview, countryBadgeCode(country)));
      }
      continue;
    }

    flatBuckets[g.key].push(toItem(m, needsReview));
  }

  const sortItems = (items: AcademyServiceItem[]) =>
    [...items].sort((a, b) => a.label.localeCompare(b.label));

  for (const key of Object.keys(visaByCountry)) {
    visaByCountry[key] = sortItems(visaByCountry[key]);
  }

  const groups: AcademyNavGroup[] = [];

  const visaCountryKeys = sortVisaCountries(Object.keys(visaByCountry));
  if (visaCountryKeys.length > 0) {
    if (opts.countryFilter !== "ALL") {
      groups.push({
        key: "visa",
        label: "Visa & Immigration",
        items: sortItems(visaFlat),
      });
    } else {
      groups.push({
        key: "visa",
        label: "Visa & Immigration",
        countries: visaCountryKeys.map((country) => ({
          country,
          countryBadge: countryBadgeCode(country),
          items: visaByCountry[country],
        })),
      });
    }
  }

  if (flatBuckets.education.length > 0) {
    groups.push({
      key: "education",
      label: "Education Services",
      items: sortItems(flatBuckets.education),
    });
  }
  if (flatBuckets.financial.length > 0) {
    groups.push({
      key: "financial",
      label: "Financial",
      items: sortItems(flatBuckets.financial),
    });
  }

  return { groups, activeCount, reviewCount };
}

/** Collect all selectable service ids from nav groups (depth-first). */
export function flattenNavItemIds(groups: AcademyNavGroup[]): string[] {
  const ids: string[] = [];
  for (const g of groups) {
    if (g.items) {
      for (const item of g.items) ids.push(item.id);
    }
    if (g.countries) {
      for (const section of g.countries) {
        for (const item of section.items) ids.push(item.id);
      }
    }
  }
  return ids;
}
