/** Labels for strategic wallet scope tags (Sprint 5). */

const MASTER_LABELS: Record<string, string> = {
  coaching_services: "Coaching",
  visa_immigration: "Visa & Immigration",
  admission_services: "Admissions",
  allied_services: "Allied",
  travel_financial: "Travel & Financial",
  settlement_services: "Settlement",
};

export function walletScopeLabel(w: {
  budget_kind?: string | null;
  name?: string | null;
  scope_country_tag?: string | null;
  scope_master_key?: string | null;
  scope_service_code?: string | null;
  scope_sub_category?: string | null;
}): string {
  if (w.budget_kind === "month_to_month" && !w.scope_country_tag && !w.scope_master_key && !w.scope_service_code) {
    return "Personal (month-to-month)";
  }
  const parts: string[] = [];
  if (w.name?.trim()) parts.push(w.name.trim());
  if (w.scope_country_tag) parts.push(w.scope_country_tag);
  if (w.scope_master_key) parts.push(MASTER_LABELS[w.scope_master_key] ?? w.scope_master_key);
  if (w.scope_sub_category) parts.push(w.scope_sub_category);
  if (w.scope_service_code) parts.push(w.scope_service_code);
  const base = parts.length ? parts.join(" · ") : w.budget_kind ?? "wallet";
  return w.budget_kind === "festive" ? `Festive: ${base}` : `Strategic: ${base}`;
}

export function isStrategicWallet(w: { budget_kind?: string | null }): boolean {
  return w.budget_kind === "scoped" || w.budget_kind === "festive";
}
