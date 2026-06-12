import type { ServiceCatalogueItem } from "@/lib/leads";
import {
  findCatalogueItemForStoredCode,
  isUuidServiceCode,
  parseStoredServiceCode,
} from "@/lib/service-library/resolveServiceLabel";

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

function samePickerRow(
  storedCode: string,
  pickerCode: string,
  catalogue: ServiceCatalogueItem[],
): boolean {
  if (storedCode === pickerCode) return true;

  const storedId = serviceSelectionIdentity(storedCode);
  const pickerId = serviceSelectionIdentity(pickerCode);
  if (storedId === pickerId && storedId.includes("|")) return true;

  const resolved = findCatalogueItemForStoredCode(storedCode, catalogue);
  if (resolved) {
    const resolvedCode = catalogueItemCode(resolved);
    if (resolvedCode === pickerCode) return true;
    if (serviceSelectionIdentity(resolvedCode) === pickerId) return true;
  }

  const stored = parseStoredServiceCode(storedCode);
  const picker = parseStoredServiceCode(pickerCode);
  if (!isUuidServiceCode(storedCode) || stored.libraryId !== picker.libraryId) return false;

  const storedCountry = (stored.country ?? "").toLowerCase();
  const pickerCountry = (picker.country ?? "").toLowerCase();
  if (storedCountry && pickerCountry && storedCountry !== pickerCountry) return false;

  if (stored.variantKey && picker.variantKey) {
    return stored.variantKey.toLowerCase() === picker.variantKey.toLowerCase();
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
  return storedCodes.some((stored) => samePickerRow(stored, pickerCode, catalogue));
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
      (stored) => !samePickerRow(stored, pickerCode, catalogue),
    );
  }
  const withoutAliases = storedCodes.filter(
    (stored) => !samePickerRow(stored, pickerCode, catalogue),
  );
  return [...withoutAliases, pickerCode];
}
