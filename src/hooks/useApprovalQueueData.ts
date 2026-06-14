import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { approvalsCmsKpis } from "@/incentives/lib/approvalsCmsLogic";
import {
  approvalStageCounts,
  buildApprovalQueue,
  filterApprovalQueue,
  type ApprovalStage,
  type UnifiedApprovalItem,
} from "@/incentives/lib/approvalQueueLogic";

interface ApprovalRow {
  id: string;
  period_key: string;
  counselor_id: string;
  client_id: string | null;
  lead_id: string | null;
  discount_amount: number;
  discount_percent: number | null;
  wallet_debit: number;
  approval_level: string;
  status: string;
  request_note: string | null;
  reference_amount: number | null;
  net_after_discount: number | null;
  below_floor: boolean;
  is_waiver: boolean;
  created_at: string;
  counselor?: { full_name: string | null } | null;
  client?: { full_name: string | null } | null;
  offer?: { title: string | null } | null;
}

interface WalletExceptionRow {
  id: string;
  period_key: string;
  counselor_id: string;
  requested_amount: number;
  reason: string;
  status: string;
  created_at: string;
  counselor?: { full_name: string | null } | null;
}

export function useApprovalQueueData(period: string, enabled: boolean) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [walletRows, setWalletRows] = useState<WalletExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [stageFilter, setStageFilter] = useState<ApprovalStage | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [disc, wallet] = await Promise.all([
      supabase
        // @ts-expect-error discount_approval_requests not in generated types yet (PH-R-016)
        .from("discount_approval_requests")
        .select(
          `
        id, period_key, counselor_id, client_id, lead_id,
        discount_amount, discount_percent, wallet_debit, approval_level,
        status, request_note, reference_amount, net_after_discount, below_floor, is_waiver,
        created_at,
        counselor:profiles!discount_approval_requests_counselor_id_fkey(full_name),
        client:clients(full_name),
        offer:offers(title)
      `,
        )
        .eq("status", "pending")
        .eq("period_key", period)
        .order("created_at", { ascending: true }),
      supabase
        // @ts-expect-error wallet_exception_requests not in generated types yet (PH-R-016)
        .from("wallet_exception_requests")
        .select(
          `
          id, period_key, counselor_id, requested_amount, reason, status, created_at,
          counselor:profiles!wallet_exception_requests_counselor_id_fkey(full_name)
        `,
        )
        .eq("status", "pending")
        .eq("period_key", period)
        .order("created_at", { ascending: true }),
    ]);

    if (disc.error) {
      toast({
        title: "Could not load approvals",
        description: formatSupabaseError(disc.error, "Load failed"),
        variant: "destructive",
      });
      setRows([]);
    } else {
      setRows((disc.data ?? []) as ApprovalRow[]);
    }

    if (wallet.error) {
      setWalletRows([]);
    } else {
      setWalletRows((wallet.data ?? []) as WalletExceptionRow[]);
    }
    setLoading(false);
  }, [period, toast]);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  const queue = useMemo(() => buildApprovalQueue(rows, walletRows), [rows, walletRows]);
  const stages = useMemo(() => approvalStageCounts(queue), [queue]);
  const filteredQueue = useMemo(
    () => filterApprovalQueue(queue, stageFilter),
    [queue, stageFilter],
  );
  const kpis = useMemo(() => approvalsCmsKpis(queue), [queue]);

  async function reviewDiscount(id: string, action: "approve" | "decline") {
    setBusyId(id);
    try {
      const { data, error } = await supabase.rpc("fn_review_discount_request", {
        _request_id: id,
        _action: action,
        _note: notes[id]?.trim() || null,
      });
      if (error) throw error;
      const result = data as { ok?: boolean; reason?: string };
      if (!result?.ok) {
        throw new Error(typeof result.reason === "string" ? result.reason : "Review failed");
      }
      toast({
        title: action === "approve" ? "Discount approved & applied" : "Request declined",
      });
      await load();
    } catch (e: unknown) {
      toast({
        title: "Action failed",
        description: formatSupabaseError(e, "Could not update request"),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function reviewWallet(id: string, action: "approve" | "decline") {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("fn_review_wallet_exception_request", {
        _request_id: id,
        _action: action,
        _note: notes[id]?.trim() || null,
      });
      if (error) throw error;
      toast({
        title: action === "approve" ? "Wallet exception approved" : "Request declined",
      });
      await load();
    } catch (e: unknown) {
      toast({
        title: "Action failed",
        description: formatSupabaseError(e, "Could not update request"),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  function handleApprove(item: UnifiedApprovalItem) {
    if (item.kind === "wallet_exception") reviewWallet(item.id, "approve");
    else reviewDiscount(item.id, "approve");
  }

  function handleDecline(item: UnifiedApprovalItem) {
    if (item.kind === "wallet_exception") reviewWallet(item.id, "decline");
    else reviewDiscount(item.id, "decline");
  }

  return {
    loading,
    busyId,
    notes,
    setNotes,
    stageFilter,
    setStageFilter,
    queue,
    stages,
    filteredQueue,
    kpis,
    load,
    handleApprove,
    handleDecline,
  };
}
