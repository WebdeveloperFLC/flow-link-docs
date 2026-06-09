import {
  classifyCoachingVariant,
  coachingFamilyLabel,
  coachingVariantLabel,
  type CoachingVariant,
} from "@/lib/service-library/serviceNavClassification";

/** Minimal catalogue shape used by lead-form grouping (avoids circular import with leads.ts). */
export interface ServicePickerCatalogueItem {
  id: string;
  master_key?: string;
  service_code?: string | null;
  service_name: string;
  sub_category?: string | null;
  group_key?: string | null;
  group_label?: string | null;
  display_order: number;
  notes?: string | null;
  fee_inr?: number | null;
  pricing_type?: string;
}

export type ServicePickerTab =
  | "coaching_services"
  | "visa_services"
  | "allied_travel"
  | "admission_services";

const COACHING_CATEGORY_BUCKETS = new Set([
  "european languages",
  "english proficiency",
  "graduate admissions",
  "test reference",
]);

const ALLIED_ADMISSION_GROUP_LABELS = new Set([
  "documentation",
  "financial",
  "communication",
  "interview",
  "appointments",
  "ticketing",
  "travel",
  "insurance",
  "accommodation",
  "application assistance",
  "graduate admissions",
  "undergraduate admissions",
  "postgraduate admissions",
]);

const COACHING_FAMILY_PATTERNS: [RegExp, string][] = [
  [/^IELTS\b/i, "IELTS"],
  [/^PTE(?:\s+Academic)?\b/i, "PTE"],
  [/^CELPIP(?:\s+General)?\b/i, "CELPIP"],
  [/^TOEFL(?:\s+iBT)?\b/i, "TOEFL"],
  [/^French Language(?:\s|$)/i, "French Language"],
  [/^German(?:\s+Language)?(?:\s|$)/i, "German Language"],
  [/^Spanish(?:\s+Language)?(?:\s|$)/i, "Spanish Language"],
  [/^Duolingo(?:\s+English Test)?\b/i, "Duolingo English Test"],
  [/^GRE\b/i, "GRE"],
  [/^GMAT\b/i, "GMAT"],
  [/^SAT\b/i, "SAT"],
  [/^Spoken English\b/i, "Spoken English"],
];

function matchCoachingFamily(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  for (const [pattern, label] of COACHING_FAMILY_PATTERNS) {
    if (pattern.test(trimmed)) return label;
  }
  return null;
}

function isCategoryBucket(value: string, buckets: Set<string>): boolean {
  return buckets.has(value.trim().toLowerCase());
}

/** Resolve coaching family from service_library fields without DB normalization. */
export function resolveCoachingFamilyKey(serviceField: string, subService: string): string {
  const svc = serviceField.trim();
  const sub = subService.trim();

  // Pattern match first — handles inverted rows (variant in service, family in sub_service).
  const fromService = matchCoachingFamily(svc);
  if (fromService) return fromService;

  if (sub && !isCategoryBucket(sub, COACHING_CATEGORY_BUCKETS)) {
    const fromSub = matchCoachingFamily(sub);
    if (fromSub) return fromSub;
  }

  // Canonical row: service = family, sub_service = variant label.
  if (sub && !isCategoryBucket(sub, COACHING_CATEGORY_BUCKETS)) {
    return coachingFamilyLabel(svc);
  }

  // Category bucket in sub_service — service field is the family / SKU name.
  if (isCategoryBucket(sub, COACHING_CATEGORY_BUCKETS)) {
    return coachingFamilyLabel(svc);
  }

  return coachingFamilyLabel(svc || sub || "Other");
}

/** Human-readable variant label for a coaching catalogue row. */
export function resolveCoachingVariantLabel(
  serviceField: string,
  subService: string,
  displayName?: string | null,
): string {
  if (displayName?.trim()) return displayName.trim();

  const svc = serviceField.trim();
  const sub = subService.trim();
  if (!svc && !sub) return "Other";

  const familyKey = resolveCoachingFamilyKey(svc, sub);
  const familyNorm = familyKey.toLowerCase();

  if (isCategoryBucket(sub, COACHING_CATEGORY_BUCKETS)) {
    return svc || sub;
  }

  if (svc.toLowerCase() === familyNorm) {
    return sub || svc;
  }

  if (sub.toLowerCase() === familyNorm) {
    return svc;
  }

  if (matchCoachingFamily(svc)) {
    return svc;
  }

  return sub || svc;
}

