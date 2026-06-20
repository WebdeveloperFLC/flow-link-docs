import type { CollectionCategory } from "../types/collectionCategory";
import { categoryDisplayLabel } from "./collectionCategories";
import { getCollectionCategoriesSync } from "../stores/collectionCategoriesStore";

/** @deprecated Use category master — kept for backward-compatible imports. */
export function trustBucketLabel(roleKey: string, categoryId?: string | null): string {
  const cats = getCollectionCategoriesSync();
  if (categoryId) {
    const c = cats.find((x) => x.id === categoryId);
    if (c) return categoryDisplayLabel(c);
  }
  const byRole = cats.find(
    (c) => c.defaultTrustRoleKey === roleKey || c.coa?.roleKey === roleKey || c.defaultRevenueRoleKey === roleKey,
  );
  if (byRole) return categoryDisplayLabel(byRole);
  return roleKey.replace(/^TRUST_CAT_|^TRUST_|^REV_CAT_|^INST_CAT_/g, "").replace(/_/g, " ");
}

export function categoryLabel(cat: Pick<CollectionCategory, "name" | "code" | "expectedPayeeName">): string {
  return categoryDisplayLabel(cat);
}
