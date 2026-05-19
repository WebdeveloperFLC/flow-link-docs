import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  master_key: string;
  sub_category: string | null;
  service_name: string;
  service_code: string | null;
  pricing_type: string;
  fee_inr: number | null;
  fee_cad: number | null;
  fee_gbp: number | null;
  max_fee_inr: number | null;
  country_tag: string | null;
  is_active: boolean;
  display_order: number;
  notes: string | null;
}

const MASTER_KEYS = [
  { key: "coaching_services", label: "Coaching" },
  { key: "visa_immigration", label: "Visa & Immigration" },
  { key: "admission_services", label: "Admissions" },
  { key: "allied_services", label: "Allied" },
  { key: "settlement_services", label: "Settlement" },
  { key: "travel_financial", label: "Travel & Financial" },
];

const PRICING_TYPES = ["FIXED", "PER_COUNTRY", "ON_REQUEST", "TIERED", "PERCENT"];

export function ServiceCatalogueSection() {
  const [rows, setRows] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterKey, setFilterKey] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_catalogue")
      .select("*")
      .order("master_key")
      .order("display_order");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Service[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterKey !== "all" && r.master_key !== filterKey) return false;
      if (!q) return true;
      return (
        r.service_name.toLowerCase().includes(q) ||
        (r.service_code ?? "").toLowerCase().includes(q) ||
        (r.sub_category ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filterKey, search]);

  const toggleActive = async (s: Service) => {
    const { error } = await supabase.from("service_catalogue").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  };
  const onDelete = async (s: Service) => {
    if (!confirm(`Delete service "${s.service_name}"?`)) return;
    const { error } = await supabase.from("service_catalogue").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const fmtPrice = (s: Service) => {
    if (s.pricing_type === "ON_REQUEST") return "On request";
    if (s.pricing_type === "PER_COUNTRY") return "Per country";
    if (s.fee_inr != null) return `₹${s.fee_inr.toLocaleString()}${s.max_fee_inr ? `–₹${s.max_fee_inr.toLocaleString()}` : ""}`;
    if (s.fee_cad != null) return `CA$${s.fee_cad.toLocaleString()}`;
    if (s.fee_gbp != null) return `£${s.fee_gbp.toLocaleString()}`;
    return "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Service Catalogue</h2>
          <p className="text-sm text-muted-foreground">All billable services across the 6 master groups. Used by lead and client forms.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> New service
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterKey} onValueChange={setFilterKey}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {MASTER_KEYS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services…" className="pl-8" />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {rows.length}</span>
      </div>

      <Card className="overflow-hidden shadow-elev-sm">
        <div className="grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
          <div className="col-span-3">Service</div>
          <div className="col-span-2">Group</div>
          <div className="col-span-2">Code</div>
          <div className="col-span-2">Pricing</div>
          <div className="col-span-1">Country</div>
          <div className="col-span-1">Active</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y max-h-[600px] overflow-auto">
          {loading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="px-4 py-12 text-center text-sm text-muted-foreground">No services match.</div>}
          {filtered.map((s) => (
            <div key={s.id} className="grid grid-cols-12 px-4 py-2.5 items-center text-sm">
              <div className="col-span-3">
                <div className="font-medium">{s.service_name}</div>
                {s.sub_category && <div className="text-[11px] text-muted-foreground">{s.sub_category}</div>}
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">{MASTER_KEYS.find(m => m.key === s.master_key)?.label ?? s.master_key}</div>
              <div className="col-span-2 font-mono text-[11px] text-muted-foreground">{s.service_code ?? "—"}</div>
              <div className="col-span-2 text-xs">{fmtPrice(s)}</div>
              <div className="col-span-1 text-xs text-muted-foreground">{s.country_tag ?? "—"}</div>
              <div className="col-span-1"><Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} /></div>
              <div className="col-span-1 text-right flex justify-end gap-1">
                <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => onDelete(s)}><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ServiceEditorDialog
        open={open}
        onOpenChange={setOpen}
        service={editing}
        nextOrder={(rows[rows.length - 1]?.display_order ?? 0) + 10}
        onSaved={load}
      />
    </div>
  );
}

function ServiceEditorDialog({ open, onOpenChange, service, nextOrder, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; service: Service | null; nextOrder: number; onSaved: () => void; }) {
  const [masterKey, setMasterKey] = useState("visa_immigration");
  const [subCategory, setSubCategory] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pricingType, setPricingType] = useState("FIXED");
  const [feeInr, setFeeInr] = useState<string>("");
  const [feeCad, setFeeCad] = useState<string>("");
  const [feeGbp, setFeeGbp] = useState<string>("");
  const [countryTag, setCountryTag] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMasterKey(service?.master_key ?? "visa_immigration");
      setSubCategory(service?.sub_category ?? "");
      setName(service?.service_name ?? "");
      setCode(service?.service_code ?? "");
      setPricingType(service?.pricing_type ?? "FIXED");
      setFeeInr(service?.fee_inr?.toString() ?? "");
      setFeeCad(service?.fee_cad?.toString() ?? "");
      setFeeGbp(service?.fee_gbp?.toString() ?? "");
      setCountryTag(service?.country_tag ?? "");
      setNotes(service?.notes ?? "");
    }
  }, [open, service]);

  const onSubmit = async () => {
    if (!name.trim()) return toast.error("Service name required");
    setBusy(true);
    try {
      const payload = {
        master_key: masterKey,
        sub_category: subCategory.trim() || null,
        service_name: name.trim(),
        service_code: code.trim() || null,
        pricing_type: pricingType,
        fee_inr: feeInr ? Number(feeInr) : null,
        fee_cad: feeCad ? Number(feeCad) : null,
        fee_gbp: feeGbp ? Number(feeGbp) : null,
        country_tag: countryTag.trim() || null,
        notes: notes.trim() || null,
      };
      if (service) {
        const { error } = await supabase.from("service_catalogue").update(payload).eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_catalogue").insert([{ ...payload, display_order: nextOrder, is_active: true }]);
        if (error) throw error;
      }
      toast.success(service ? "Updated" : "Added");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{service ? "Edit service" : "Add service"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Group *</Label>
              <Select value={masterKey} onValueChange={setMasterKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MASTER_KEYS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Sub-category</Label><Input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Service name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono text-xs" /></div>
            <div className="space-y-1.5">
              <Label>Pricing type</Label>
              <Select value={pricingType} onValueChange={setPricingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICING_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Fee INR</Label><Input type="number" value={feeInr} onChange={(e) => setFeeInr(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Fee CAD</Label><Input type="number" value={feeCad} onChange={(e) => setFeeCad(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Fee GBP</Label><Input type="number" value={feeGbp} onChange={(e) => setFeeGbp(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Country tag</Label><Input value={countryTag} onChange={(e) => setCountryTag(e.target.value)} placeholder="CA, UK, US…" /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy || !name.trim()} className="gradient-brand text-primary-foreground">{busy ? "Saving…" : service ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}