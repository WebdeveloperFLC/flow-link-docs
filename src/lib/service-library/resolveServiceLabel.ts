import { supabase } from "@/integrations/supabase/client";
import type { ServiceCatalogueItem } from "@/lib/leads";

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParsedServiceCode = {
  libraryId: string;
  country: string | null;
  variantKey: string | null;
};

export function parseStoredServiceCode(code: string): ParsedServiceCode {
  const parts = code.trim().split("::");
  return {
    libraryId: parts[0] ?? code,
    country: parts[1] ?? null,
    variantKey: parts[2] ?? null,
  };
}

export function isUuidServiceCode(code: string): boolean {
  return UUID_RX.test(parseStoredServiceCode(code).libraryId);
}

type ServiceLibraryRow = {
  id: string;
  service: string;
  sub_service: string;
  academy_metadata?: { displayName?: string } | null;
};

export function formatServiceLibraryLabel(row: ServiceLibraryRow): string {
  const displayName = (row.academy_metadata as { displayName?: string } | null)?.displayName?.trim();
  if (displayName) return displayName;

  const service = row.service.trim();
  const sub = row.sub_service.trim();
  if (service && sub && service.toLowerCase() !== sub.toLowerCase()) {
    return `${service} – ${sub}`;
  }
  return sub || service;
}

/** Match stored client/lead codes to catalogue rows (incl. variant parent aliases). */
export function findCatalogueItemForStoredCode(
  code: string,
  catalogue: ServiceCatalogueItem[],
): ServiceCatalogueItem | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const exact = catalogue.find((s) => (s.service_code || s.id) === trimmed);
  if (exact) return exact;

  if (!isUuidServiceCode(trimmed)) return null;

  const { libraryId, country, variantKey } = parseStoredServiceCode(trimmed);

  if (country && !variantKey) {
    const prefix = `${libraryId}::${country}::`;
    const variants = catalogue.filter((s) => (s.service_code || s.id).startsWith(prefix));
    if (variants.length > 0) {
      return { ...variants[0], service_code: trimmed, id: trimmed };
    }
  }

  const sameLibrary = catalogue.filter(
    (s) =>
      s.library_id === libraryId ||
      s.id === libraryId ||
      (s.service_code ?? "").startsWith(`${libraryId}::`),
  );
  if (sameLibrary.length === 0) return null;

  if (country) {
    const countryMatch = sameLibrary.find((s) => s.country_tag === country);
    if (countryMatch) return { ...countryMatch, service_code: trimmed, id: trimmed };
  }

  return { ...sameLibrary[0], service_code: trimmed, id: trimmed };
}

export function resolveServiceLabelSync(
  code: string,
  catalogue: ServiceCatalogueItem[],
  libraryLabels?: ReadonlyMap<string, string>,
): string {
  const trimmed = code.trim();
  if (!trimmed) return "—";

  if (!isUuidServiceCode(trimmed)) return trimmed;

  const item = findCatalogueItemForStoredCode(trimmed, catalogue);
  if (item?.service_name?.trim()) {
    const { libraryId, country, variantKey } = parseStoredServiceCode(trimmed);
    const itemCode = item.service_code || item.id;
    const isVariantPickerLabel =
      country &&
      !variantKey &&
      itemCode.includes("::") &&
      itemCode.split("::").length >= 3;
    if (!isVariantPickerLabel) return item.service_name.trim();

    const fromLibrary = libraryLabels?.get(libraryId);
    if (fromLibrary) return fromLibrary;
  }

  const { libraryId } = parseStoredServiceCode(trimmed);
  const fromLibrary = libraryLabels?.get(libraryId);
  if (fromLibrary) return fromLibrary;

  return trimmed;
}

export function collectUnresolvedLibraryIds(
  codes: string[],
  catalogue: ServiceCatalogueItem[],
  libraryLabels?: ReadonlyMap<string, string>,
): string[] {
  const ids = new Set<string>();
  for (const code of codes) {
    if (!isUuidServiceCode(code)) continue;
    const label = resolveServiceLabelSync(code, catalogue, libraryLabels);
    if (label === code.trim()) {
      ids.add(parseStoredServiceCode(code).libraryId);
    }
  }
  return [...ids];
}

export async function fetchServiceLibraryLabels(libraryIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(libraryIds.filter((id) => UUID_RX.test(id)))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("service_library")
    .select("id, service, sub_service, academy_metadata")
    .in("id", unique);

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of (data ?? []) as ServiceLibraryRow[]) {
    map.set(row.id, formatServiceLibraryLabel(row));
  }
  return map;
}

export function buildServiceLabelMap(
  codes: string[],
  catalogue: ServiceCatalogueItem[],
  libraryLabels?: ReadonlyMap<string, string>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const code of codes) {
    map.set(code, resolveServiceLabelSync(code, catalogue, libraryLabels));
  }
  return map;
}
