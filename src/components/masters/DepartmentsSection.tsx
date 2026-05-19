import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  handles_services: string[];
  is_active: boolean;
  display_order: number;
}

const SERVICE_KEYS = [
  { key: "visa_immigration", label: "Visa & Immigration" },
  { key: "coaching_services", label: "Coaching" },
  { key: "admission_services", label: "Admissions" },
  { key: "allied_services", label: "Allied" },
  { key: "settlement_services", label: "Settlement" },
  { key: "travel_financial", label: "Travel & Financial" },
];

export function DepartmentsSection() {
  const [rows, setRows] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("departments").select("*").order("display_order");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Department[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (d: Department) => {
    const { error } = await supabase.from("departments").update({ is_active: !d.is_active }).eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };
  const onDelete = async (d: Department) => {
    if (!confirm(`Delete department "${d.name}"?`)) return;
    const { error } = await supabase.from("departments").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Departments</h2>
          <p className="text-sm text-muted-foreground">Internal departments and the service groups they handle.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> New department
        </Button>
      </div>
      <Card className="overflow-hidden shadow-elev-sm">
        <div className="grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
          <div className="col-span-4">Name</div>
          <div className="col-span-6">Handles services</div>
          <div className="col-span-1">Active</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y">
          {loading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && rows.length === 0 && <div className="px-4 py-12 text-center text-sm text-muted-foreground">No departments yet.</div>}
          {rows.map((d) => (
            <div key={d.id} className="grid grid-cols-12 px-4 py-2.5 items-center text-sm">
              <div className="col-span-4 font-medium">{d.name}</div>
              <div className="col-span-6 flex flex-wrap gap-1">
                {d.handles_services?.filter(Boolean).length ? d.handles_services.filter(Boolean).map((k) => (
                  <span key={k} className="text-[11px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{SERVICE_KEYS.find(s => s.key === k)?.label ?? k}</span>
                )) : <span className="text-muted-foreground text-xs">—</span>}
              </div>
              <div className="col-span-1"><Switch checked={d.is_active} onCheckedChange={() => toggleActive(d)} /></div>
              <div className="col-span-1 text-right flex justify-end gap-1">
                <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditing(d); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => onDelete(d)}><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <DeptEditorDialog open={open} onOpenChange={setOpen} dept={editing} nextOrder={(rows[rows.length - 1]?.display_order ?? 0) + 10} onSaved={load} />
    </div>
  );
}

function DeptEditorDialog({ open, onOpenChange, dept, nextOrder, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; dept: Department | null; nextOrder: number; onSaved: () => void; }) {
  const [name, setName] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(dept?.name ?? "");
      setServices((dept?.handles_services ?? []).filter(Boolean));
    }
  }, [open, dept]);

  const toggle = (k: string) => setServices((s) => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);

  const onSubmit = async () => {
    if (!name.trim()) return toast.error("Name required");
    setBusy(true);
    try {
      if (dept) {
        const { error } = await supabase.from("departments").update({ name: name.trim(), handles_services: services }).eq("id", dept.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments").insert([{ name: name.trim(), handles_services: services, display_order: nextOrder }]);
        if (error) throw error;
      }
      toast.success(dept ? "Updated" : "Added");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{dept ? "Edit department" : "Add department"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="space-y-1.5">
            <Label>Handles which service groups</Label>
            <div className="space-y-1.5 border rounded-md p-3">
              {SERVICE_KEYS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={services.includes(s.key)} onCheckedChange={() => toggle(s.key)} />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy || !name.trim()} className="gradient-brand text-primary-foreground">{busy ? "Saving…" : dept ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}