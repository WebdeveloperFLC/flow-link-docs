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

interface Designation {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

export function DesignationsSection() {
  const [rows, setRows] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("designations").select("*").order("display_order");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Designation[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (d: Designation) => {
    const { error } = await supabase.from("designations").update({ is_active: !d.is_active }).eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };

  const onDelete = async (d: Designation) => {
    if (!confirm(`Delete designation "${d.name}"?`)) return;
    const { error } = await supabase.from("designations").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Designations</h2>
          <p className="text-sm text-muted-foreground">
            Shared job titles for CRM Users and HR Payroll employee records. Maintain once — consumed everywhere.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> New designation
        </Button>
      </div>
      <Card className="overflow-hidden shadow-elev-sm">
        <div className="grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
          <div className="col-span-8">Name</div>
          <div className="col-span-2">Active</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y">
          {loading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && rows.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No designations yet.</div>
          )}
          {rows.map((d) => (
            <div key={d.id} className="grid grid-cols-12 px-4 py-2.5 items-center text-sm">
              <div className="col-span-8 font-medium">{d.name}</div>
              <div className="col-span-2">
                <Switch checked={d.is_active} onCheckedChange={() => toggleActive(d)} />
              </div>
              <div className="col-span-2 flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setOpen(true); }}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(d)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit designation" : "New designation"}</DialogTitle>
          </DialogHeader>
          <DesignationForm
            row={editing}
            onClose={() => setOpen(false)}
            onSaved={() => { setOpen(false); load(); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DesignationForm({
  row,
  onClose,
  onSaved,
}: {
  row: Designation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [order, setOrder] = useState(row?.display_order ?? 100);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    try {
      if (row) {
        const { error } = await supabase
          .from("designations")
          .update({ name: trimmed, display_order: order })
          .eq("id", row.id);
        if (error) throw error;
        toast.success("Designation updated");
      } else {
        const { error } = await supabase.from("designations").insert({ name: trimmed, display_order: order });
        if (error) throw error;
        toast.success("Designation added");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="space-y-3 py-2">
        <div>
          <Label htmlFor="desig_name">Name</Label>
          <Input id="desig_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div>
          <Label htmlFor="desig_order">Display order</Label>
          <Input
            id="desig_order"
            type="number"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={busy} onClick={() => void save()}>Save</Button>
      </DialogFooter>
    </>
  );
}
