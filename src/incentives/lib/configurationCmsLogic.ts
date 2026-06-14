export interface ConfigurationTile {
  id: string;
  title: string;
  description: string;
  to: string;
  status: "configured" | "review" | "roadmap";
}

export interface InvoiceControlRule {
  id: string;
  label: string;
  enabled: boolean;
}

export interface ServiceCatalogCategory {
  id: string;
  label: string;
  pillClass: string;
  examples: string[];
}

export interface ConfigurationCmsKpis {
  configAreas: number;
  invoiceRules: number;
  serviceCategories: number;
  departments: number;
}

export const CONFIGURATION_TILES: ConfigurationTile[] = [
  {
    id: "approvals",
    title: "Approval thresholds",
    description: "Auto / manager / director limits per branch & service",
    to: "/performance/admin/approvals#floor-policy",
    status: "configured",
  },
  {
    id: "discounts",
    title: "Discount ceilings",
    description: "Max % and max amount by role, service, country",
    to: "/performance/wallet/policy",
    status: "configured",
  },
  {
    id: "wallet",
    title: "Wallet rules",
    description: "Carry-forward, expiry, freeze & transfer policies",
    to: "/performance/wallet/policy",
    status: "configured",
  },
  {
    id: "fx",
    title: "Currency & FX",
    description: "Base currency, rate source, manual override window",
    to: "/incentives/fx-rates",
    status: "configured",
  },
  {
    id: "incentives",
    title: "Incentive policies",
    description: "Slabs, bonuses, stacking and payout cycles",
    to: "/performance/incentives/plans",
    status: "configured",
  },
  {
    id: "combinations",
    title: "Services & combinations",
    description: "Add services; engine auto-generates combinations",
    to: "/performance/combinations",
    status: "configured",
  },
  {
    id: "branches",
    title: "Branches & regions",
    description: "Onboard branches, regions and future countries",
    to: "/masters",
    status: "configured",
  },
  {
    id: "roles",
    title: "Roles & access",
    description: "Define roles and module-level capabilities",
    to: "/performance/roles",
    status: "configured",
  },
];

export const ELIGIBILITY_AUDIENCE = [
  "New leads",
  "New clients",
  "Existing clients",
  "Re-enrolled clients",
  "Specific lead statuses",
];

export const ELIGIBILITY_HISTORY_CHECKS = [
  "Previous enrollments",
  "Previous invoices",
  "Previous payments",
  "Services already purchased",
];

export const INVOICE_COMMERCIAL_CONTROLS: InvoiceControlRule[] = [
  { id: "pre_finalize", label: "Discounts only before invoice finalization", enabled: true },
  { id: "block_code", label: "Block offer code after invoice approved", enabled: true },
  { id: "block_wallet", label: "Block wallet use after any payment received", enabled: true },
  { id: "auto_lock", label: "Auto-lock commercial terms when payment activity begins", enabled: true },
  { id: "override", label: "Allow authorised override (with audit)", enabled: false },
];

export const SERVICE_CATALOG_CATEGORIES: ServiceCatalogCategory[] = [
  {
    id: "coaching",
    label: "Coaching",
    pillClass: "ph-badge-cash",
    examples: ["IELTS", "PTE", "French A1", "German A1"],
  },
  {
    id: "study",
    label: "Study Abroad Destinations",
    pillClass: "ph-badge-wallet",
    examples: ["Canada", "UK", "Australia", "Germany"],
  },
  {
    id: "immigration",
    label: "Immigration / Settlement",
    pillClass: "bg-violet-100 text-violet-800",
    examples: ["Canada PR", "Germany Opportunity Card", "UK Skilled Worker"],
  },
  {
    id: "visa",
    label: "Visa Categories",
    pillClass: "bg-amber-100 text-amber-800",
    examples: ["Study permit", "Visitor", "Work permit"],
  },
  {
    id: "allied",
    label: "Allied Services",
    pillClass: "bg-emerald-100 text-emerald-800",
    examples: ["GIC", "Medical", "Travel insurance"],
  },
];

export const CMS_DEPARTMENTS = [
  "Study Abroad",
  "Immigration",
  "Coaching",
  "Allied",
  "Finance",
  "Operations",
  "Marketing",
  "HR",
  "Visa",
  "Documentation",
  "Telecalling",
];

export const AI_ROADMAP_FEATURES = [
  {
    title: "Discount optimizer",
    description: "Suggests the minimum discount likely to convert each lead",
  },
  {
    title: "Campaign ROI forecast",
    description: "Predicts revenue & enrollment before a promotion launches",
  },
  {
    title: "Anomaly detection",
    description: "Flags unusual discount patterns and wallet over-consumption",
  },
];

export function configurationCmsKpis(): ConfigurationCmsKpis {
  return {
    configAreas: CONFIGURATION_TILES.length,
    invoiceRules: INVOICE_COMMERCIAL_CONTROLS.filter((r) => r.enabled).length,
    serviceCategories: SERVICE_CATALOG_CATEGORIES.length,
    departments: CMS_DEPARTMENTS.length,
  };
}

export function tileStatusLabel(status: ConfigurationTile["status"]): string {
  if (status === "configured") return "Configured";
  if (status === "review") return "Review";
  return "Roadmap";
}
