/** Prototype screen → Performance Hub route (04_Screenshots/00_INDEX.md). */
export const CMS_PROTOTYPE_PAGES = [
  { id: "01", screen: "Executive command center", route: "/performance/executive" },
  { id: "02a", screen: "Counselor home", route: "/performance" },
  { id: "02b", screen: "Finance dashboard", route: "/performance/finance" },
  { id: "02c", screen: "Branch manager", route: "/performance/team" },
  { id: "03", screen: "Revenue analytics", route: "/performance/analytics" },
  { id: "04", screen: "Comparison engine", route: "/performance/compare" },
  { id: "05", screen: "Discount wallets", route: "/performance/wallets" },
  { id: "06", screen: "Combinations", route: "/performance/combinations" },
  { id: "07", screen: "Offer management", route: "/performance/offers" },
  { id: "08", screen: "Offer codes", route: "/performance/offers/codes" },
  { id: "09", screen: "Promotion requests", route: "/performance/offers/requests" },
  { id: "10", screen: "Client commercials", route: "/performance/client-commercials" },
  { id: "11", screen: "Incentive plans", route: "/performance/incentives/plans" },
  { id: "12", screen: "Incentive ledger", route: "/performance/incentives/payouts" },
  { id: "13", screen: "Commission tracking", route: "/performance/commissions" },
  { id: "14", screen: "Multi-currency", route: "/performance/multi-currency" },
  { id: "15", screen: "Approvals", route: "/performance/approvals" },
  { id: "16", screen: "Report builder", route: "/performance/reports" },
  { id: "17", screen: "Profitability", route: "/performance/profitability" },
  { id: "18", screen: "Audit trail", route: "/performance/audit-trail" },
  { id: "19", screen: "Roles & permissions", route: "/performance/roles" },
  { id: "20", screen: "CRM integration", route: "/performance/crm-integration" },
  { id: "21", screen: "Configuration", route: "/performance/configuration" },
  { id: "22", screen: "Architecture & API", route: "/performance/architecture" },
] as const;

export const CMS_PROTOTYPE_MODALS = [
  { id: "23", screen: "Wallet detail", route: "/performance/wallets", trigger: "Detail on row" },
  { id: "24", screen: "Client invoice lock", route: "/performance/client-commercials", trigger: "Open commercial row" },
  { id: "25", screen: "New wallet", route: "/performance/wallets", trigger: "New wallet (admin)" },
  { id: "26", screen: "New offer code", route: "/performance/offers/codes", trigger: "New code" },
  { id: "27", screen: "Run payout", route: "/performance/incentives/payouts", trigger: "Run payout cycle" },
] as const;

export const CMS_PROTOTYPE_MOBILE = [
  { id: "28", screen: "Mobile dashboard", route: "/performance" },
  { id: "29", screen: "Mobile wallets", route: "/performance/wallets" },
] as const;
