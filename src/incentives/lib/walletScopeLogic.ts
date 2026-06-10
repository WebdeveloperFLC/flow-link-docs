/**
 * Pure-logic mirror of fn_wallet_scope_matches (Sprint 5).
 */

export type ScopeWallet = {
  scope_country_tag?: string | null;
  scope_master_key?: string | null;
  scope_service_code?: string | null;
  scope_sub_category?: string | null;
};

export type ScopeTarget = {
  country?: string | null;
  countries?: string[] | null;
  services?: string[] | null;
  hasVisa?: boolean;
  hasCoaching?: boolean;
  hasAdmission?: boolean;
  hasAllied?: boolean;
  hasTravel?: boolean;
};

export function walletScopeMatches(wallet: ScopeWallet, target: ScopeTarget | null): boolean {
  if (
    !wallet.scope_country_tag &&
    !wallet.scope_master_key &&
    !wallet.scope_service_code &&
    !wallet.scope_sub_category
  ) {
    return true;
  }
  if (!target) return false;

  if (wallet.scope_country_tag) {
    const tag = wallet.scope_country_tag.toLowerCase();
    const ok =
      tag === (target.country ?? "").toLowerCase() ||
      (target.countries ?? []).some((c) => c.toLowerCase() === tag);
    if (!ok) return false;
  }

  if (wallet.scope_service_code) {
    const code = wallet.scope_service_code;
    const ok = (target.services ?? []).some((s) => s === code || s.includes(code));
    if (!ok) return false;
  }

  if (wallet.scope_master_key) {
    const m = wallet.scope_master_key;
    const ok =
      (m === "visa_immigration" && target.hasVisa) ||
      (m === "coaching_services" && target.hasCoaching) ||
      (m === "admission_services" && target.hasAdmission) ||
      (m === "allied_services" && target.hasAllied) ||
      (m === "travel_financial" && target.hasTravel) ||
      (target.services ?? []).some((s) => s.startsWith(m));
    if (!ok) return false;
  }

  if (wallet.scope_sub_category) {
    const sub = wallet.scope_sub_category;
    const ok = (target.services ?? []).some((s) => s.includes(sub));
    if (!ok) return false;
  }

  return true;
}

export type SpendOrder = "strategic_first" | "personal_first" | "parallel";

export function pickWalletBySpendOrder<T extends { budget_kind?: string | null }>(
  wallets: T[],
  order: SpendOrder,
): T | null {
  if (!wallets.length) return null;
  const sorted = [...wallets].sort((a, b) => {
    const aPersonal = a.budget_kind === "month_to_month" ? 0 : 1;
    const bPersonal = b.budget_kind === "month_to_month" ? 0 : 1;
    if (order === "strategic_first") {
      return bPersonal - aPersonal;
    }
    return aPersonal - bPersonal;
  });
  return sorted[0] ?? null;
}
