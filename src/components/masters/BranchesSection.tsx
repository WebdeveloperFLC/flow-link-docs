import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Branch {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  is_virtual: boolean;
  is_active: boolean;
  display_order: number;
}

export function BranchesSection() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("branches").select("*").order("display_order");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Branch[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (b: Branch) => {
    const { error } = await supabase.from("branches").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };
  const onDelete = async (b: Branch) => {
    if (!confirm(`Delete branch "${b.name}"?`)) return;
    const { error } = await supabase.from("branches").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Branches</h2>
          <p className="text-sm text-muted-foreground">Physical and virtual office locations.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> New branch
        </Button>
      </div>
      <Card className="overflow-hidden shadow-elev-sm">
        <div className="grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
          <div className="col-span-4">Name</div>
          <div className="col-span-3">City</div>
          <div className="col-span-2">Country</div>
          <div className="col-span-1">Virtual</div>
          <div className="col-span-1">Active</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y">
          {loading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && rows.length === 0 && <div className="px-4 py-12 text-center text-sm text-muted-foreground">No branches yet.</div>}
          {rows.map((b) => (
            <div key={b.id} className="grid grid-cols-12 px-4 py-2.5 items-center text-sm">
              <div className="col-span-4 font-medium">{b.name}</div>
              <div className="col-span-3 text-muted-foreground">{b.city ?? "—"}</div>
              <div className="col-span-2 text-muted-foreground">{b.country ?? "—"}</div>
              <div className="col-span-1">{b.is_virtual ? <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">Virtual</span> : "—"}</div>
              <div className="col-span-1"><Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} /></div>
              <div className="col-span-1 text-right flex justify-end gap-1">
                <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => onDelete(b)}><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <BranchEditorDialog open={open} onOpenChange={setOpen} branch={editing} nextOrder={(rows[rows.length - 1]?.display_order ?? 0) + 10} onSaved={load} />
    </div>
  );
}

function BranchEditorDialog({ open, onOpenChange, branch, nextOrder, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; branch: Branch | null; nextOrder: number; onSaved: () => void; }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("IN");
  const [isVirtual, setIsVirtual] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(branch?.name ?? "");
      setCity(branch?.city ?? "");
      setCountry(branch?.country ?? "IN");
      setIsVirtual(branch?.is_virtual ?? false);
    }
  }, [open, branch]);

  const onSubmit = async () => {
    if (!name.trim()) return toast.error("Name required");
    setBusy(true);
    try {
      if (branch) {
        const { error } = await supabase.from("branches").update({ name: name.trim(), city: city.trim() || null, country: country.trim() || null, is_virtual: isVirtual }).eq("id", branch.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("branches").insert([{ name: name.trim(), city: city.trim() || null, country: country.trim() || null, is_virtual: isVirtual, display_order: nextOrder }]);
        if (error) throw error;
      }
      toast.success(branch ? "Updated" : "Added");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{branch ? "Edit branch" : "Add branch"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Country code</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="IN, CA, UK..." /></div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={isVirtual} onCheckedChange={setIsVirtual} />
            <Label>Virtual branch (remote / non-physical)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy || !name.trim()} className="gradient-brand text-primary-foreground">{busy ? "Saving…" : branch ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}