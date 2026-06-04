import type { Master } from "@/lib/serviceLibrary";

export type AcademyServiceItem = {
  id: string;
  label: string;
  countryBadge?: string;
  needsReview?: boolean;
};

export type AcademyNavGroup = {
  key: string;
  label: string;
  items: AcademyServiceItem[];
};

const GROUP_MAP: Record<string, { key: string; label: string }> = {
  visa_immigration: { key: "visa", label: "Visa & Immigration" },
  coaching_services: { key: "education", label: "Education Services" },
  allied_services: { key: "education", label: "Education Services" },
  travel_financial: { key: "financial", label: "Financial" },
};

export function buildAcademyNav(
  masters: (Master & {
    service_library_countries?: { country: string }[];
    academy_metadata?: unknown;
  })[],
  opts: { countryFilter: string; search: string; statusFilter: "all" | "active" | "review" },
): { groups: AcademyNavGroup[]; activeCount: number; reviewCount: number } {
  const q = opts.search.trim().toLowerCase();
  const buckets: Record<string, AcademyServiceItem[]> = {
    visa: [],
    education: [],
    financial: [],
  };

  let activeCount = 0;
  let reviewCount = 0;

  for (const m of masters) {
    if (!m.is_active) continue;
    activeCount++;
    const meta = m.academy_metadata as { reviewStatus?: string } | undefined;
    const needsReview = meta?.reviewStatus === "needs_review";
    if (needsReview) reviewCount++;

    if (opts.statusFilter === "review" && !needsReview) continue;
    if (q && !`${m.service} ${m.sub_service}`.toLowerCase().includes(q)) continue;

    const g = GROUP_MAP[m.service_category];
    if (!g) continue;

    const countries = (m.service_library_countries ?? []).map((c) => c.country);
    if (m.service_category === "visa_immigration") {
      if (opts.countryFilter !== "ALL" && !countries.includes(opts.countryFilter)) continue;
    }

    const badge =
      m.service_category === "visa_immigration" && countries.length === 1
        ? countries[0].slice(0, 2).toUpperCase()
        : undefined;

    buckets[g.key].push({
      id: m.id,
      label: m.sub_service,
      countryBadge: badge,
      needsReview,
    });
  }

  const groups: AcademyNavGroup[] = [
    { key: "visa", label: "Visa & Immigration", items: buckets.visa.sort((a, b) => a.label.localeCompare(b.label)) },
    {
      key: "education",
      label: "Education Services",
      items: buckets.education.sort((a, b) => a.label.localeCompare(b.label)),
    },
    { key: "financial", label: "Financial", items: buckets.financial.sort((a, b) => a.label.localeCompare(b.label)) },
  ].filter((g) => g.items.length > 0);

  return { groups, activeCount, reviewCount };
}
