import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, DollarSign, Save } from "lucide-react";
import { toast } from "sonner";
import { refreshMaster, type MasterItem } from "@/lib/masters";
import {
  applyGlobalBufferToGeneralRates,
  computeEffectiveRate,
  currentPeriodKey,
  displayEffectiveRate,
  fetchCurrencyMasterConfig,
  resolveRowBuffer,
  saveCurrencyMasterConfig,
  upsertGeneralFxRate,
  type CurrencyMasterConfig,
} from "@/lib/currencyMaster";
import type { FxRateRow } from "@/lib/fxPolicy";

interface FxRow extends FxRateRow {
  id: string;
  period_key: string;
  source: string;
  rate_purpose: string;
}

const emptyCurrency = (): Partial<MasterItem> => ({
  code: "",
  label: "",
  metadata: { symbol: "", countries: [] as string[] },
  is_active: true,
  sort_order: 0,
});

export function CurrenciesSection() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [fxRows, setFxRows] = useState<FxRow[]>([]);
  const [config, setConfig] = useState<CurrencyMasterConfig>({ default_buffer_fixed: 0, default_buffer_pct: 0 });
  const [globalBufferDraft, setGlobalBufferDraft] = useState("0");
  const [globalBufferPctDraft, setGlobalBufferPctDraft] = useState("0");
  const [loading, setLoading] = useState(false);
  const [savingBuffer, setSavingBuffer] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<MasterItem>>(emptyCurrency());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [countriesText, setCountriesText] = useState("");
  const periodKey = currentPeriodKey();

  const load = async () => {
    setLoading(true);
    const [cfg, curRes, fxRes] = await Promise.all([
      fetchCurrencyMasterConfig(),
      supabase
        .from("master_items")
        .select("*")
        .eq("list_key", "currencies")
        .order("sort_order")
        .order("label"),
      supabase
        .from("fx_rates")
        .select("*")
        .eq("period_key", periodKey)
        .eq("rate_purpose", "general")
        .order("currency"),
    ]);
    setConfig(cfg);
    setGlobalBufferDraft(String(cfg.default_buffer_fixed));
    setGlobalBufferPctDraft(String(cfg.default_buffer_pct));
    setItems((curRes.data ?? []) as MasterItem[]);
    setFxRows((fxRes.data ?? []) as FxRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const fxByCurrency = useMemo(() => {
    const m = new Map<string, FxRow>();
    for (const r of fxRows) m.set(r.currency.toUpperCase(), r);
    return m;
  }, [fxRows]);

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyCurrency());
    setCountriesText("");
    setOpen(true);
  };

  const openEdit = (it: MasterItem) => {
    setEditingId(it.id);
    setDraft({ ...it });
    setCountriesText(((it.metadata?.countries as string[]) ?? []).join(", "));
    setOpen(true);
  };

  const saveCurrency = async () => {
    const code = (draft.code ?? "").trim().toUpperCase();
    const label = (draft.label ?? "").trim();
    if (!code || !label) return toast.error("Code and name are required");
    const countries = countriesText
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      list_key: "currencies",
      code,
      label,
      is_active: draft.is_active ?? true,
      sort_order: draft.sort_order ?? items.length * 10 + 10,
      metadata: {
        ...(draft.metadata ?? {}),
        symbol: String((draft.metadata as { symbol?: string })?.symbol ?? code),
        countries,
      },
    };
    if (editingId) {
      const { error } = await supabase.from("master_items").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("master_items").insert(payload);
      if (error) return toast.error(error.message);
    }
    await refreshMaster("currencies" as never);
    toast.success(editingId ? "Currency updated" : "Currency added");
    setOpen(false);
    load();
  };

  const toggleActive = async (it: MasterItem) => {
    if (it.code.toUpperCase() === "INR") return toast.error("INR cannot be deactivated");
    const { error } = await supabase.from("master_items").update({ is_active: !it.is_active }).eq("id", it.id);
    if (error) return toast.error(error.message);
    await refreshMaster("currencies" as never);
    load();
  };

  const saveGlobalBuffer = async () => {
    const fixed = Number(globalBufferDraft);
    const pct = Number(globalBufferPctDraft);
    if (!Number.isFinite(fixed) || fixed < 0) return toast.error("Enter a valid buffer (INR)");
    if (!Number.isFinite(pct) || pct < 0) return toast.error("Enter a valid buffer %");
    setSavingBuffer(true);
    try {
      const next: CurrencyMasterConfig = {
        default_buffer_fixed: fixed,
        default_buffer_pct: pct,
      };
      await saveCurrencyMasterConfig(next);
      await applyGlobalBufferToGeneralRates(next, periodKey);
      setConfig(next);
      toast.success("Global buffer saved — all rates recalculated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save buffer");
    } finally {
      setSavingBuffer(false);
    }
  };

  const saveFxRow = async (
    currency: string,
    baseRate: string,
    bufferRate: string,
    effectiveRate: string,
  ) => {
    const code = currency.toUpperCase();
    if (code === "INR") return;
    let base = Number(baseRate);
    if (!base || base <= 0) return toast.error("Enter a valid base rate to INR");

    let bufferFixed = bufferRate.trim() !== "" ? Number(bufferRate) : config.default_buffer_fixed;
    if (!Number.isFinite(bufferFixed) || bufferFixed < 0) {
      return toast.error("Enter a valid buffer");
    }

    const effectiveInput = effectiveRate.trim();
    if (effectiveInput !== "") {
      const eff = Number(effectiveInput);
      if (!eff || eff <= 0) return toast.error("Enter a valid effective rate");
      if (config.default_buffer_pct <= 0) {
        bufferFixed = Math.round((eff - base) * 10000) / 10000;
      }
    }

    try {
      await upsertGeneralFxRate({
        currency: code,
        baseRate: base,
        bufferFixed,
        bufferPct: config.default_buffer_pct,
        periodKey,
      });
      toast.success(`Rates saved for ${code}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save rate");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Currency Master
          </h2>
          <p className="text-sm text-muted-foreground">
            Single source for currency codes and exchange rates ({periodKey}). Used by lead budget, invoices,
            payments, reporting, and Performance Hub.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Add currency
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">Global buffer (applies to all currencies)</div>
        <p className="text-xs text-muted-foreground">
          Effective rate = base + buffer (INR), unless buffer % is set. Change anytime — all general rates
          recalculate.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Buffer fixed (+ INR)</Label>
            <Input
              className="h-9 w-28"
              value={globalBufferDraft}
              onChange={(e) => setGlobalBufferDraft(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Buffer % (optional)</Label>
            <Input
              className="h-9 w-28"
              value={globalBufferPctDraft}
              onChange={(e) => setGlobalBufferPctDraft(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={saveGlobalBuffer} disabled={savingBuffer}>
            <Save className="h-4 w-4 mr-1" /> Save buffer
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40 gap-1">
          <div className="col-span-1">Code</div>
          <div className="col-span-2">Name</div>
          <div className="col-span-2">Countries</div>
          <div className="col-span-2">Base → INR</div>
          <div className="col-span-2">Buffer</div>
          <div className="col-span-2">Effective → INR</div>
          <div className="col-span-1">Active</div>
        </div>
        {loading && <div className="px-4 py-8 text-sm text-muted-foreground">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="px-4 py-8 text-sm text-muted-foreground">No currencies configured.</div>
        )}
        {items.map((it) => {
          const fx = fxByCurrency.get(it.code.toUpperCase());
          const countries = ((it.metadata?.countries as string[]) ?? []).join(", ");
          const isInr = it.code.toUpperCase() === "INR";
          const bufferVal = fx ? resolveRowBuffer(fx, config) : config.default_buffer_fixed;
          const effectiveVal = fx ? displayEffectiveRate(fx, config) : isInr ? 1 : null;
          return (
            <div key={it.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm border-b gap-1">
              <div className="col-span-1 font-mono font-medium">{it.code}</div>
              <div className="col-span-2 truncate">{it.label}</div>
              <div className="col-span-2 text-xs text-muted-foreground truncate" title={countries}>
                {countries || "—"}
              </div>
              {isInr ? (
                <>
                  <div className="col-span-2 text-muted-foreground">1.0000</div>
                  <div className="col-span-2 text-muted-foreground">—</div>
                  <div className="col-span-2 text-muted-foreground">1.0000</div>
                </>
              ) : (
                <FxRateRowEditor
                  key={`${it.id}-${fx?.id ?? "new"}-${bufferVal}`}
                  initialBase={fx ? String(fx.base_rate_to_inr ?? "") : ""}
                  initialBuffer={String(bufferVal)}
                  initialEffective={effectiveVal != null && effectiveVal > 0 ? effectiveVal.toFixed(4) : ""}
                  onSave={(base, buffer, effective) => saveFxRow(it.code, base, buffer, effective)}
                />
              )}
              <div className="col-span-1 flex items-center gap-1">
                <Switch
                  checked={it.is_active}
                  disabled={isInr}
                  onCheckedChange={() => toggleActive(it)}
                />
                <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(it)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit currency" : "Add currency"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={draft.code ?? ""}
                disabled={!!editingId}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="USD"
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={draft.label ?? ""} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Symbol</Label>
              <Input
                value={String((draft.metadata as { symbol?: string })?.symbol ?? "")}
                onChange={(e) =>
                  setDraft({ ...draft, metadata: { ...(draft.metadata ?? {}), symbol: e.target.value } })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Linked countries (comma-separated)</Label>
              <Input
                value={countriesText}
                onChange={(e) => setCountriesText(e.target.value)}
                placeholder="United States, Canada"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCurrency}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FxRateRowEditor({
  initialBase,
  initialBuffer,
  initialEffective,
  onSave,
}: {
  initialBase: string;
  initialBuffer: string;
  initialEffective: string;
  onSave: (base: string, buffer: string, effective: string) => void;
}) {
  const [base, setBase] = useState(initialBase);
  const [buffer, setBuffer] = useState(initialBuffer);
  const [effective, setEffective] = useState(initialEffective);

  useEffect(() => {
    setBase(initialBase);
    setBuffer(initialBuffer);
    setEffective(initialEffective);
  }, [initialBase, initialBuffer, initialEffective]);

  const recomputeEffective = (b: string, buf: string) => {
    const baseN = Number(b);
    const bufN = Number(buf);
    if (baseN > 0 && Number.isFinite(bufN)) {
      setEffective(computeEffectiveRate("X", baseN, bufN).toFixed(4));
    }
  };

  return (
    <>
      <div className="col-span-2">
        <Input
          className="h-8 text-xs"
          value={base}
          onChange={(e) => {
            setBase(e.target.value);
            recomputeEffective(e.target.value, buffer);
          }}
          onBlur={() => base.trim() && onSave(base, buffer, effective)}
          placeholder="Base"
        />
      </div>
      <div className="col-span-2">
        <Input
          className="h-8 text-xs"
          value={buffer}
          onChange={(e) => {
            setBuffer(e.target.value);
            recomputeEffective(base, e.target.value);
          }}
          onBlur={() => base.trim() && onSave(base, buffer, effective)}
          placeholder="+ INR"
        />
      </div>
      <div className="col-span-2">
        <Input
          className="h-8 text-xs"
          value={effective}
          onChange={(e) => setEffective(e.target.value)}
          onBlur={() => base.trim() && onSave(base, buffer, effective)}
          placeholder="Effective"
        />
      </div>
    </>
  );
}
