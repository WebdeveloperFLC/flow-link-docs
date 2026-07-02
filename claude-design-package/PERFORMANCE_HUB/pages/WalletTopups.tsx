import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceLegacyDeskNav } from "@/components/performance/PerformanceLegacyDeskNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, Calculator, Zap } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { isStrategicWallet, walletScopeLabel } from "@/lib/walletScope";

type WalletRow = Pick<
  Database["public"]["Tables"]["discount_wallets"]["Row"],
  | "id"
  | "name"
  | "counselor_id"
  | "period_key"
  | "currency"
  | "balance"
  | "max_percent_per_client"
  | "max_amount_per_client"
  | "rollover_policy"
  | "budget_kind"
  | "valid_from"
  | "valid_to"
  | "scope_country_tag"
  | "scope_master_key"
  | "scope_sub_category"
  | "scope_service_code"
  | "assigned_target"
  | "base_wallet"
  | "performance_multiplier"
  | "potential_wallet"
  | "achieved_revenue"
  | "achievement_pct"
  | "unlocked_amount"
>;

type RolloverPolicy = Database["public"]["Enums"]["wallet_rollover_policy"];
type TopupType = "base" | "performance" | "scheme" | "manual";
type BudgetKind = Database["public"]["Enums"]["wallet_budget_kind"];
const ROLLOVER: RolloverPolicy[] = ["expire", "partial", "full"];
const TOPUP_TYPES: TopupType[] = ["base", "performance", "scheme", "manual"];

// master_key -> friendly "Category" label (matches Masters service form)
const CATEGORIES: { key: string; label: string }[] = [
  { key: "coaching_services", label: "Coaching" },
  { key: "visa_immigration", label: "Visa & Immigration" },
  { key: "admission_services", label: "Admissions" },
  { key: "allied_services", label: "Allied" },
  { key: "settlement_services", label: "Settlement" },
  { key: "travel_financial", label: "Travel & Financial" },
];
const catLabel = (k: string | null) => CATEGORIES.find((c) => c.key === k)?.label ?? k ?? "";

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function endOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}
function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";
const CURRENCIES = ["INR", "CAD", "USD", "GBP", "AUD"];

const WALLET_SIZING_SELECT =
  "id, name, counselor_id, period_key, currency, balance, max_percent_per_client, max_amount_per_client, rollover_policy, budget_kind, valid_from, valid_to, scope_country_tag, scope_master_key, scope_sub_category, scope_service_code, assigned_target, base_wallet, performance_multiplier, potential_wallet, achieved_revenue, achievement_pct, unlocked_amount";

