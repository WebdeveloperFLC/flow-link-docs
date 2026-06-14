/** Personal (month-to-month) wallet rows for KPI aggregation — PH-R-001 */
export function isPersonalWalletBudgetKind(budgetKind: string | null | undefined): boolean {
  return budgetKind === "month_to_month" || budgetKind === "personal";
}
