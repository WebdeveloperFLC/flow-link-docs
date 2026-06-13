import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currentPeriodKey } from "@/lib/performanceHubTheme";

export interface TelecallerRecentEvent {
  event_date: string;
  created_at: string;
  client_name: string | null;
  client_id: string | null;
  status_label: string;
}

export interface PerformanceTelecallerHomeData {
  loading: boolean;
  period: string;
  conversions: number;
  target: number;
  perConversion: number;
  projectedCash: number;
  lockedCash: number;
  hasLockedRun: boolean;
  conversionRate: number;
  assignedLeads: number;
  recentEvents: TelecallerRecentEvent[];
}

export function usePerformanceTelecallerHome(
  userId: string | undefined,
  period = currentPeriodKey(),
): PerformanceTelecallerHomeData {
  const [state, setState] = useState<PerformanceTelecallerHomeData>({
    loading: true,
    period,
    conversions: 0,
    target: 0,
    perConversion: 300,
    projectedCash: 0,
    lockedCash: 0,
    hasLockedRun: false,
    conversionRate: 0,
    assignedLeads: 0,
    recentEvents: [],
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, period }));
      const { data, error } = await supabase.rpc("fn_telecaller_period_home", {
        _period_key: period,
        _user_id: userId,
      });

      if (cancelled) return;

      if (error || !(data as { ok?: boolean })?.ok) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      const d = data as {
        conversions?: number;
        target?: number;
        per_conversion?: number;
        projected_cash?: number;
        locked_cash?: number;
        has_locked_run?: boolean;
        conversion_rate?: number;
        assigned_leads?: number;
        recent_events?: TelecallerRecentEvent[];
      };

      setState({
        loading: false,
        period,
        conversions: Number(d.conversions ?? 0),
        target: Number(d.target ?? 0),
        perConversion: Number(d.per_conversion ?? 300),
        projectedCash: Number(d.projected_cash ?? 0),
        lockedCash: Number(d.locked_cash ?? 0),
        hasLockedRun: !!d.has_locked_run,
        conversionRate: Number(d.conversion_rate ?? 0),
        assignedLeads: Number(d.assigned_leads ?? 0),
        recentEvents: (d.recent_events ?? []) as TelecallerRecentEvent[],
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, period]);

  return state;
}
