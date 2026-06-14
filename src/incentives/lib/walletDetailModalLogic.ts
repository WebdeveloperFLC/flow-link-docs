import type { WalletListRow } from "./walletListLogic";
import { formatInr } from "@/lib/performanceHubTheme";

export const WALLET_LIFECYCLE_ACTIONS = [
  { id: "allocate", label: "Allocate", to: "/incentives/wallet-topups" },
  { id: "freeze", label: "Freeze", to: "/performance/wallet/policy" },
  { id: "revoke", label: "Revoke", to: "/performance/wallet/policy" },
  { id: "transfer", label: "Transfer", to: "/performance/wallet/branch-pool" },
  { id: "merge", label: "Merge", to: "/incentives/period-close" },
  { id: "carry", label: "Carry forward", to: "/incentives/period-close" },
  { id: "partial", label: "Partial carry", to: "/incentives/period-close" },
  { id: "audit", label: "Audit", to: "/performance/audit-trail" },
] as const;

export interface WalletDetailSummary {
  remaining: number;
  unlocked: number;
  balance: number;
}

export function walletDetailSummary(row: WalletListRow): WalletDetailSummary {
  return {
    remaining: Math.max(0, row.potential_wallet - row.spent),
    unlocked: row.unlocked_amount,
    balance: row.balance,
  };
}

export function walletScopeLimits(row: WalletListRow): string[] {
  const limits: string[] = [];
  if (row.scope_country_tag) limits.push(`Country: ${row.scope_country_tag}`);
  if (row.scope_service_code) limits.push(`Service: ${row.scope_service_code}`);
  if (row.scope_sub_category) limits.push(`Category: ${row.scope_sub_category}`);
  if (row.scope_master_key) limits.push(`Scope: ${row.scope_master_key}`);
  return limits;
}

export function formatWalletRuleLine(row: WalletListRow): string {
  const parts = [`Max ${row.max_percent_per_client}% per client`];
  if (row.max_amount_per_client != null) {
    parts.push(`cap ${formatInr(row.max_amount_per_client, row.currency)}`);
  }
  parts.push(`rollover: ${row.rollover_policy}`);
  return parts.join(" · ");
}
