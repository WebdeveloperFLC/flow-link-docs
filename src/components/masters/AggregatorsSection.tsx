import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { UpiAggregator } from "@/institutions/types/partnership";

const emptyForm = (): Partial<UpiAggregator> => ({
  name: "",
  short_code: "",
  is_active: true,
  countries_served: [],
  website_url: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  default_portal_url: "",
  default_payment_terms: "",
  default_currency: "CAD",
  notes: "",
});

export function AggregatorsSection() {
  const [rows, setRows] = useState<UpiAggregator[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<UpiAggregator>>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("upi_aggregators")
      .select("*")
      .order("name");
    if (error) toast.error(error.message);
    setRows((data ?? []) as UpiAggregator[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyForm());
    setOpen(true);
  };

  const openEdit = (row: UpiAggregator) => {
    setEditingId(row.id);
    setDraft({ ...row, countries_served: row.countries_served ?? [] });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name?.trim()) return toast.error("Name is required");
    const countries = String((draft as { countries_text?: string }).countries_text ?? "")
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      name: draft.name.trim(),
      short_code: draft.short_code?.trim() || null,
      is_active: draft.is_active ?? true,
      countries_served: countries.length ? countries : draft.countries_served ?? [],
      website_url: draft.website_url?.trim() || null,
      contact_name: draft.contact_name?.trim() || null,
      contact_email: draft.contact_email?.trim() || null,
      contact_phone: draft.contact_phone?.trim() || null,
      default_portal_url: draft.default_portal_url?.trim() || null,
      default_payment_terms: draft.default_payment_terms?.trim() || null,
      default_currency: draft.default_currency?.trim() || "CAD",
      notes: draft.notes?.trim() || null,
    };

    const { error } = editingId
      ? await supabase.from("upi_aggregators").update(payload).eq("id", editingId)
      : await supabase.from("upi_aggregators").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Aggregator updated" : "Aggregator created");
    setOpen(false);
    load();
  };

  const remove = async (row: UpiAggregator) => {
    if (!confirm(`Delete aggregator "${row.name}"?`)) return;
    const { error } = await supabase.from("upi_aggregators").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const toggleActive = async (row: UpiAggregator) => {
    const { error } = await supabase
      .from("upi_aggregators")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Aggregators</h2>
          <p className="text-sm text-muted-foreground">
            Master list of indirect partners (ApplyBoard, Navitas, etc.) used on institution partnership routes.
          </p>
        </div>
        <Button onClick={openNew} className="gradient-brand text-primary-foreground shrink-0">
          <Plus className="size-4 mr-1.5" /> New aggregator
        </Button>
      </div>

      <Card className="overflow-hidden shadow-elev-sm">
        <div className="grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Code</div>
          <div className="col-span-3">Countries</div>
          <div className="col-span-2">Contact</div>
          <div className="col-span-1">Active</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y">
          {loading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && rows.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No aggregators yet.</div>
          )}
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-12 px-4 py-2.5 items-center text-sm gap-2">
              <div className="col-span-3 font-medium truncate">{row.name}</div>
              <div className="col-span-2 text-muted-foreground truncate">{row.short_code ?? "—"}</div>
              <div className="col-span-3 text-muted-foreground truncate">
                {(row.countries_served ?? []).join(", ") || "—"}
              </div>
              <div className="col-span-2 text-muted-foreground truncate">{row.contact_email ?? "—"}</div>
              <div className="col-span-1">
                <Switch checked={row.is_active} onCheckedChange={() => toggleActive(row)} />
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(row)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit aggregator" : "New aggregator"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Short code</Label>
                <Input
                  value={draft.short_code ?? ""}
                  onChange={(e) => setDraft({ ...draft, short_code: e.target.value })}
                  placeholder="APPLYBOARD"
                />
              </div>
              <div className="space-y-1">
                <Label>Default currency</Label>
                <Input
                  value={draft.default_currency ?? "CAD"}
                  onChange={(e) => setDraft({ ...draft, default_currency: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Countries served (comma-separated)</Label>
              <Input
                defaultValue={(draft.countries_served ?? []).join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    countries_text: e.target.value,
                  } as Partial<UpiAggregator> & { countries_text?: string })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Portal URL</Label>
              <Input
                value={draft.default_portal_url ?? ""}
                onChange={(e) => setDraft({ ...draft, default_portal_url: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Contact name</Label>
                <Input
                  value={draft.contact_name ?? ""}
                  onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Contact email</Label>
                <Input
                  value={draft.contact_email ?? ""}
                  onChange={(e) => setDraft({ ...draft, contact_email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Payment terms</Label>
              <Input
                value={draft.default_payment_terms ?? ""}
                onChange={(e) => setDraft({ ...draft, default_payment_terms: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.is_active ?? true}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
