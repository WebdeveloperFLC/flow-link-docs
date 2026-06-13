import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PerformanceLockReadiness {
  loading: boolean;
  canLock: boolean;
  unclassifiedCount: number;
  pendingApprovals: number;
  promotionRequestsOpen: number;
  blockers: string[];
}

const EMPTY: PerformanceLockReadiness = {
  loading: true,
  canLock: true,
  unclassifiedCount: 0,
  pendingApprovals: 0,
  promotionRequestsOpen: 0,
  blockers: [],
};

export function usePerformanceLockReadiness(period: string): PerformanceLockReadiness {
  const [state, setState] = useState<PerformanceLockReadiness>(EMPTY);

  useEffect(() => {
    if (!period.trim()) {
      setState({ ...EMPTY, loading: false });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    supabase.rpc("fn_period_lock_readiness", { _period_key: period }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setState({ ...EMPTY, loading: false, canLock: true });
        return;
      }
      const row = data as {
        can_lock?: boolean;
        unclassified_count?: number;
        pending_approvals?: number;
        promotion_requests_open?: number;
        blockers?: string[];
      };
      setState({
        loading: false,
        canLock: row.can_lock !== false,
        unclassifiedCount: Number(row.unclassified_count ?? 0),
        pendingApprovals: Number(row.pending_approvals ?? 0),
        promotionRequestsOpen: Number(row.promotion_requests_open ?? 0),
        blockers: Array.isArray(row.blockers) ? row.blockers : [],
      });
    });

    return () => {
      cancelled = true;
    };
  }, [period]);

  return state;
}
