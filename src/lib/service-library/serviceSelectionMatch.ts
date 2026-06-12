import type { ServiceCatalogueItem } from "@/lib/leads";
import {
  findCatalogueItemForStoredCode,
  isUuidServiceCode,
  parseStoredServiceCode,
} from "@/lib/service-library/resolveServiceLabel";

/** Legacy master_services codes → canonical service_library picker codes. */
export const LEGACY_SERVICE_CODES: Record<string, string> = {
  "VIS-CA-STUD": "c35e6051-f40f-47bf-9cac-0a386c47a336::Canada::fresh-outside",
  "VIS-CA-PGWP": "b2000001-0001-4000-8000-000000000014::Canada::pgwp",
  "VIS-CA-WORK": "b2000001-0001-4000-8000-000000000015::Canada",
  "VIS-CA-VISIT": "b2000001-0001-4000-8000-000000000011::Canada",
  "VIS-CA-SPOUS": "b2000001-0001-4000-8000-000000000012::Canada",
  "VIS-CA-BOWP": "b2000001-0001-4000-8000-000000000017::Canada",
  "VIS-CA-STEXT": "b2000001-0001-4000-8000-000000000018::Canada",
  "VIS-AU-SPOUS": "b2000001-0001-4000-8000-000000000043::Australia",
};

export function catalogueItemCode(item: ServiceCatalogueItem): string {
  return item.service_code || item.id;
}

/** Stable key for comparing stored client codes with catalogue picker rows. */
export function serviceSelectionIdentity(code: string): string {
  const trimmed = code.trim();
  if (!isUuidServiceCode(trimmed)) return trimmed.toLowerCase();
  const { libraryId, country, variantKey } = parseStoredServiceCode(trimmed);
  return `${libraryId}|${(country ?? "").toLowerCase()}|${(variantKey ?? "").toLowerCase()}`;
}

/** Upgrade legacy / parent-only codes to catalogue picker codes when unambiguous. */
export function normalizeStoredServiceCode(
  code: string,
  catalogue: ServiceCatalogueItem[],
): string {
  const trimmed = code.trim();
  const legacy = LEGACY_SERVICE_CODES[trimmed.toUpperCase()];
  if (legacy) return legacy;

  if (!isUuidServiceCode(trimmed)) return trimmed;

  const { libraryId, country, variantKey } = parseStoredServiceCode(trimmed);
  if (variantKey || !country) return trimmed;

  const prefix = `${libraryId}::${country}::`;
  const variants = catalogue
    .filter((s) => (s.service_code || s.id).startsWith(prefix))
    .map(catalogueItemCode);
  if (variants.length === 1) return variants[0]!;

  return trimmed;
}

function hasSpecificVariantStored(
  allStoredCodes: readonly string[],
  libraryId: string,
  country: string,
  excludeCode: string,
): boolean {
  const countryNorm = country.toLowerCase();
  return allStoredCodes.some((other) => {
    if (other === excludeCode) return false;
    const p = parseStoredServiceCode(other);
    return (
      p.libraryId === libraryId &&
      (p.country ?? "").toLowerCase() === countryNorm &&
      !!p.variantKey
    );
  });
}

function samePickerRow(
  storedCode: string,
  pickerCode: string,
  catalogue: ServiceCatalogueItem[],
  allStoredCodes: readonly string[],
): boolean {
  const storedNorm = normalizeStoredServiceCode(storedCode, catalogue);
  const pickerNorm = normalizeStoredServiceCode(pickerCode, catalogue);

  if (storedNorm === pickerNorm || storedCode === pickerCode) return true;

  const storedId = serviceSelectionIdentity(storedNorm);
  const pickerId = serviceSelectionIdentity(pickerNorm);
  if (storedId === pickerId && storedId.includes("|")) return true;

  const resolved = findCatalogueItemForStoredCode(storedNorm, catalogue);
  if (resolved) {
    const resolvedCode = catalogueItemCode(resolved);
    if (resolvedCode === pickerNorm || resolvedCode === pickerCode) return true;
    if (serviceSelectionIdentity(resolvedCode) === pickerId) return true;
  }

  const stored = parseStoredServiceCode(storedNorm);
  const picker = parseStoredServiceCode(pickerNorm);
  if (!isUuidServiceCode(storedNorm) || stored.libraryId !== picker.libraryId) return false;

  const storedCountry = (stored.country ?? "").toLowerCase();
  const pickerCountry = (picker.country ?? "").toLowerCase();
  if (storedCountry && pickerCountry && storedCountry !== pickerCountry) return false;

  if (stored.variantKey && picker.variantKey) {
    return stored.variantKey.toLowerCase() === picker.variantKey.toLowerCase();
  }

  // Parent code `uuid::Country` (no variant) — match variant row when no specific variant stored.
  if (!stored.variantKey && picker.variantKey && stored.country) {
    const parentForm = `${stored.libraryId}::${stored.country}`;
    if (
      (storedNorm === parentForm || storedCode === parentForm) &&
      !hasSpecificVariantStored(allStoredCodes, stored.libraryId, stored.country, storedCode)
    ) {
      return true;
    }
  }

  return false;
}

/** True when any stored client/lead code refers to this catalogue picker row. */
export function isServiceCodeSelected(
  storedCodes: readonly string[],
  catalogueItem: ServiceCatalogueItem,
  catalogue: ServiceCatalogueItem[],
): boolean {
  const pickerCode = catalogueItemCode(catalogueItem);
  return storedCodes.some((stored) =>
    samePickerRow(stored, pickerCode, catalogue, storedCodes),
  );
}

/** Toggle a picker row on/off; normalizes to catalogue service_code when adding. */
export function toggleServiceSelectionCodes(
  storedCodes: readonly string[],
  catalogueItem: ServiceCatalogueItem,
  catalogue: ServiceCatalogueItem[],
): string[] {
  const pickerCode = catalogueItemCode(catalogueItem);
  const isOn = isServiceCodeSelected(storedCodes, catalogueItem, catalogue);
  if (isOn) {
    return storedCodes.filter(
      (stored) => !samePickerRow(stored, pickerCode, catalogue, storedCodes),
    );
  }
  const withoutAliases = storedCodes.filter(
    (stored) => !samePickerRow(stored, pickerCode, catalogue, storedCodes),
  );
  return [...withoutAliases, pickerCode];
}

/** Remove one stored code and any aliases that refer to the same service. */
export function removeStoredServiceCode(
  storedCodes: readonly string[],
  codeToRemove: string,
  catalogue: ServiceCatalogueItem[],
): string[] {
  const item = findCatalogueItemForStoredCode(
    normalizeStoredServiceCode(codeToRemove, catalogue),
    catalogue,
  );
  if (item) {
    return storedCodes.filter(
      (stored) => !samePickerRow(stored, catalogueItemCode(item), catalogue, storedCodes),
    );
  }
  return storedCodes.filter((stored) => stored !== codeToRemove);
}
