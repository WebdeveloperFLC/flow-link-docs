import type {
  AccountingTreatment,
  CollectionCategory,
  LineClassificationKind,
  TaxMode,
} from "../types/collectionCategory";

/** Map accounting treatment → bridge line classification. */
export function treatmentToClassification(treatment: AccountingTreatment): LineClassificationKind {
  switch (treatment) {
    case "REVENUE":
      return "REVENUE";
    case "THIRD_PARTY":
      return "TRUST";
    case "INSTITUTION_RELATED":
      return "INSTITUTION";
    case "RECOVERABLE":
      return "RECOVERABLE";
    case "REIMBURSEMENT":
      return "REIMBURSEMENT";
    default:
      return "TRUST";
  }
}

/** Resolve the journal role_key for a category. */
export function resolveCategoryRoleKey(cat: CollectionCategory): string {
  if (cat.coa?.roleKey) return cat.coa.roleKey;
  switch (cat.accountingTreatment) {
    case "REVENUE":
      return cat.defaultRevenueRoleKey || "REVENUE_SERVICE";
    case "RECOVERABLE":
      return cat.defaultRecoverableRoleKey || "REC_CAT_DEFAULT";
    case "REIMBURSEMENT":
      return cat.defaultReimbursementRoleKey || "EMP_REIMB_PAYABLE";
    case "INSTITUTION_RELATED":
      return cat.defaultTrustRoleKey || cat.coa?.roleKey || "INST_CAT_TUITION";
    default:
      return cat.defaultTrustRoleKey || "TRUST_OTHER";
  }
}

/** Whether category can be used on new invoices / services. */
export function isCategoryUsable(cat: CollectionCategory): boolean {
  return cat.lifecycleStatus === "ACTIVE" && !cat.isPostingGroup;
}

/** Display label for UI (replaces trustBucketLabel). */
export function categoryDisplayLabel(cat: Pick<CollectionCategory, "name" | "code" | "expectedPayeeName">): string {
  if (cat.expectedPayeeName) return `${cat.name} → ${cat.expectedPayeeName}`;
  return cat.name || cat.code;
}

/** Build a flat map id → category from hydrated list. */
export function categoryMapById(categories: CollectionCategory[]): Map<string, CollectionCategory> {
  return new Map(categories.map((c) => [c.id, c]));
}

/** Build code → category for legacy fallback. */
export function categoryMapByCode(categories: CollectionCategory[]): Map<string, CollectionCategory> {
  return new Map(categories.map((c) => [c.code.toUpperCase(), c]));
}

/** Legacy role_key → category (for dual-read backfill). */
export function categoryMapByRoleKey(categories: CollectionCategory[]): Map<string, CollectionCategory> {
  const m = new Map<string, CollectionCategory>();
  for (const c of categories) {
    const role = resolveCategoryRoleKey(c);
    m.set(role, c);
    if (c.defaultTrustRoleKey) m.set(c.defaultTrustRoleKey, c);
    if (c.defaultRevenueRoleKey) m.set(c.defaultRevenueRoleKey, c);
  }
  return m;
}

export interface ClassifiedLineMeta {
  collectionCategoryId?: string | null;
  categoryCode?: string | null;
  classification: LineClassificationKind;
  roleKey: string;
  accountingTreatment: AccountingTreatment;
  expectedPayeeName?: string | null;
  defaultTaxCode?: string | null;
  defaultTaxMode: TaxMode;
}

/**
 * Resolve line classification from persisted line data + category master.
 * Falls back to legacy regex only when no category master is loaded (tests).
 */
export function resolveLineClassification(
  lineItem: Record<string, unknown>,
  lineIndex: number,
  categoriesById: Map<string, CollectionCategory>,
  categoriesByRole: Map<string, CollectionCategory>,
): ClassifiedLineMeta {
  const categoryId = String(lineItem.collection_category_id ?? "");
  let cat = categoryId ? categoriesById.get(categoryId) : undefined;

  if (!cat && lineItem.role_key) {
    cat = categoriesByRole.get(String(lineItem.role_key));
  }

  if (cat && isCategoryUsable(cat)) {
    return {
      collectionCategoryId: cat.id,
      categoryCode: cat.code,
      classification: treatmentToClassification(cat.accountingTreatment),
      roleKey: resolveCategoryRoleKey(cat),
      accountingTreatment: cat.accountingTreatment,
      expectedPayeeName: cat.expectedPayeeName ?? undefined,
      defaultTaxCode: cat.defaultTaxCode ?? undefined,
      defaultTaxMode: cat.defaultTaxMode,
    };
  }

  // Legacy regex fallback (deprecated — kept for unit tests without DB)
  return legacyRegexClassification(String(
    lineItem.service_name ?? lineItem.description ?? lineItem.service_code ?? `Line ${lineIndex + 1}`,
  ));
}

