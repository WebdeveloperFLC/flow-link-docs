import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { refreshMaster, type MasterItem } from "@/lib/masters";
import { currentPeriodKey, displayEffectiveRate } from "@/lib/currencyMaster";
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
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<MasterItem>>(emptyCurrency());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [countriesText, setCountriesText] = useState("");
  const periodKey = currentPeriodKey();

  const load = async () => {
    setLoading(true);
    const [{ data: curData }, { data: fxData }] = await Promise.all([
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
    setItems((curData ?? []) as MasterItem[]);
    setFxRows((fxData ?? []) as FxRow[]);
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

  const saveFxRate = async (currency: string, baseRate: string) => {
    const base = Number(baseRate);
    if (!base || base <= 0) return toast.error("Enter a valid base rate to INR");
    const existing = fxByCurrency.get(currency.toUpperCase());
    if (existing) {
      const { error } = await supabase
        .from("fx_rates")
        .update({ base_rate_to_inr: base, rate_to_inr: base + 2, source: "masters" })
        .eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("fx_rates").insert({
        currency: currency.toUpperCase(),
        period_key: periodKey,
        base_rate_to_inr: base,
        rate_to_inr: base + 2,
        buffer_fixed: 2,
        source: "masters",
        rate_purpose: "general",
      });
      if (error) return toast.error(error.message);
    }
    toast.success(`FX rate saved for ${currency}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Currency Master
          </h2>
          <p className="text-sm text-muted-foreground">
            Single source for currency codes and exchange rates ({periodKey}). Used by lead budget conversion, Service
            Library fees, and CRM billing.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Add currency
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
          <div className="col-span-2">Code</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Countries</div>
          <div className="col-span-2">Rate → INR</div>
          <div className="col-span-1">Active</div>
          <div className="col-span-1 text-right">Edit</div>
        </div>
        {loading && <div className="px-4 py-8 text-sm text-muted-foreground">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="px-4 py-8 text-sm text-muted-foreground">No currencies configured.</div>
        )}
        {items.map((it) => {
          const fx = fxByCurrency.get(it.code.toUpperCase());
          const countries = ((it.metadata?.countries as string[]) ?? []).join(", ");
          return (
            <div key={it.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm border-b gap-2">
              <div className="col-span-2 font-mono font-medium">{it.code}</div>
              <div className="col-span-3">{it.label}</div>
              <div className="col-span-3 text-xs text-muted-foreground truncate" title={countries}>
                {countries || "—"}
              </div>
              <div className="col-span-2">
                {it.code.toUpperCase() === "INR" ? (
                  <span className="text-muted-foreground">1.0000</span>
                ) : (
                  <FxRateCell
                    currency={it.code}
                    initial={fx ? String(fx.base_rate_to_inr ?? fx.rate_to_inr ?? "") : ""}
                    effective={fx ? displayEffectiveRate(fx) : null}
                    onSave={(v) => saveFxRate(it.code, v)}
                  />
                )}
              </div>
              <div className="col-span-1">
                <Switch
                  checked={it.is_active}
                  disabled={it.code.toUpperCase() === "INR"}
                  onCheckedChange={() => toggleActive(it)}
                />
              </div>
              <div className="col-span-1 text-right">
                <Button size="icon" variant="ghost" onClick={() => openEdit(it)}>
                  <Pencil className="h-4 w-4" />
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

function FxRateCell({
  currency,
  initial,
  effective,
  onSave,
}: {
  currency: string;
  initial: string;
  effective: number | null;
  onSave: (v: string) => void;
}) {
  const [val, setVal] = useState(initial);
  useEffect(() => setVal(initial), [initial]);
  return (
    <div className="flex items-center gap-1">
      <Input
        className="h-8 w-20 text-xs"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => val.trim() && onSave(val)}
        placeholder="Base"
      />
      {effective != null && effective > 0 && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap" title="Effective rate incl. buffer">
          → {effective.toFixed(2)}
        </span>
      )}
      {!val && currency !== "INR" && (
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onSave("1")}>
          Set
        </Button>
      )}
    </div>
  );
}
