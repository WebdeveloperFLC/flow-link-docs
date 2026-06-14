import type { Database } from "@/integrations/supabase/types";
import { walletScopeLabel } from "@/lib/walletScope";

export type WalletBudgetKind = Database["public"]["Enums"]["wallet_budget_kind"];

export interface WalletListRowInput {
  id: string;
  name: string | null;
  counselor_id: string;
  counselor_name: string;
  budget_kind: WalletBudgetKind;
  currency: string;
  potential_wallet: number;
  unlocked_amount: number;
  balance: number;
  spent: number;
  valid_from: string | null;
  valid_to: string | null;
  closed_at: string | null;
  max_percent_per_client: number;
  max_amount_per_client: number | null;
  rollover_policy: string;
  scope_country_tag: string | null;
  scope_master_key: string | null;
  scope_service_code: string | null;
  scope_sub_category: string | null;
}

export type WalletListStatus = "active" | "scheduled" | "closed";

export interface WalletListRow extends WalletListRowInput {
  shortId: string;
  typeLabel: string;
  scopeLabel: string;
  utilizationPct: number;
  expiryLabel: string | null;
  expiresWithin14d: boolean;
  status: WalletListStatus;
}

const TYPE_LABELS: Record<WalletBudgetKind, string> = {
  month_to_month: "Monthly",
  festive: "Festival",
  scoped: "Campaign",
};

export function walletShortId(id: string): string {
  const tail = id.replace(/-/g, "").slice(-4).toUpperCase();
  return `WL-${tail}`;
}

export function walletTypeLabel(kind: WalletBudgetKind): string {
  return TYPE_LABELS[kind] ?? kind;
}

export function walletStatus(input: Pick<WalletListRowInput, "closed_at" | "valid_from">): WalletListStatus {
  if (input.closed_at) return "closed";
  if (input.valid_from) {
    const start = new Date(input.valid_from);
    if (start > new Date()) return "scheduled";
  }
  return "active";
}

export function walletExpiryMeta(validTo: string | null): {
  expiryLabel: string | null;
  expiresWithin14d: boolean;
} {
  if (!validTo) return { expiryLabel: null, expiresWithin14d: false };
  const end = new Date(validTo);
  const expiryLabel = end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const ms = end.getTime() - Date.now();
  const expiresWithin14d = ms >= 0 && ms <= 14 * 24 * 60 * 60 * 1000;
  return { expiryLabel, expiresWithin14d };
}

export function walletUtilizationPct(spent: number, allocation: number): number {
  if (allocation <= 0) return spent > 0 ? 100 : 0;
  return Math.min(100, Math.round((spent / allocation) * 100));
}

export function mapWalletListRow(input: WalletListRowInput): WalletListRow {
  const allocation = Math.max(Number(input.potential_wallet ?? 0), 0);
  const spent = Math.max(Number(input.spent ?? 0), 0);
  const { expiryLabel, expiresWithin14d } = walletExpiryMeta(input.valid_to);

  return {
    ...input,
    shortId: walletShortId(input.id),
    typeLabel: walletTypeLabel(input.budget_kind),
    scopeLabel: walletScopeLabel(input),
    utilizationPct: walletUtilizationPct(spent, allocation),
    expiryLabel,
    expiresWithin14d,
    status: walletStatus(input),
  };
}

export function filterWalletRows(rows: WalletListRow[], tab: "all" | WalletListStatus): WalletListRow[] {
  if (tab === "all") return rows;
  return rows.filter((r) => r.status === tab);
}

export function summarizeWallets(rows: WalletListRow[]) {
  const active = rows.filter((r) => r.status === "active");
  return {
    totalAllocated: rows.reduce((s, r) => s + r.potential_wallet, 0),
    totalConsumed: rows.reduce((s, r) => s + r.spent, 0),
    activeCount: active.length,
    expiringSoon: rows.filter((r) => r.expiresWithin14d && r.status !== "closed").length,
  };
}

export function allocationByType(rows: WalletListRow[]): { label: string; amount: number; pct: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.typeLabel, (map.get(r.typeLabel) ?? 0) + r.potential_wallet);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0) || 1;
  return [...map.entries()]
    .map(([label, amount]) => ({ label, amount, pct: Math.round((amount / total) * 100) }))
    .sort((a, b) => b.amount - a.amount);
}
