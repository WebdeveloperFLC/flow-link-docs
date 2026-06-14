import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { periodBounds } from "@/incentives/lib/clientCommercialsLogic";
import {
  auditActionCounts,
  auditTrailCmsKpis,
  filterAuditEvents,
  mapDiscountApprovalAuditRows,
  mapFxAuditRows,
  mapOfferStatusAuditRows,
  mapPromotionAuditRows,
  mapWalletExceptionAuditRows,
  mapWalletLedgerAuditRows,
  mergeAuditEvents,
  type AuditActionType,
  type CommercialAuditEvent,
} from "@/incentives/lib/auditTrailCmsLogic";

export function useAuditTrailCmsData(period: string) {
  const [events, setEvents] = useState<CommercialAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<AuditActionType | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = periodBounds(period);
      const [disc, walletEx, ledger, offers, fx, promos] = await Promise.all([
        supabase
          .from("discount_approval_requests")
          .select(
            `
            id, discount_amount, discount_percent, status, created_at, reviewed_at, review_note,
            counselor:profiles!discount_approval_requests_counselor_id_fkey(full_name),
            reviewer:profiles!discount_approval_requests_reviewed_by_fkey(full_name),
            client:clients(full_name)
          `,
          )
          .eq("period_key", period)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("wallet_exception_requests")
          .select(
            `
            id, requested_amount, reason, status, created_at, reviewed_at, review_note,
            counselor:profiles!wallet_exception_requests_counselor_id_fkey(full_name),
            reviewer:profiles!wallet_exception_requests_reviewed_by_fkey(full_name)
          `,
          )
          .eq("period_key", period)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("wallet_ledger")
          .select(
            `
            id, entry_type, amount, currency, note, created_at,
            wallet:discount_wallets(name)
          `,
          )
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("offer_status_history")
          .select(
            `
            id, from_status, to_status, note, created_at,
            offer:offers(title),
            author:profiles!offer_status_history_changed_by_fkey(full_name)
          `,
          )
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("fx_rate_audit_log")
          .select(
            `
            id, action, changed_at, old_values, new_values,
            author:profiles!fx_rate_audit_log_changed_by_fkey(full_name)
          `,
          )
          .gte("changed_at", start)
          .lt("changed_at", end)
          .order("changed_at", { ascending: false })
          .limit(100),
        supabase
          .from("promotion_requests")
          .select(
            `
            id, title, status, created_at, reviewed_at, review_note,
            requester:profiles!promotion_requests_requested_by_fkey(full_name),
            reviewer:profiles!promotion_requests_reviewed_by_fkey(full_name)
          `,
          )
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const merged = mergeAuditEvents(
        mapDiscountApprovalAuditRows((disc.data ?? []) as Parameters<typeof mapDiscountApprovalAuditRows>[0]),
        mapWalletExceptionAuditRows((walletEx.data ?? []) as Parameters<typeof mapWalletExceptionAuditRows>[0]),
        mapWalletLedgerAuditRows((ledger.data ?? []) as Parameters<typeof mapWalletLedgerAuditRows>[0]),
        mapOfferStatusAuditRows((offers.data ?? []) as Parameters<typeof mapOfferStatusAuditRows>[0]),
        mapFxAuditRows((fx.data ?? []) as Parameters<typeof mapFxAuditRows>[0]),
        mapPromotionAuditRows((promos.data ?? []) as Parameters<typeof mapPromotionAuditRows>[0]),
      );
      setEvents(merged);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEvents = useMemo(
    () => filterAuditEvents(events, actionFilter),
    [events, actionFilter],
  );
  const kpis = useMemo(() => auditTrailCmsKpis(events), [events]);
  const actionCounts = useMemo(() => auditActionCounts(events), [events]);

  return {
    events: filteredEvents,
    allEvents: events,
    loading,
    actionFilter,
    setActionFilter,
    kpis,
    actionCounts,
    load,
  };
}
