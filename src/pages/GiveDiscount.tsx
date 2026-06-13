import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceMetricCard } from "@/components/performance/PerformanceMetricCard";
import { cn } from "@/lib/utils";
import { Gift, RotateCcw } from "lucide-react";
import { OFFER_FUNDING_LABELS, type OfferFundingSource } from "@/lib/offers/lifecycle";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { walletScopeLabel } from "@/lib/walletScope";
import { formatInr, currentPeriodKey } from "@/lib/performanceHubTheme";

type AllocStatus = "reserved" | "applied" | "reversed";

interface WalletRow {
  id: string;
  name: string | null;
  budget_kind: string;
  balance: number;
  currency: string;
  max_percent_per_client: number;
  max_amount_per_client: number | null;
  potential_wallet: number;
  unlocked_amount: number;
  achievement_pct: number | null;
  assigned_target: number | null;
  scope_country_tag: string | null;
  scope_master_key: string | null;
  scope_service_code: string | null;
}

interface Target {
  kind: "client" | "lead";
  id: string;
  label: string;
}

interface OfferPick {
  id: string;
  title: string;
  funding_source: OfferFundingSource | null;
  fl_contribution_pct: number | null;
  offer_category: string | null;
}

interface AllocRow {
  id: string;
  wallet_id: string;
  client_id: string | null;
  lead_id: string | null;
  offer_id: string | null;
  percent: number | null;
  amount: number;
  currency: string;
  status: AllocStatus;
  exceeded_cap: boolean;
  created_at: string;
}

interface ApplyResult {
  ok: boolean;
  reason?: string;
  debited?: number;
  discount_value?: number;
  funding_source?: string;
  remaining_unlocked?: number;
  pending_approval?: boolean;
  approval_level?: string;
  below_floor?: boolean;
  is_waiver?: boolean;
  message?: string;
  auto_applied?: boolean;
  request_id?: string;
}

interface MarginPreview {
  reference_amount?: number;
  discount_amount?: number;
  net_after_discount?: number | null;
  min_net_required?: number | null;
  min_net_pct?: number;
  below_floor?: boolean;
  is_waiver?: boolean;
  approval_level?: string;
  max_discount_without_floor?: number | null;
}

