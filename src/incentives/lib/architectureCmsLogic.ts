export interface ArchitectureTableRow {
  name: string;
  description: string;
  repoTable?: string;
}

export interface ArchitectureApiRow {
  method: "GET" | "POST" | "RPC";
  path: string;
  description: string;
  implementation?: string;
}

export interface ScalabilityPillar {
  title: string;
  description: string;
}

export interface ArchitectureCmsKpis {
  tables: number;
  apiEndpoints: number;
  pillars: number;
  rpcFunctions: number;
}

/** Core commercial entities — mapped to this repo's Supabase schema. */
export const ARCHITECTURE_TABLES: ArchitectureTableRow[] = [
  { name: "discount_wallets", description: "Wallet master — type, scope, allocation, rules", repoTable: "discount_wallets" },
  { name: "wallet_ledger", description: "Allocations & consumption ledger (append-only)", repoTable: "wallet_ledger" },
  { name: "wallet_allocations", description: "Applied discount debits linked to invoices", repoTable: "wallet_allocations" },
  { name: "offers", description: "Offer definitions & lifecycle", repoTable: "offers" },
  { name: "offer_events", description: "Redemption / send analytics log", repoTable: "offer_events" },
  { name: "service_combinations", description: "Logical & package combination definitions", repoTable: "service_combination_rules" },
  { name: "promotion_requests", description: "Promotion proposals & review workflow", repoTable: "promotion_requests" },
  { name: "incentive_plans", description: "Incentive rules, slabs & payout thresholds", repoTable: "incentive_plans" },
  { name: "incentive_line_items", description: "Earned amounts per counselor / run", repoTable: "incentive_line_items" },
  { name: "incentive_payouts", description: "Computed payouts per staff", repoTable: "incentive_payouts" },
  { name: "upi_commissions", description: "Partner / institution commission models", repoTable: "upi_commissions" },
  { name: "fx_rates", description: "Historical & override exchange rates", repoTable: "fx_rates" },
  { name: "discount_approval_requests", description: "Discount approval queue & routing", repoTable: "discount_approval_requests" },
  { name: "wallet_exception_requests", description: "Wallet top-up exception approvals", repoTable: "wallet_exception_requests" },
  { name: "fx_rate_audit_log", description: "FX override audit trail", repoTable: "fx_rate_audit_log" },
  { name: "branches", description: "Branch & region master (CRM inherited)", repoTable: "branches" },
  { name: "profiles / user_roles", description: "Identity & RBAC", repoTable: "profiles" },
  { name: "client_invoices", description: "Commercial invoice facts (CRM + accounting)", repoTable: "client_invoices" },
];

/** Reference REST surface — implemented via Supabase RPC + RLS in this repo. */
export const ARCHITECTURE_API_ROWS: ArchitectureApiRow[] = [
  { method: "GET", path: "/api/v1/wallets", description: "List & filter wallets", implementation: "discount_wallets + RLS" },
  { method: "POST", path: "/api/v1/wallets", description: "Create wallet", implementation: "fn_create_strategic_wallet" },
  { method: "POST", path: "/api/v1/wallets/{id}/allocate", description: "Allocate / consume", implementation: "fn_apply_offer_discount" },
  { method: "GET", path: "/api/v1/offers", description: "List offers", implementation: "offers + offers RLS" },
  { method: "POST", path: "/api/v1/offers/{id}/redeem", description: "Apply offer to a lead", implementation: "fn_apply_offer_discount" },
  { method: "POST", path: "/api/v1/promotions", description: "Submit proposal", implementation: "promotion_requests INSERT" },
  { method: "POST", path: "/api/v1/approvals/{id}/decision", description: "Approve / reject", implementation: "fn_review_discount_request" },
  { method: "GET", path: "/api/v1/incentives/payouts", description: "Computed payouts", implementation: "incentive_payouts + ledger CMS" },
  { method: "GET", path: "/api/v1/commissions", description: "Commission ledger", implementation: "upi_commission_students" },
  { method: "GET", path: "/api/v1/fx/rates", description: "Current & historical FX", implementation: "fx_rates + fn_effective_fx_rate_to_inr" },
  { method: "GET", path: "/api/v1/reports/build", description: "Report builder query", implementation: "fn_commercial_profitability" },
  { method: "GET", path: "/api/v1/audit", description: "Query audit log", implementation: "wallet_ledger, offer_status_history, fx_rate_audit_log" },
  { method: "RPC", path: "fn_commercial_profitability", description: "Profitability by dimension", implementation: "Phase 3C migration" },
  { method: "RPC", path: "fn_review_wallet_exception_request", description: "Wallet exception decision", implementation: "Phase 5K" },
];

export const SCALABILITY_PILLARS: ScalabilityPillar[] = [
  {
    title: "Multi-tenant by region",
    description: "Branch & country partition keys; data residency per region (Canada, India, future).",
  },
  {
    title: "Currency-agnostic core",
    description: "All money stored as (amount, currency, fx_at_txn); consolidation computed on read.",
  },
  {
    title: "Stateless API + cache",
    description: "Supabase edge + Postgres; fx_rates and permission lookups cached per period.",
  },
  {
    title: "Event-driven audit",
    description: "Every mutation emits rows to append-only ledger / history tables.",
  },
  {
    title: "Config-as-data",
    description: "Rules, thresholds and combinations are data rows — new policy needs no deploy.",
  },
  {
    title: "Future countries",
    description: "Onboard a country by adding region, currency, services & branches — engine adapts.",
  },
];

export function architectureCmsKpis(): ArchitectureCmsKpis {
  return {
    tables: ARCHITECTURE_TABLES.length,
    apiEndpoints: ARCHITECTURE_API_ROWS.length,
    pillars: SCALABILITY_PILLARS.length,
    rpcFunctions: ARCHITECTURE_API_ROWS.filter((r) => r.method === "RPC").length,
  };
}

export function methodBadgeClass(method: ArchitectureApiRow["method"]): string {
  if (method === "GET") return "bg-sky-100 text-sky-800 border-sky-200";
  if (method === "RPC") return "bg-violet-100 text-violet-800 border-violet-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}
