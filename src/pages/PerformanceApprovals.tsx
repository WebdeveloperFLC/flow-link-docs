import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { useToast } from "@/hooks/use-toast";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { formatInr } from "@/lib/performanceHubTheme";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

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
  created_at: string;
  counselor?: { full_name: string | null } | null;
  client?: { full_name: string | null } | null;
  offer?: { title: string | null } | null;
}

const LEVEL_LABELS: Record<string, string> = {
  manager: "Branch manager",
  admin: "Admin / director",
};

export default function PerformanceApprovals() {
  const { hasRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { period } = usePerformancePeriod();
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const canReview =
    hasRole(["admin", "administrator"]) || hasRole("manager");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("discount_approval_requests")
      .select(
        `
        id, period_key, counselor_id, client_id, lead_id,
        discount_amount, discount_percent, wallet_debit, approval_level,
        status, request_note, created_at,
        counselor:profiles!discount_approval_requests_counselor_id_fkey(full_name),
        client:clients(full_name),
        offer:offers(title)
      `,
      )
      .eq("status", "pending")
      .eq("period_key", period)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Could not load approvals",
        description: formatSupabaseError(error, "Load failed"),
        variant: "destructive",
      });
      setRows([]);
    } else {
      setRows((data ?? []) as ApprovalRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!canReview) return;
    load();
  }, [period, canReview]);

  async function review(id: string, action: "approve" | "decline") {
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
        throw new Error(
          typeof result.reason === "string" ? result.reason : "Review failed",
        );
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

  if (authLoading) return null;
  if (!canReview) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="Discount approvals"
          subtitle="Depth-matrix queue — instant applies skip this list"
          period={period}
          showModuleLegend={false}
        />

        <PerformancePeriodBar showBranch={false} compact />

        <div className="flex flex-wrap gap-3 items-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link to="/performance/admin" className="text-sm text-primary hover:underline ml-auto pb-2">
            ← Command center
          </Link>
        </div>

        {rows.length === 0 && !loading ? (
          <Card className="p-6 flex items-center gap-3 text-emerald-700 bg-emerald-500/5 border-emerald-500/30">
            <CheckCircle2 className="size-5 shrink-0" />
            <p className="font-medium">No pending discount approvals for {period}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <Card key={row.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline">{LEVEL_LABELS[row.approval_level] ?? row.approval_level}</Badge>
                      <span className="font-medium">
                        {formatInr(row.discount_amount)}
                        {row.discount_percent != null && ` (${row.discount_percent}%)`}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {row.counselor?.full_name ?? "Counselor"} →{" "}
                      {row.client?.full_name ?? (row.lead_id ? "Lead" : "Recipient")}
                      {row.offer?.title && <> · {row.offer.title}</>}
                    </p>
                    {row.wallet_debit > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Wallet debit: {formatInr(row.wallet_debit)}
                      </p>
                    )}
                    {row.request_note && (
                      <p className="text-sm mt-2 italic">&ldquo;{row.request_note}&rdquo;</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </div>
                <Textarea
                  placeholder="Review note (optional)"
                  rows={2}
                  value={notes[row.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={busyId === row.id}
                    onClick={() => review(row.id, "approve")}
                  >
                    <CheckCircle2 className="size-4" /> Approve &amp; apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={busyId === row.id}
                    onClick={() => review(row.id, "decline")}
                  >
                    <XCircle className="size-4" /> Decline
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