const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()} ${ccy !== "INR" ? ccy : ""}`.trim();

export default function GiveDiscount() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const period = currentPeriodKey();

  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [walletId, setWalletId] = useState<string>("");
  const [selfServeTypes, setSelfServeTypes] = useState<Set<string>>(new Set());
  const [targets, setTargets] = useState<Target[]>([]);
  const [allocs, setAllocs] = useState<AllocRow[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [offers, setOffers] = useState<OfferPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(false);

  const [targetKey, setTargetKey] = useState<string>("");
  const [offerId, setOfferId] = useState<string>("");
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [percent, setPercent] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [invoiceBase, setInvoiceBase] = useState<string>("");
  const [marginPreview, setMarginPreview] = useState<MarginPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [spendLimits, setSpendLimits] = useState<{
    effective_remaining?: number;
    week1_cap_active?: boolean;
    week1_remaining?: number;
    week1_max_spendable?: number;
  } | null>(null);

  const wallet = useMemo(
    () => wallets.find((w) => w.id === walletId) ?? wallets[0] ?? null,
    [wallets, walletId],
  );

  async function loadWalletsForTarget(clientId: string | null, leadId: string | null) {
    if (!user) return;
    const { data, error } = await supabase.rpc("fn_counselor_wallets_for_period", {
      _period_key: period,
      _client_id: clientId,
      _lead_id: leadId,
    });
    if (error) {
      console.warn("fn_counselor_wallets_for_period", error.message);
      return;
    }
    const rows = (data ?? []) as WalletRow[];
    const synced: WalletRow[] = [];
    for (const row of rows) {
      const { data: s } = await supabase.rpc("fn_sync_wallet_metrics", { _wallet_id: row.id });
      synced.push((s ?? row) as WalletRow);
    }
    setWallets(synced);
    setWalletId((prev) => (synced.some((w) => w.id === prev) ? prev : (synced[0]?.id ?? "")));
  }

  async function loadAll() {
    if (!user) return;
    setLoading(true);

    const [typesRes, clients, leads, myAllocs] = await Promise.all([
      supabase.from("approved_offer_types").select("offer_type, counselor_self_serve"),
      supabase.from("clients").select("id, full_name").eq("assigned_counselor_id", user.id).limit(500),
      supabase.from("leads").select("id, first_name, last_name").eq("assigned_counselor_id", user.id).limit(500),
      supabase
        .from("wallet_allocations")
        .select(
          "id, wallet_id, client_id, lead_id, offer_id, percent, amount, currency, status, exceeded_cap, created_at",
        )
        .eq("counselor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const serve = new Set<string>();
    for (const t of (typesRes.data ?? []) as { offer_type: string; counselor_self_serve: boolean }[]) {
      if (t.counselor_self_serve) serve.add(t.offer_type);
    }
    setSelfServeTypes(serve);

    const t: Target[] = [];
    const lbl: Record<string, string> = {};
    for (const c of (clients.data ?? []) as { id: string; full_name: string }[]) {
      t.push({ kind: "client", id: c.id, label: `${c.full_name} (client)` });
      lbl[`client:${c.id}`] = c.full_name;
    }
    for (const l of (leads.data ?? []) as { id: string; first_name?: string; last_name?: string }[]) {
      const nm = `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim();
      t.push({ kind: "lead", id: l.id, label: `${nm} (lead)` });
      lbl[`lead:${l.id}`] = nm;
    }

    const [kind, id] = targetKey ? targetKey.split(":") : ["", ""];
    await loadWalletsForTarget(kind === "client" ? id : null, kind === "lead" ? id : null);
    setTargets(t);
    setAllocs((myAllocs.data ?? []) as AllocRow[]);
    setLabels(lbl);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    /* eslint-disable-next-line */
  }, [user?.id, period]);

  useEffect(() => {
    if (!wallet?.id) {
      setSpendLimits(null);
      return;
    }
    let cancelled = false;
    supabase.rpc("fn_wallet_spend_limits", { _wallet_id: wallet.id }).then(({ data }) => {
      if (!cancelled) setSpendLimits((data as typeof spendLimits) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [wallet?.id, allocs]);

  useEffect(() => {
    const clientId = searchParams.get("client");
    if (!clientId || targets.length === 0) return;
    const key = `client:${clientId}`;
    if (targets.some((t) => `${t.kind}:${t.id}` === key)) setTargetKey(key);
  }, [searchParams, targets]);

  useEffect(() => {
    const offerParam = searchParams.get("offer");
    if (!offerParam || offers.length === 0) return;
    if (offers.some((o) => o.id === offerParam)) setOfferId(offerParam);
  }, [searchParams, offers]);

  useEffect(() => {
    if (!user || !targetKey) {
      if (user) loadWalletsForTarget(null, null);
      return;
    }
    const [kind, id] = targetKey.split(":");
    loadWalletsForTarget(kind === "client" ? id : null, kind === "lead" ? id : null);
    /* eslint-disable-next-line */
  }, [targetKey, user?.id, period]);

  useEffect(() => {
    if (!targetKey) {
      setOffers([]);
      setOfferId("");
      return;
    }
    const [kind, id] = targetKey.split(":");
    let cancelled = false;
    setOffersLoading(true);
    (async () => {
      try {
        if (kind === "client") {
          const { data, error } = await supabase.rpc("offers_eligible_for_client", { _client_id: id });
          if (error) throw error;
          if (!cancelled) {
            setOffers(
              ((data ?? []) as (OfferPick & { title: string })[])
                .filter((o) => {
                  const cat = (o.offer_category ?? "standard").toLowerCase();
                  return selfServeTypes.size === 0 || selfServeTypes.has(cat) || !o.offer_category;
                })
                .map((o) => ({
                  id: o.id,
                  title: o.title,
                  funding_source: o.funding_source ?? "future_link",
                  fl_contribution_pct: o.fl_contribution_pct ?? null,
                  offer_category: o.offer_category ?? null,
                })),
            );
          }
        } else {
          const { data, error } = await supabase
            .from("offers")
            .select("id, title, funding_source, fl_contribution_pct, offer_category")
            .in("status", ["active", "expiring_soon"])
            .order("title");
          if (error) throw error;
          if (!cancelled) {
            setOffers(
              ((data ?? []) as OfferPick[]).filter((o) => {
                const cat = (o.offer_category ?? "standard").toLowerCase();
                return selfServeTypes.size === 0 || selfServeTypes.has(cat) || !o.offer_category;
              }),
            );
          }
        }
      } catch {
        if (!cancelled) setOffers([]);
      } finally {
        if (!cancelled) setOffersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetKey, selfServeTypes]);

  const ccy = wallet?.currency ?? "INR";
  const cap = wallet?.max_percent_per_client ?? 0;
  const sizingActive = (wallet?.potential_wallet ?? 0) > 0 || wallet?.assigned_target != null;

  const spent = useMemo(
    () =>
      allocs
        .filter((a) => a.status === "applied" && (!wallet || a.wallet_id === wallet.id))
        .reduce((s, a) => s + Number(a.amount ?? 0), 0),
    [allocs, wallet],
  );

  const remainingUnlocked = Math.max((wallet?.unlocked_amount ?? 0) - spent, 0);
  const effectiveRemaining =
    spendLimits?.effective_remaining != null ? spendLimits.effective_remaining : remainingUnlocked;

  const selectedOffer = offers.find((o) => o.id === offerId) ?? null;

  const walletDebitPreview = useMemo(() => {
    const discount = Number(amount) || 0;
    if (discount <= 0) return 0;
    if (!selectedOffer) return discount;
    if (selectedOffer.funding_source === "university") return 0;
    if (selectedOffer.funding_source === "joint") {
      return Math.round((discount * (selectedOffer.fl_contribution_pct ?? 50)) / 100);
    }
    return discount;
  }, [amount, selectedOffer]);

  const pctNum = Number(percent) || 0;
  const baseNum = Number(invoiceBase) || 0;
  const overPctCap = mode === "percent" && pctNum > cap;
  const amtNum = Number(amount) || 0;
  const overBalance = walletDebitPreview > (wallet?.balance ?? 0);
  const overUnlock = sizingActive && walletDebitPreview > effectiveRemaining;
  const isAdmin = hasRole(["admin", "administrator"]);
  const blockedWaiver = Boolean(marginPreview?.is_waiver) && !isAdmin;

  const depthPct = mode === "percent" ? pctNum : cap > 0 ? Math.min(100, (amtNum / Math.max(wallet?.balance ?? 1, 1)) * 100) : 0;
  const depthLabel = (() => {
    if (blockedWaiver) {
      return { text: "Scholarship / full waiver — admin only (submit blocked)", tone: "escalate" as const };
    }
    if (marginPreview?.below_floor) {
      return {
        text: `Below margin floor — admin approval required (min net ${marginPreview.min_net_pct ?? 80}% of invoice)`,
        tone: "escalate" as const,
      };
    }
    const level = marginPreview?.approval_level;
    if (level === "instant") {
      return { text: "Instant apply — within wallet authority", tone: "ok" as const };
    }
    if (level === "manager") {
      return { text: "11–20% — submitted to branch manager approval queue", tone: "warn" as const };
    }
    if (level === "admin") {
      return { text: ">20% — submitted to admin approval queue", tone: "escalate" as const };
    }
    if (depthPct <= 10 || amtNum <= 5000) {
      return { text: "Instant apply — within wallet authority", tone: "ok" as const };
    }
    if (depthPct <= 20) {
      return { text: "11–20% — submitted to branch manager approval queue", tone: "warn" as const };
    }
    return { text: ">20% — submitted to admin approval queue", tone: "escalate" as const };
  })();

  useEffect(() => {
    if (amtNum <= 0 && pctNum <= 0) {
      setMarginPreview(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("fn_evaluate_discount_margin", {
        _reference_amount: baseNum > 0 ? baseNum : 0,
        _discount_amount: amtNum > 0 ? amtNum : 0,
        _discount_percent: mode === "percent" && pctNum > 0 ? pctNum : null,
        _offer_id: offerId || null,
      });
      if (!cancelled) setMarginPreview((data as MarginPreview) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [amtNum, pctNum, baseNum, offerId, mode]);

  const unlockBarPct =
    wallet && wallet.potential_wallet > 0
      ? Math.min(100, (spent / wallet.potential_wallet) * 100)
      : 0;

  async function give() {
    if (!user || !wallet) {
      toast({ title: "No wallet for this period", variant: "destructive" });
      return;
    }
    if (!targetKey) {
      toast({ title: "Pick a client or lead", variant: "destructive" });
      return;
    }
    const [kind, id] = targetKey.split(":");
    if (amtNum <= 0) {
      toast({ title: "Enter the discount amount", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_submit_discount_request", {
        _offer_id: offerId || null,
        _client_id: kind === "client" ? id : null,
        _lead_id: kind === "lead" ? id : null,
        _amount: amtNum,
        _percent: mode === "percent" ? pctNum : null,
        _wallet_id: wallet.id,
        _note: null,
        _reference_amount: baseNum > 0 ? baseNum : null,
      });
      if (error) throw error;

      const result = data as ApplyResult;
      if (!result?.ok) {
        const reason =
          typeof result.reason === "string"
            ? result.reason
            : result.reason != null
              ? JSON.stringify(result.reason)
              : "Could not apply discount";
        throw new Error(reason);
      }

      if (result.pending_approval) {
        toast({
          title: "Submitted for approval",
          description:
            result.message ??
            `Awaiting ${result.approval_level ?? "manager"} review on the approvals queue.`,
        });
        setTargetKey("");
        setOfferId("");
        setPercent("");
        setAmount("");
        await loadAll();
        return;
      }

      const debited = result.debited ?? 0;
      toast({
        title: "Discount applied",
        description:
          debited > 0
            ? `${fmt(debited, ccy)} debited from wallet (${labels[targetKey] ?? "recipient"})`
            : `No wallet debit (${OFFER_FUNDING_LABELS[(result.funding_source as OfferFundingSource) ?? "university"]} funded)`,
      });
      setTargetKey("");
      setOfferId("");
      setPercent("");
      setAmount("");
      await loadAll();
    } catch (e: unknown) {
      toast({
        title: "Could not apply",
        description: formatSupabaseError(e, "Could not apply discount"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function reverse(id: string) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("wallet_allocations")
        .update({ status: "reversed" as AllocStatus, reversal_reason: "Reversed by counselor" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Reversed", description: "Amount returned to your wallet." });
      await loadAll();
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const targetName = (a: AllocRow) =>
    a.client_id
      ? (labels[`client:${a.client_id}`] ?? "Client")
      : a.lead_id
        ? (labels[`lead:${a.lead_id}`] ?? "Lead")
        : "—";

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <PerformanceHubHeader
          title="Give discount"
          subtitle={`Full-page apply · hard unlock gate · period ${period}`}
          period={period}
          showModuleLegend={false}
        />

        {wallet && sizingActive && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PerformanceMetricCard module="wallet" label="Spendable" value={fmt(remainingUnlocked, ccy)} />
            <PerformanceMetricCard module="wallet" label="Unlocked" value={fmt(wallet.unlocked_amount, ccy)} />
            <PerformanceMetricCard module="wallet" label="Potential" value={fmt(wallet.potential_wallet, ccy)} />
            <PerformanceMetricCard module="wallet" label="Spent" value={fmt(spent, ccy)} />
          </div>
        )}

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Gift className="size-4" /> Your wallet
          </div>
          {wallets.length > 1 && (
            <div>
              <label className="text-xs text-muted-foreground">Wallet to debit</label>
              <select
                className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {walletScopeLabel(w)} — {fmt(w.balance, w.currency)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="text-3xl font-semibold">
            {loading ? "…" : wallet ? fmt(wallet.balance, ccy) : "No wallet this period"}
          </div>
          {wallet && (
            <>
              <div className="text-xs text-muted-foreground">
                {walletScopeLabel(wallet)}
                {" · "}
                Max {cap}% per client
                {wallet.max_amount_per_client ? `, up to ${fmt(wallet.max_amount_per_client, ccy)} each` : ""}
                {wallet.achievement_pct != null ? ` · Achievement ${wallet.achievement_pct}%` : ""}
              </div>
              {sizingActive && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Unlocked spend cap</span>
                    <span className="font-medium">
                      {fmt(effectiveRemaining, ccy)} / {fmt(wallet.potential_wallet, ccy)} potential
                    </span>
                  </div>
                  {spendLimits?.week1_cap_active && (
                    <p className="text-xs text-amber-700">
                      Week 1 no-full-burn (W4): max {fmt(spendLimits.week1_max_spendable ?? 0, ccy)} spendable this
                      week · {fmt(spendLimits.week1_remaining ?? 0, ccy)} left
                    </p>
                  )}
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        overUnlock ? "bg-destructive" : "bg-amber-500",
                      )}
                      style={{ width: `${Math.min(unlockBarPct, 100)}%` }}
                    />
                  </div>
                  {overUnlock && (
                    <p className="text-sm text-destructive font-medium">
                      Only {fmt(effectiveRemaining, ccy)} available — reduce the discount or wait for achievement.
                      Submit blocked (allocation trigger).
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {fmt(spent, ccy)} already applied this period. Wallet debit uses funding rules when an offer is
                    selected.
                  </p>
                </div>
              )}
            </>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold">Apply a discount</h2>
          {!wallet ? (
            <div className="text-sm text-muted-foreground">
              You have no discount wallet for this period. Ask an admin to allocate your budget.
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Client / Lead (your own)</label>
                <select
                  className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                  value={targetKey}
                  onChange={(e) => {
                    setTargetKey(e.target.value);
                    setOfferId("");
                  }}
                >
                  <option value="">Select…</option>
                  {targets.map((t) => (
                    <option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {targetKey && (
                <div>
                  <label className="text-xs text-muted-foreground">Offer (optional — from approved catalogue)</label>
                  <select
                    className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                    value={offerId}
                    onChange={(e) => setOfferId(e.target.value)}
                    disabled={offersLoading}
                  >
                    <option value="">No offer — full wallet debit</option>
                    {offers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                        {o.funding_source && o.funding_source !== "future_link"
                          ? ` (${OFFER_FUNDING_LABELS[o.funding_source]})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {selectedOffer?.funding_source === "university" && (
                    <p className="text-xs mt-1 rounded-md bg-blue-500/10 text-blue-800 dark:text-blue-300 px-2 py-1">
                      University-funded — no debit from your wallet.
                    </p>
                  )}
                  {selectedOffer?.funding_source === "joint" && (
                    <p className="text-xs mt-1 rounded-md bg-amber-500/10 text-amber-900 dark:text-amber-200 px-2 py-1">
                      Joint offer — your wallet debits {selectedOffer.fl_contribution_pct ?? 50}% of the discount
                      value.
                    </p>
                  )}
                  {selectedOffer?.funding_source === "future_link" && (
                    <p className="text-xs mt-1 rounded-md bg-violet-500/10 text-violet-900 dark:text-violet-200 px-2 py-1">
                      FL-funded — full discount debits your wallet.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground">
                  Invoice base before discount ({ccy}) — for margin floor (O16)
                </label>
                <Input
                  className="mt-1"
                  value={invoiceBase}
                  onChange={(e) => setInvoiceBase(e.target.value)}
                  placeholder="e.g. 20000"
                />
                {baseNum > 0 && marginPreview?.min_net_required != null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Min net after discount: {fmt(marginPreview.min_net_required, ccy)}
                    {marginPreview.max_discount_without_floor != null && (
                      <> · max discount without floor breach: {fmt(marginPreview.max_discount_without_floor, ccy)}</>
                    )}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Discount mode</label>
                  <select
                    className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "percent" | "amount")}
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="amount">Fixed amount</option>
                  </select>
                </div>
                {mode === "percent" && (
                  <div>
                    <label className="text-xs text-muted-foreground">Percent</label>
                    <Input
                      className="mt-1"
                      value={percent}
                      onChange={(e) => setPercent(e.target.value)}
                      placeholder={`max ${cap}%`}
                    />
                    {overPctCap && (
                      <div className="text-xs text-destructive mt-1">Over the {cap}% cap — needs manager approval.</div>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">Amount ({ccy})</label>
                  <Input
                    className="mt-1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="discount value"
                  />
                  {walletDebitPreview > 0 && walletDebitPreview !== amtNum && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Wallet debit preview: {fmt(walletDebitPreview, ccy)}
                    </div>
                  )}
                  {overBalance && (
                    <div className="text-xs text-destructive mt-1">Exceeds your balance.</div>
                  )}
                  {overUnlock && (
                    <div className="text-xs text-destructive mt-1">
                      Exceeds unlocked budget ({fmt(remainingUnlocked, ccy)} remaining).
                    </div>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "rounded-md border px-3 py-2 text-xs",
                  depthLabel.tone === "ok" && "border-emerald-500/30 bg-emerald-500/5",
                  depthLabel.tone === "warn" && "border-amber-500/30 bg-amber-500/5",
                  depthLabel.tone === "escalate" && "border-destructive/30 bg-destructive/5",
                )}
              >
                Approval depth: {depthLabel.text}
              </div>

              {marginPreview?.net_after_discount != null && baseNum > 0 && (
                <p className="text-xs text-muted-foreground">
                  Net after discount: {fmt(marginPreview.net_after_discount, ccy)}
                  {marginPreview.below_floor && (
                    <span className="text-destructive font-medium"> · below margin floor</span>
                  )}
                  {marginPreview.is_waiver && (
                    <span className="text-destructive font-medium"> · full waiver</span>
                  )}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Enter the discount value in {ccy}. Unlock limits apply once your wallet has been sized for the period.
              </p>

              <Button disabled={busy || overBalance || overUnlock || overPctCap || blockedWaiver} onClick={give}>
                <Gift className="size-4 mr-1" /> Apply discount
              </Button>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">My discounts this period</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : allocs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No discounts given yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Recipient</th>
                    <th className="py-2 pr-4 text-right">Percent</th>
                    <th className="py-2 pr-4 text-right">Debited</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {allocs.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{targetName(a)}</td>
                      <td className="py-2 pr-4 text-right">{a.percent != null ? `${a.percent}%` : "—"}</td>
                      <td className="py-2 pr-4 text-right">{fmt(a.amount, a.currency)}</td>
                      <td className="py-2 pr-4 capitalize">
                        {a.status}
                        {a.exceeded_cap && a.status !== "reversed" ? " · over cap" : ""}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {a.status !== "reversed" && (
                          <Button variant="ghost" size="sm" disabled={busy} onClick={() => reverse(a.id)}>
                            <RotateCcw className="size-4 mr-1" /> Reverse
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