/** @deprecated Use category master. Kept for tests and unmigrated lines. */
function legacyRegexClassification(label: string): ClassifiedLineMeta {
  const trustRules: Array<[RegExp, string, string]> = [
    [/tuition|college fee|university fee|semester|program fee|course fee/i, "TRUST_TUITION", "TUITION"],
    [/embassy|visa fee|irrc|vfs|consulate|sevis|study permit fee/i, "TRUST_EMBASSY", "VISA_FEE"],
    [/application fee|app fee/i, "TRUST_APPLICATION", "APPLICATION_FEE"],
    [/\bgic\b/i, "TRUST_GIC", "GIC"],
    [/biometric/i, "TRUST_BIOMETRICS", "BIOMETRIC_FEE"],
    [/insurance/i, "TRUST_CAT_INSURANCE", "INSURANCE"],
    [/ielts/i, "TRUST_CAT_IELTS", "IELTS"],
    [/medical|police|\bpcc\b/i, "TRUST_MEDICAL", "MEDICAL"],
    [/\bwes\b|credential eval|notar|courier|dispatch|loan processing/i, "TRUST_OTHER", "OTHER"],
  ];
  const revenueRules: Array<[RegExp, string]> = [
    [/coaching|ielts|pte|toefl|language|mock test/i, "REVENUE_COACHING"],
    [/visa|immigration|study abroad|consult|service fee/i, "REVENUE_VISA"],
  ];
  for (const [rx, role, code] of trustRules) {
    if (rx.test(label)) {
      return {
        categoryCode: code,
        classification: "TRUST",
        roleKey: role,
        accountingTreatment: "THIRD_PARTY",
        defaultTaxMode: "EXEMPT",
      };
    }
  }
  for (const [rx, role] of revenueRules) {
    if (rx.test(label)) {
      return {
        classification: "REVENUE",
        roleKey: role,
        accountingTreatment: "REVENUE",
        defaultTaxMode: "EXCLUSIVE",
      };
    }
  }
  return {
    classification: "REVENUE",
    roleKey: "REVENUE_SERVICE",
    accountingTreatment: "REVENUE",
    defaultTaxMode: "EXCLUSIVE",
  };
}

/** Flatten tree for select options (leaves only, active). */
export function flattenActiveLeaves(categories: CollectionCategory[]): CollectionCategory[] {
  const out: CollectionCategory[] = [];
  const walk = (nodes: CollectionCategory[], prefix = "") => {
    for (const n of nodes) {
      const label = prefix ? `${prefix} › ${n.name}` : n.name;
      if (n.children?.length) walk(n.children, label);
      else if (isCategoryUsable(n)) out.push({ ...n, name: label });
    }
  };
  walk(buildCategoryTree(categories));
  return out;
}

/** Build tree from flat list. */
export function buildCategoryTree(flat: CollectionCategory[]): CollectionCategory[] {
  const byId = new Map(flat.map((c) => [c.id, { ...c, children: [] as CollectionCategory[] }]));
  const roots: CollectionCategory[] = [];
  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children!.push(c);
    } else {
      roots.push(c);
    }
  }
  const sortRec = (nodes: CollectionCategory[]) => {
    nodes.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    nodes.forEach((n) => n.children && sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export const LIFECYCLE_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export const TREATMENT_LABELS: Record<AccountingTreatment, string> = {
  REVENUE: "Revenue",
  THIRD_PARTY: "Third Party Collection",
  RECOVERABLE: "Student Recoverable",
  REIMBURSEMENT: "Employee Reimbursement",
  INSTITUTION_RELATED: "Institution Related Collection",
};
