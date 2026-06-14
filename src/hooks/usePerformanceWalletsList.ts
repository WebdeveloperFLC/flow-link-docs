import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  allocationByType,
  mapWalletListRow,
  summarizeWallets,
  type WalletListRow,
} from "@/incentives/lib/walletListLogic";

interface UsePerformanceWalletsListOptions {
  period: string;
  userId?: string;
  branchId?: string;
  adminView?: boolean;
}

export function usePerformanceWalletsList({
  period,
  userId,
  branchId,
  adminView = false,
}: UsePerformanceWalletsListOptions) {
  const [rows, setRows] = useState<WalletListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      let walletQuery = supabase
        .from("discount_wallets")
        .select(
          "id, name, counselor_id, budget_kind, currency, potential_wallet, unlocked_amount, balance, valid_from, valid_to, closed_at, max_percent_per_client, max_amount_per_client, rollover_policy, scope_country_tag, scope_master_key, scope_service_code, scope_sub_category",
        )
        .eq("period_key", period)
        .order("created_at", { ascending: false });

      if (!adminView && userId) {
        walletQuery = walletQuery.eq("counselor_id", userId);
      }

      const { data: walletData, error } = await walletQuery;
      if (error) {
        console.error(error);
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      let raw = (walletData ?? []) as {
        id: string;
        name: string | null;
        counselor_id: string;
        budget_kind: WalletListRow["budget_kind"];
        currency: string;
        potential_wallet: number;
        unlocked_amount: number;
        balance: number;
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
      }[];

      const counselorIds = [...new Set(raw.map((w) => w.counselor_id))];
      const profileMap = new Map<string, { full_name: string | null; branch_id: string | null }>();
      if (counselorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, branch_id")
          .in("id", counselorIds);
        for (const p of (profs ?? []) as { id: string; full_name: string | null; branch_id: string | null }[]) {
          profileMap.set(p.id, { full_name: p.full_name, branch_id: p.branch_id });
        }
      }

      if (adminView && branchId) {
        raw = raw.filter((w) => profileMap.get(w.counselor_id)?.branch_id === branchId);
      }

      const walletIds = raw.map((w) => w.id);
      const spentByWallet = new Map<string, number>();

      if (walletIds.length) {
        const { data: allocs } = await supabase
          .from("wallet_allocations")
          .select("wallet_id, amount")
          .in("wallet_id", walletIds)
          .eq("status", "applied");
        for (const a of (allocs ?? []) as { wallet_id: string; amount: number }[]) {
          spentByWallet.set(a.wallet_id, (spentByWallet.get(a.wallet_id) ?? 0) + Number(a.amount ?? 0));
        }
      }

      const mapped = raw.map((w) =>
        mapWalletListRow({
          id: w.id,
          name: w.name,
          counselor_id: w.counselor_id,
          counselor_name: profileMap.get(w.counselor_id)?.full_name ?? "Counselor",
          budget_kind: w.budget_kind,
          currency: w.currency,
          potential_wallet: Number(w.potential_wallet ?? 0),
          unlocked_amount: Number(w.unlocked_amount ?? 0),
          balance: Number(w.balance ?? 0),
          spent: spentByWallet.get(w.id) ?? 0,
          valid_from: w.valid_from,
          valid_to: w.valid_to,
          closed_at: w.closed_at,
          max_percent_per_client: Number(w.max_percent_per_client ?? 0),
          max_amount_per_client: w.max_amount_per_client,
          rollover_policy: w.rollover_policy,
          scope_country_tag: w.scope_country_tag,
          scope_master_key: w.scope_master_key,
          scope_service_code: w.scope_service_code,
          scope_sub_category: w.scope_sub_category,
        }),
      );

      if (!cancelled) {
        setRows(mapped);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [period, userId, branchId, adminView]);

  const summary = useMemo(() => summarizeWallets(rows), [rows]);
  const typeBreakdown = useMemo(() => allocationByType(rows), [rows]);

  return { rows, loading, summary, typeBreakdown };
}
