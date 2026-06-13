import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  reference_amount: number | null;
  net_after_discount: number | null;
  below_floor: boolean;
  is_waiver: boolean;
  created_at: string;
  counselor?: { full_name: string | null } | null;
  client?: { full_name: string | null } | null;
  offer?: { title: string | null } | null;
}

const LEVEL_LABELS: Record<string, string> = {
  manager: "Branch manager",
  admin: "Admin / director",
};

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

export default function PerformanceApprovals() {
  const { hasRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { period } = usePerformancePeriod();
  const isAdmin = hasRole(["admin", "administrator"]);
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [walletRows, setWalletRows] = useState<WalletExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [floorPct, setFloorPct] = useState("80");
  const [floorSaving, setFloorSaving] = useState(false);

  const canReview =
    hasRole(["admin", "administrator"]) || hasRole("manager");

  async function load() {
    setLoading(true);
    const [disc, wallet] = await Promise.all([
      supabase
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
  }

  useEffect(() => {
    if (!canReview) return;
    load();
  }, [period, canReview]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.rpc("fn_get_discount_margin_floor_policy").then(({ data }) => {
      const row = data as { min_net_pct?: number } | null;
      if (row?.min_net_pct != null) setFloorPct(String(row.min_net_pct));
    });
  }, [isAdmin]);

  async function saveFloorPolicy() {
    const pct = Number(floorPct);
    if (!pct || pct <= 0 || pct > 100) {
      toast({ title: "Enter min net % between 1 and 100", variant: "destructive" });
      return;
    }
    setFloorSaving(true);
    try {
      const { error } = await supabase.rpc("fn_set_discount_margin_floor_policy", {
        _min_net_pct: pct,
        _block_counselor_waiver: true,
      });
      if (error) throw error;
      toast({ title: "Margin floor policy saved", description: `Min net ${pct}% of invoice base` });
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: formatSupabaseError(e, "Could not save policy"),
        variant: "destructive",
      });
    } finally {
      setFloorSaving(false);
    }
  }

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

  async function reviewWallet(id: string, action: "approve" | "decline") {
    setBusyId(id);
    try {
      const { data, error } = await supabase.rpc("fn_review_wallet_exception_request", {
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

  if (authLoading) return null;
  if (!canReview) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="Approvals"
          subtitle="Deep discounts and wallet exception requests"
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

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Depth matrix</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {[
              ["≤ 10% or ≤ ₹5,000", "Counselor — instant"],
              ["11 – 20%", "Branch manager"],
              ["> 20% / below floor", "Admin / director"],
              ["Scholarship / waiver", "Admin only — counselor submit blocked"],
            ].map(([depth, approver]) => (
              <div key={depth} className="rounded-md border bg-muted/30 p-3">
                <p className="font-semibold text-foreground">{depth}</p>
                <p className="text-muted-foreground mt-1">{approver}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Floor-price protection (O16): any discount below the margin floor escalates to admin, regardless of depth
            band.
          </p>
        </Card>

        {isAdmin && (
          <Card className="p-4 space-y-3 border-dashed">
            <h2 className="font-semibold text-sm">Margin floor policy (O16)</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Min net % of invoice base</label>
                <Input
                  className="w-24 mt-1"
                  value={floorPct}
                  onChange={(e) => setFloorPct(e.target.value)}
                />
              </div>
              <Button size="sm" disabled={floorSaving} onClick={saveFloorPolicy}>
                Save policy
              </Button>
            </div>
          </Card>
        )}

        {rows.length === 0 && walletRows.length === 0 && !loading ? (
          <Card className="p-6 flex items-center gap-3 text-emerald-700 bg-emerald-500/5 border-emerald-500/30">
            <CheckCircle2 className="size-5 shrink-0" />
            <p className="font-medium">No pending approvals for {period}</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {rows.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-semibold">Deep discount requests</h2>
                {rows.map((row) => (
              <Card key={row.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline">{LEVEL_LABELS[row.approval_level] ?? row.approval_level}</Badge>
                      {row.below_floor && (
                        <Badge variant="destructive" className="text-xs">
                          Below floor
                        </Badge>
                      )}
                      {row.is_waiver && (
                        <Badge variant="secondary" className="text-xs">
                          Waiver
                        </Badge>
                      )}
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
                    {row.reference_amount != null && row.reference_amount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Invoice base {formatInr(row.reference_amount)}
                        {row.net_after_discount != null && <> · net {formatInr(row.net_after_discount)}</>}
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

            {walletRows.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-semibold">Wallet exception requests (W7)</h2>
                {walletRows.map((row) => (
                  <Card key={row.id} className="p-4 space-y-3 border-dashed border-amber-500/40">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {row.counselor?.full_name ?? "Counselor"} — +{formatInr(row.requested_amount)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">{row.reason}</p>
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
                        onClick={() => reviewWallet(row.id, "approve")}
                      >
                        <CheckCircle2 className="size-4" /> Approve top-up
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={busyId === row.id}
                        onClick={() => reviewWallet(row.id, "decline")}
                      >
                        <XCircle className="size-4" /> Decline
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