export function resolveAlliedAdmissionGrouping(
  serviceField: string,
  subService: string,
  variantLabel: string,
): { groupKey: string; groupLabel: string; itemLabel: string } {
  const svc = serviceField.trim();
  const sub = subService.trim();

  if (isCategoryBucket(sub, ALLIED_ADMISSION_GROUP_LABELS)) {
    return { groupKey: sub, groupLabel: sub, itemLabel: variantLabel || svc };
  }
  if (isCategoryBucket(svc, ALLIED_ADMISSION_GROUP_LABELS)) {
    return { groupKey: svc, groupLabel: svc, itemLabel: variantLabel || sub };
  }

  const fallback = svc || sub || "Other";
  return { groupKey: fallback, groupLabel: fallback, itemLabel: variantLabel || sub || svc };
}

export interface ServicePickerSection {
  key: string;
  label: string;
  items: ServicePickerCatalogueItem[];
}

export interface ServicePickerGroup {
  key: string;
  label: string;
  items: ServicePickerCatalogueItem[];
  sections?: ServicePickerSection[];
}

function sortCatalogueItems(items: ServicePickerCatalogueItem[]): ServicePickerCatalogueItem[] {
  return [...items].sort((a, b) => {
    const order = (a.display_order ?? 0) - (b.display_order ?? 0);
    if (order !== 0) return order;
    return a.service_name.localeCompare(b.service_name);
  });
}

function hasGeneralAcademicSplit(items: ServicePickerCatalogueItem[]): boolean {
  const variants = new Set(
    items.map((item) =>
      classifyCoachingVariant(item.service_name, item.group_label ?? undefined),
    ),
  );
  return variants.has("general") && variants.has("academic");
}

function buildCoachingSections(items: ServicePickerCatalogueItem[]): ServicePickerSection[] {
  const variantOrder: CoachingVariant[] = ["general", "academic", "other"];
  return variantOrder
    .map((variant) => ({
      key: variant,
      label: coachingVariantLabel(variant),
      items: sortCatalogueItems(
        items.filter(
          (item) =>
            classifyCoachingVariant(item.service_name, item.group_label ?? undefined) === variant,
        ),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function shouldUseGroupedPicker(
  tab: ServicePickerTab,
  items: ServicePickerCatalogueItem[],
): boolean {
  if (items.length <= 1) return false;
  if (tab === "coaching_services" || tab === "visa_services") return true;

  const byGroup = new Map<string, number>();
  for (const item of items) {
    const key = item.group_key ?? item.service_name;
    byGroup.set(key, (byGroup.get(key) ?? 0) + 1);
  }

  return byGroup.size > 1 || [...byGroup.values()].some((count) => count > 1);
}

function dropGenericParentPlaceholder(items: ServicePickerCatalogueItem[], familyLabel: string): ServicePickerCatalogueItem[] {
  if (items.length <= 1) return items;

  const familyNorm = familyLabel.trim().toLowerCase();
  const hasSpecificVariant = items.some((item) => {
    const name = item.service_name.trim().toLowerCase();
    return name !== familyNorm && name.startsWith(familyNorm);
  });

  if (!hasSpecificVariant) return items;

  return items.filter((item) => item.service_name.trim().toLowerCase() !== familyNorm);
}

export function groupCatalogueItems(
  items: ServicePickerCatalogueItem[],
  tab: ServicePickerTab,
): ServicePickerGroup[] {
  const byGroup = new Map<string, ServicePickerCatalogueItem[]>();
  for (const item of items) {
    const key = item.group_key ?? item.service_name;
    byGroup.set(key, [...(byGroup.get(key) ?? []), item]);
  }

  const groups = [...byGroup.entries()].map(([key, groupItems]) => {
    const label = groupItems[0]?.group_label ?? coachingFamilyLabel(key);
    const filtered =
      tab === "coaching_services" ? dropGenericParentPlaceholder(groupItems, label) : groupItems;
    const sorted = sortCatalogueItems(filtered);

    if (tab === "coaching_services" && key.toLowerCase() === "ielts" && hasGeneralAcademicSplit(sorted)) {
      return {
        key,
        label: coachingFamilyLabel(key),
        items: sorted,
        sections: buildCoachingSections(sorted),
      };
    }

    return { key, label, items: sorted };
  });

  return groups.filter((group) => group.items.length > 0).sort((a, b) => a.label.localeCompare(b.label));
}

export function groupsWithSelection(
  groups: ServicePickerGroup[],
  selectedCodes: Set<string>,
): string[] {
  return groups
    .filter((group) =>
      group.items.some((item) => selectedCodes.has(item.service_code || item.id)),
    )
    .map((group) => group.key);
}
