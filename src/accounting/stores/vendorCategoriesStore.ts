import { useSyncExternalStore } from "react";

export interface VendorCategoryItem {
  code: string;
  label: string;
}

const SEED: VendorCategoryItem[] = [
  { code: "PROFESSIONAL_SERVICES", label: "Professional services" },
  { code: "SOFTWARE", label: "Software" },
  { code: "OFFICE_SUPPLIES", label: "Office supplies" },
  { code: "TRAVEL", label: "Travel" },
  { code: "UTILITIES", label: "Utilities" },
  { code: "RENT", label: "Rent" },
  { code: "MARKETING", label: "Marketing" },
  { code: "CONTRACTOR", label: "Contractor" },
  { code: "TELECOM", label: "Telecom" },
];

let categories: VendorCategoryItem[] = [...SEED];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return categories;
}

function toCode(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function addVendorCategory(label: string): VendorCategoryItem | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const code = toCode(trimmed);
  if (categories.some((c) => c.code === code)) {
    return categories.find((c) => c.code === code) ?? null;
  }
  const item = { code, label: trimmed };
  categories = [...categories, item];
  emit();
  return item;
}

export function getVendorCategoryLabel(code: string): string {
  return categories.find((c) => c.code === code)?.label ?? code;
}

export function useVendorCategories(): VendorCategoryItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Back-compat helper: returns label map snapshot. */
export function vendorCategoryLabelMap(): Record<string, string> {
  return Object.fromEntries(categories.map((c) => [c.code, c.label]));
}