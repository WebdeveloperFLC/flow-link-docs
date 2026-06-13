import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PerformanceQueueCounts {
  loading: boolean;
  unclassified: number;
  pendingApprovals: number;
  promotionRequests: number;
  walletExceptions: number;
}

export function usePerformanceQueueCounts(period: string): PerformanceQueueCounts {
  const [state, setState] = useState<PerformanceQueueCounts>({
    loading: true,
    unclassified: 0,
    pendingApprovals: 0,
    promotionRequests: 0,
    walletExceptions: 0,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true }));

      const [uncl, appr, promo, walletExc] = await Promise.all([
        supabase.rpc("fn_unclassified_payment_count", { _period_key: period }),
        supabase
          .from("discount_approval_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("period_key", period),
        supabase
          .from("promotion_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "in_review"]),
        supabase.rpc("fn_wallet_exception_pending_count", { _period_key: period }),
      ]);

      if (cancelled) return;

      setState({
        loading: false,
        unclassified: Number(uncl.data ?? 0),
        pendingApprovals: appr.count ?? 0,
        promotionRequests: promo.count ?? 0,
        walletExceptions: Number(walletExc.data ?? 0),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [period]);

  return state;
}
