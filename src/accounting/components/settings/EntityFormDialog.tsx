import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { SettingsEntity, EntityType } from "../../types/settings";
import { useEntities } from "../../stores/accountingEntitiesStore";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: SettingsEntity | null;
  onSubmit: (data: Omit<SettingsEntity, "id">) => void;
}

const TYPES: EntityType[] = ["COMPANY", "BRANCH", "SUB_BRANCH", "BRAND", "PERSONAL"];

export default function EntityFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const all = useEntities();
  const [name, setName] = useState("");
  const [type, setType] = useState<EntityType>("COMPANY");
  const [parentId, setParentId] = useState<string>("__none__");
  const [country, setCountry] = useState("CA");
  const [currency, setCurrency] = useState("CAD");
  const [fiscalYearStart, setFiscalYearStart] = useState("04-01");
  const [taxIds, setTaxIds] = useState<{ label: string; value: string }[]>([]);
  const [tIdLabel, setTIdLabel] = useState("");
  const [tIdValue, setTIdValue] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name); setType(initial.type);
      setParentId(initial.parentId ?? "__none__");
      setCountry(initial.country); setCurrency(initial.currency);
      setFiscalYearStart(initial.fiscalYearStart);
      setTaxIds(initial.taxIds ?? []);
    } else {
      setName(""); setType("COMPANY"); setParentId("__none__");
      setCountry("CA"); setCurrency("CAD"); setFiscalYearStart("04-01");
      setTaxIds([]);
    }
    setTIdLabel(""); setTIdValue("");
  }, [open, initial]);

  const addTaxId = () => {
    if (!tIdLabel.trim() || !tIdValue.trim()) return;
    setTaxIds((prev) => [...prev, { label: tIdLabel.trim(), value: tIdValue.trim() }]);
    setTIdLabel(""); setTIdValue("");
  };

  const submit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    onSubmit({
      name: name.trim(), type,
      parentId: parentId === "__none__" ? null : parentId,
      country, currency, fiscalYearStart, taxIds,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit entity" : "Add entity"}</DialogTitle>
          <DialogDescription>Companies, branches, sub-branches, and brands. Add as many tax IDs as needed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>Entity name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Future Link UK Ltd" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as EntityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Parent</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None (top-level) —</SelectItem>
                  {all.filter((e) => e.id !== initial?.id).map((e) =>
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CA","US","IN","GB","DE","AE","AU","SG","CZ","FR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CAD","USD","INR","GBP","EUR","AED","AUD","SGD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Fiscal year start (MM-DD)</Label>
              <Input value={fiscalYearStart} onChange={(e) => setFiscalYearStart(e.target.value)} placeholder="04-01" />
            </div>
          </div>
          <div className="grid gap-2 border-t pt-3">
            <Label>Tax IDs</Label>
            <div className="flex flex-wrap gap-1.5">
              {taxIds.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md bg-muted">
                  <span className="font-medium">{t.label}:</span>
                  <span className="font-mono">{t.value}</span>
                  <button onClick={() => setTaxIds((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {taxIds.length === 0 && <span className="text-[12px] text-muted-foreground">No tax IDs added.</span>}
            </div>
            <div className="grid grid-cols-[140px_1fr_auto] gap-2 mt-2">
              <Input value={tIdLabel} onChange={(e) => setTIdLabel(e.target.value)} placeholder="Label (GST/PAN)" />
              <Input value={tIdValue} onChange={(e) => setTIdValue(e.target.value)} placeholder="Value"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTaxId(); } }} />
              <Button type="button" variant="outline" onClick={addTaxId}><Plus className="size-4" /></Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{initial ? "Save changes" : "Add entity"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}