const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()} ${ccy !== "INR" ? ccy : ""}`.trim();

const pct = (n: number | null | undefined) => (n == null ? "—" : `${n}%`);

interface ServiceRow {
  master_key: string;
  sub_category: string | null;
  service_name: string;
  service_code: string | null;
  country_tag: string | null;
}

export default function WalletTopups() {
  const { toast } = useToast();
  const [period, setPeriod] = useState(currentPeriodKey());
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [graceUnit, setGraceUnit] = useState<"days" | "end_of_next_month">("days");
  const [graceDays, setGraceDays] = useState("30");
  const [spendOrder, setSpendOrder] = useState<"strategic_first" | "personal_first" | "parallel">("strategic_first");

  const [cw, setCw] = useState({
    counselor_id: "",
    name: "",
    currency: "INR",
    max_percent: "10",
    max_amount: "",
    rollover: "expire" as RolloverPolicy,
    budget_kind: "month_to_month" as BudgetKind,
    valid_from: startOfMonthISO(),
    valid_to: endOfMonthISO(),
    carry_to_period: "",
    scope_country: "",
    scope_category: "",
    scope_sub: "",
    scope_service: "",
  });
  const [tu, setTu] = useState({
    wallet_id: "",
    amount: "",
    topup_type: "base" as TopupType,
    rollover: "expire" as RolloverPolicy,
    reason: "",
  });

  async function loadAll() {
    setLoading(true);
    const [pr, w, sc, ws] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
      supabase
        .from("discount_wallets")
        .select(WALLET_SIZING_SELECT)
        .eq("period_key", period)
        .order("created_at", { ascending: false }),
      import("@/lib/leads").then(({ fetchAllServiceCatalogue }) => fetchAllServiceCatalogue()),
      supabase
        .from("wallet_settings")
        .select("grace_unit, grace_days, target_base_pct, unlock_threshold_pct, spend_order")
        .eq("id", 1)
        .maybeSingle(),
    ]);
    setProfiles(((pr.data ?? []) as any[]).map((p) => ({ id: p.id, name: p.full_name ?? p.email ?? p.id })));
    setWallets((w.data ?? []) as WalletRow[]);
    const cat = Array.isArray(sc) ? sc : [];
    setServices(
      cat.map((s) => ({
        master_key: s.master_key,
        sub_category: s.sub_category ?? null,
        service_name: s.service_name,
        service_code: s.service_code ?? s.id,
        country_tag: s.country_tag ?? null,
      })) as ServiceRow[],
    );
    if (ws.data) {
      const row = ws.data as {
        grace_unit: string;
        grace_days: number;
        spend_order?: "strategic_first" | "personal_first" | "parallel";
      };
      setGraceUnit(row.grace_unit as "days" | "end_of_next_month");
      setGraceDays(String(row.grace_days));
      if (row.spend_order) setSpendOrder(row.spend_order);
    }
    setLoading(false);
  }
  useEffect(() => {
    loadAll(); /* eslint-disable-next-line */
  }, [period]);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name ?? id;

  // cascading scope options derived from service library catalogue
  const countries = useMemo(
    () => Array.from(new Set(services.map((s) => s.country_tag).filter(Boolean))) as string[],
    [services],
  );
  const subCategories = useMemo(() => {
    let rows = services;
    if (cw.scope_category) rows = rows.filter((s) => s.master_key === cw.scope_category);
    if (cw.scope_country) rows = rows.filter((s) => s.country_tag === cw.scope_country);
    return Array.from(new Set(rows.map((s) => s.sub_category).filter(Boolean))) as string[];
  }, [services, cw.scope_category, cw.scope_country]);
  const serviceOpts = useMemo(() => {
    let rows = services;
    if (cw.scope_category) rows = rows.filter((s) => s.master_key === cw.scope_category);
    if (cw.scope_country) rows = rows.filter((s) => s.country_tag === cw.scope_country);
    if (cw.scope_sub) rows = rows.filter((s) => s.sub_category === cw.scope_sub);
    return rows.filter((s) => s.service_code);
  }, [services, cw.scope_category, cw.scope_country, cw.scope_sub]);

  async function saveGrace() {
    const { error } = await supabase
      .from("wallet_settings")
      .update({
        grace_unit: graceUnit,
        grace_days: Number(graceDays) || 30,
        spend_order: spendOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Wallet policy saved" });
  }

  const strategicWallets = useMemo(() => wallets.filter((w) => isStrategicWallet(w)), [wallets]);

  async function createWallet() {
    if (!cw.counselor_id) {
      toast({ title: "Pick a counselor", variant: "destructive" });
      return;
    }
    if (cw.budget_kind === "festive" && !cw.valid_to) {
      toast({ title: "Festive offers need an end date", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      // month-to-month forces expire + month window; festive/scoped use entered dates
      const isMtm = cw.budget_kind === "month_to_month";
      const payload: any = {
        counselor_id: cw.counselor_id,
        // advance offers: file under the month of valid_from; month-to-month uses the page period
        period_key: isMtm ? period : (cw.valid_from && cw.valid_from.slice(0, 7)) || period,
        name: cw.name.trim() || (isMtm ? `${period} budget` : null),
        currency: cw.currency,
        balance: 0,
        max_percent_per_client: Number(cw.max_percent) || 0,
        max_amount_per_client: cw.max_amount.trim() === "" ? null : Number(cw.max_amount),
        rollover_policy: isMtm ? "expire" : cw.rollover,
        budget_kind: cw.budget_kind,
        valid_from: isMtm ? startOfMonthISO() : cw.valid_from || null,
        valid_to: isMtm ? endOfMonthISO() : cw.valid_to || null,
        carry_to_period: cw.budget_kind === "festive" ? cw.carry_to_period || null : null,
        scope_country_tag: cw.budget_kind === "scoped" ? cw.scope_country || null : null,
        scope_master_key: cw.budget_kind === "scoped" ? cw.scope_category || null : null,
        scope_sub_category: cw.budget_kind === "scoped" ? cw.scope_sub || null : null,
        scope_service_code: cw.budget_kind === "scoped" ? cw.scope_service || null : null,
      };
      const { error } = await supabase.from("discount_wallets").insert([payload]);
      if (error) throw error;
      toast({ title: "Wallet created", description: `${nameOf(cw.counselor_id)} · ${period}` });
      setCw({
        ...cw,
        counselor_id: "",
        name: "",
        scope_country: "",
        scope_category: "",
        scope_sub: "",
        scope_service: "",
        carry_to_period: "",
      });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function topUp() {
    if (!tu.wallet_id) {
      toast({ title: "Pick a wallet", variant: "destructive" });
      return;
    }
    const amt = Number(tu.amount) || 0;
    if (amt <= 0) {
      toast({ title: "Enter an amount", variant: "destructive" });
      return;
    }
    const wallet = wallets.find((w) => w.id === tu.wallet_id);
    setBusy(true);
    try {
      const { error } = await supabase.from("wallet_topups").insert([
        {
          wallet_id: tu.wallet_id,
          amount: amt,
          currency: wallet?.currency ?? "INR",
          topup_type: tu.topup_type,
          rollover_policy: tu.rollover,
          reason: tu.reason.trim() || null,
        },
      ]);
      if (error) throw error;
      toast({ title: "Topped up", description: `${fmt(amt, wallet?.currency ?? "INR")} added` });
      setTu({ wallet_id: "", amount: "", topup_type: "base", rollover: "expire", reason: "" });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function recalculateSizing() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_size_wallets_for_period", { _period_key: period });
      if (error) throw error;
      toast({ title: "Sizing recalculated", description: `${data ?? 0} wallet(s) updated for ${period}.` });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function autoFundAll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_auto_fund_wallets_for_period", { _period_key: period });
      if (error) throw error;
      const res = data as { wallets_processed?: number; wallets_funded?: number } | null;
      toast({
        title: "Auto-fund complete",
        description: `${res?.wallets_funded ?? 0} of ${res?.wallets_processed ?? 0} wallet(s) topped up to base.`,
      });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function autoFundOne(walletId: string) {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_auto_fund_wallet", { _wallet_id: walletId });
      if (error) throw error;
      const res = data as { funded?: boolean; delta?: number } | null;
      toast({
        title: res?.funded ? "Wallet funded" : "Already at base",
        description: res?.funded ? `Added ${fmt(Number(res?.delta ?? 0), "INR")} to base.` : "No top-up needed.",
      });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const isMtm = cw.budget_kind === "month_to_month";

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <PerformanceLegacyDeskNav workspace="discounts-wallets" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold">Wallet Top-ups</h1>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mr-2">Period</label>
            <Input
              className="inline-block w-32"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="2026-05"
            />
          </div>
        </div>

        {/* Policy */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-3">Wallet policy</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Policy</label>
              <select className={sel} value={graceUnit} onChange={(e) => setGraceUnit(e.target.value as any)}>
                <option value="days">Number of days after close</option>
                <option value="end_of_next_month">Until end of next month</option>
              </select>
            </div>
            {graceUnit === "days" && (
              <div>
                <label className="text-xs text-muted-foreground">Days</label>
                <Input className="mt-1 w-24" value={graceDays} onChange={(e) => setGraceDays(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Spend order (Give Discount)</label>
              <select className={sel} value={spendOrder} onChange={(e) => setSpendOrder(e.target.value as typeof spendOrder)}>
                <option value="strategic_first">Strategic wallets first</option>
                <option value="personal_first">Personal wallet first</option>
                <option value="parallel">Counsellor picks wallet</option>
              </select>
            </div>
            <Button variant="outline" onClick={saveGrace}>
              Save policy
            </Button>
          </div>
        </Card>

        {strategicWallets.length > 0 && (
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-2">Strategic wallets — {period}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Ring-fenced budgets (scoped/festive). Counsellors can only spend these on matching clients/leads.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {strategicWallets.map((w) => (
                <div key={w.id} className="border rounded-lg p-3 text-sm">
                  <div className="font-medium">{nameOf(w.counselor_id)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{walletScopeLabel(w)}</div>
                  <div className="mt-2 flex justify-between">
                    <span>Balance</span>
                    <span className="font-medium">{fmt(w.balance, w.currency)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Unlocked</span>
                    <span>{fmt(w.unlocked_amount, w.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Performance-linked sizing */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="size-5 text-primary" />
                Performance-linked sizing
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Base wallet from prior-month achievement + rules; potential = base × multiplier. Requires{" "}
                <code className="text-xs">incentive_targets</code> for the period.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={recalculateSizing} disabled={busy}>
                <Calculator className="size-4 mr-1" />
                Recalculate all
              </Button>
              <Button onClick={autoFundAll} disabled={busy}>
                <Zap className="size-4 mr-1" />
                Auto-fund all (→ base)
              </Button>
            </div>
          </div>
        </Card>

        {/* Create wallet */}
        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Create / set up a wallet</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Counselor</label>
              <select
                className={sel}
                value={cw.counselor_id}
                onChange={(e) => setCw({ ...cw, counselor_id: e.target.value })}
              >
                <option value="">Select…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Budget kind</label>
              <select
                className={sel}
                value={cw.budget_kind}
                onChange={(e) => setCw({ ...cw, budget_kind: e.target.value as BudgetKind })}
              >
                <option value="month_to_month">Month-to-month</option>
                <option value="festive">Festive offer</option>
                <option value="scoped">Scoped offer</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">
                Offer name {cw.budget_kind !== "month_to_month" ? "" : "(optional)"}
              </label>
              <Input
                className="mt-1"
                value={cw.name}
                onChange={(e) => setCw({ ...cw, name: e.target.value })}
                placeholder={
                  cw.budget_kind === "festive"
                    ? "e.g. Diwali Offer"
                    : cw.budget_kind === "scoped"
                      ? "e.g. Canada coaching budget"
                      : "auto if blank"
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Currency</label>
              <select className={sel} value={cw.currency} onChange={(e) => setCw({ ...cw, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max % per client</label>
              <Input
                className="mt-1"
                value={cw.max_percent}
                onChange={(e) => setCw({ ...cw, max_percent: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max amount/client (blank = none)</label>
              <Input
                className="mt-1"
                value={cw.max_amount}
                onChange={(e) => setCw({ ...cw, max_amount: e.target.value })}
              />
            </div>
          </div>

          {/* Lifetime + rollover (month-to-month auto-sets these) */}
          {isMtm ? (
            <p className="text-xs text-muted-foreground">
              Month-to-month: auto-expires at month end ({endOfMonthISO()}), rollover set to expire. Carry-forward can
              still be granted at period close.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Valid from</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={cw.valid_from}
                  onChange={(e) => setCw({ ...cw, valid_from: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Valid to</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={cw.valid_to}
                  onChange={(e) => setCw({ ...cw, valid_to: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Rollover policy</label>
                <select
                  className={sel}
                  value={cw.rollover}
                  onChange={(e) => setCw({ ...cw, rollover: e.target.value as RolloverPolicy })}
                >
                  {ROLLOVER.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {cw.budget_kind === "festive" && (
                <div>
                  <label className="text-xs text-muted-foreground">Carry-to period (if rolling)</label>
                  <Input
                    className="mt-1"
                    value={cw.carry_to_period}
                    onChange={(e) => setCw({ ...cw, carry_to_period: e.target.value })}
                    placeholder="2026-12"
                  />
                </div>
              )}
            </div>
          )}

          {/* Scope cascade (scoped only) */}
          {cw.budget_kind === "scoped" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t pt-3">
              <div>
                <label className="text-xs text-muted-foreground">Country</label>
                <select
                  className={sel}
                  value={cw.scope_country}
                  onChange={(e) => setCw({ ...cw, scope_country: e.target.value, scope_sub: "", scope_service: "" })}
                >
                  <option value="">Any</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <select
                  className={sel}
                  value={cw.scope_category}
                  onChange={(e) => setCw({ ...cw, scope_category: e.target.value, scope_sub: "", scope_service: "" })}
                >
                  <option value="">Any</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Sub-category</label>
                <select
                  className={sel}
                  value={cw.scope_sub}
                  onChange={(e) => setCw({ ...cw, scope_sub: e.target.value, scope_service: "" })}
                >
                  <option value="">Any</option>
                  {subCategories.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Service</label>
                <select
                  className={sel}
                  value={cw.scope_service}
                  onChange={(e) => setCw({ ...cw, scope_service: e.target.value })}
                >
                  <option value="">Any</option>
                  {serviceOpts.map((s) => (
                    <option key={s.service_code!} value={s.service_code!}>
                      {s.service_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <Button onClick={createWallet} disabled={busy}>
            <Plus className="size-4 mr-1" /> Create wallet
          </Button>
        </Card>

        {/* Top up */}
        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Add a top-up</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Wallet</label>
              <select
                className={sel}
                value={tu.wallet_id}
                onChange={(e) => setTu({ ...tu, wallet_id: e.target.value })}
              >
                <option value="">Select…</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {nameOf(w.counselor_id)} · {w.name ?? w.budget_kind} · {fmt(w.balance, w.currency)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <Input className="mt-1" value={tu.amount} onChange={(e) => setTu({ ...tu, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                className={sel}
                value={tu.topup_type}
                onChange={(e) => setTu({ ...tu, topup_type: e.target.value as TopupType })}
              >
                {TOPUP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rollover</label>
              <select
                className={sel}
                value={tu.rollover}
                onChange={(e) => setTu({ ...tu, rollover: e.target.value as RolloverPolicy })}
              >
                {ROLLOVER.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Reason (optional)</label>
            <Input
              className="mt-1"
              value={tu.reason}
              onChange={(e) => setTu({ ...tu, reason: e.target.value })}
              placeholder="e.g. May base allocation, off-season boost"
            />
          </div>
          <Button onClick={topUp} disabled={busy}>
            <Plus className="size-4 mr-1" /> Add top-up
          </Button>
        </Card>

        {/* Wallets for period */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Wallets — {period}</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : wallets.length === 0 ? (
            <div className="text-sm text-muted-foreground">No wallets for this period yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">Counselor</th>
                    <th className="py-2 pr-3 text-right">Target</th>
                    <th className="py-2 pr-3 text-right">Achv%</th>
                    <th className="py-2 pr-3 text-right">Base</th>
                    <th className="py-2 pr-3 text-right">×Mult</th>
                    <th className="py-2 pr-3 text-right">Potential</th>
                    <th className="py-2 pr-3 text-right">Unlocked</th>
                    <th className="py-2 pr-3 text-right">Balance</th>
                    <th className="py-2 pr-3">Kind</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w) => (
                      <tr key={w.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{nameOf(w.counselor_id)}</div>
                          <div className="text-xs text-muted-foreground">{w.name ?? w.budget_kind.replace(/_/g, "-")}</div>
                        </td>
                        <td className="py-2 pr-3 text-right text-xs">
                          {w.assigned_target != null ? fmt(w.assigned_target, w.currency) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-right">{pct(w.achievement_pct)}</td>
                        <td className="py-2 pr-3 text-right">{fmt(w.base_wallet, w.currency)}</td>
                        <td className="py-2 pr-3 text-right">{Number(w.performance_multiplier ?? 1).toFixed(2)}</td>
                        <td className="py-2 pr-3 text-right">{fmt(w.potential_wallet, w.currency)}</td>
                        <td className="py-2 pr-3 text-right">{fmt(w.unlocked_amount, w.currency)}</td>
                        <td className="py-2 pr-3 text-right font-medium">{fmt(w.balance, w.currency)}</td>
                        <td className="py-2 pr-3 capitalize text-xs">{w.budget_kind.replace(/_/g, "-")}</td>
                        <td className="py-2 pr-3 text-right">
                          {w.budget_kind === "month_to_month" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={busy} onClick={() => autoFundOne(w.id)}>
                              Fund
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
