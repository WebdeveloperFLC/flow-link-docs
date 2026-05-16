/**
 * Back-compat shim — vendor categories now live in the shared
 * accountingMastersStore so the same list shows up in AP bills,
 * vendor forms, and any other accounting picker.
 */
import {
  useMaster, getMaster, addMasterItem, masterLabel,
  type MasterItem,
} from "./accountingMastersStore";

export interface VendorCategoryItem { code: string; label: string }

export const useVendorCategories = (): VendorCategoryItem[] =>
  useMaster("vendor_categories") as VendorCategoryItem[];

export const getVendorCategoryLabel = (code: string): string =>
  masterLabel("vendor_categories", code);

export const addVendorCategory = (label: string): VendorCategoryItem | null => {
  const created: MasterItem | null = addMasterItem("vendor_categories", label);
  return created ? { code: created.code, label: created.label } : null;
};

export const vendorCategoryLabelMap = (): Record<string, string> =>
  Object.fromEntries(getMaster("vendor_categories").map((c) => [c.code, c.label]));