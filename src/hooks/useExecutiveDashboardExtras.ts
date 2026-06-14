import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildApprovalQueue,
  type UnifiedApprovalItem,
} from "@/incentives/lib/approvalQueueLogic";
import { toMixSlices, type MixSlice } from "@/incentives/lib/executiveDashboardLogic";

export function useExecutiveDashboardExtras(period: string) {
  const [serviceMix, setServiceMix] = useState<MixSlice[]>([]);
  const [approvalPreview, setApprovalPreview] = useState<UnifiedApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const [serviceRes, disc, wallet] = await Promise.all([
        supabase.rpc("fn_incentive_dimension_leaderboard", {
          _period_key: period,
          _group_by: "service",
          _limit: 8,
        }),
        supabase
          // @ts-expect-error PH-R-016
          .from("discount_approval_requests")
          .select(
            `
            id, discount_amount, discount_percent, approval_level, below_floor, is_waiver,
            request_note, created_at,
            counselor:profiles!discount_approval_requests_counselor_id_fkey(full_name),
            client:clients(full_name),
            offer:offers(title)
          `,
          )
          .eq("status", "pending")
          .eq("period_key", period)
          .order("created_at", { ascending: true })
          .limit(4),
        supabase
          // @ts-expect-error PH-R-016
          .from("wallet_exception_requests")
          .select(
            `
            id, requested_amount, reason, created_at,
            counselor:profiles!wallet_exception_requests_counselor_id_fkey(full_name)
          `,
          )
          .eq("status", "pending")
          .eq("period_key", period)
          .order("created_at", { ascending: true })
          .limit(2),
      ]);

      const serviceRows = ((serviceRes.data ?? []) as {
        group_label: string;
        total_amount: number;
      }[]).map((r) => ({ label: r.group_label || "Other", amount: Number(r.total_amount ?? 0) }));

      const preview = buildApprovalQueue(
        (disc.data ?? []) as Parameters<typeof buildApprovalQueue>[0],
        (wallet.data ?? []) as Parameters<typeof buildApprovalQueue>[1],
      ).slice(0, 4);

      if (!cancelled) {
        setServiceMix(toMixSlices(serviceRows));
        setApprovalPreview(preview);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [period]);

  return { serviceMix, approvalPreview, loading };
}
