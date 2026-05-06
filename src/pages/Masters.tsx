import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Database, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { refreshMaster, type MasterListKey, type MasterItem } from "@/lib/masters";
import { logActivity } from "@/lib/activity";
import { cn } from "@/lib/utils";

interface MasterList { key: string; label: string; description: string | null; }

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

const singularize = (label: string) => {
  const trimmed = label.trim();
  if (/ies$/i.test(trimmed)) return trimmed.replace(/ies$/i, "y");
  if (/uses$/i.test(trimmed)) return trimmed.replace(/uses$/i, "us");
  if (/sses$/i.test(trimmed)) return trimmed.replace(/es$/i, "");
  if (/s$/i.test(trimmed)) return trimmed.replace(/s$/i, "");
  return trimmed;
};

const Masters = () => {
  const { isAdmin } = useAuth();
  const [lists, setLists] = useState<MasterList[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [open, setOpen] = useState(false);

  const loadLists = async () => {
    const { data } = await supabase.from("master_lists").select("*").order("label");
    const ls = (data ?? []) as MasterList[];
    setLists(ls);
    if (!activeKey && ls.length) setActiveKey(ls[0].key);
  };

  const loadItems = async (key: string) => {
    if (!key) return;
    setLoading(true);
    const { data } = await supabase
      .from("master_items")
      .select("*")
      .eq("list_key", key)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    setItems(((data ?? []) as MasterItem[]));
    setLoading(false);
  };

  useEffect(() => { loadLists(); }, []);
  useEffect(() => { if (activeKey) loadItems(activeKey); }, [activeKey]);

  const activeList = lists.find((l) => l.key === activeKey);

  const onToggleActive = async (it: MasterItem) => {
    const { error } = await supabase.from("master_items")
      .update({ is_active: !it.is_active }).eq("id", it.id);
    if (error) { toast.error(error.message); return; }
    await refreshMaster(activeKey as MasterListKey);
    loadItems(activeKey);
  };

  const onDelete = async (it: MasterItem) => {
    if (!confirm(`Delete "${it.label}"? Existing records using this value will keep showing it but it won't appear in dropdowns.`)) return;
    const { error } = await supabase.from("master_items").delete().eq("id", it.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("master.deleted", "master", it.id, { list: activeKey, label: it.label });
    await refreshMaster(activeKey as MasterListKey);
    toast.success("Deleted");
    loadItems(activeKey);
  };

  const onMove = async (it: MasterItem, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === it.id);
    const swap = items[idx + dir];
    if (!swap) return;
    await supabase.from("master_items").update({ sort_order: swap.sort_order }).eq("id", it.id);
    await supabase.from("master_items").update({ sort_order: it.sort_order }).eq("id", swap.id);
    await refreshMaster(activeKey as MasterListKey);
    loadItems(activeKey);
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <PageHeader title="Masters" description="Admin only." />
        <div className="p-8"><Card className="p-12 text-center text-sm text-muted-foreground">Only administrators can manage master data.</Card></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Masters"
        description="Centrally manage all dropdown values used across the app — countries, visa categories, document types, and more."
        actions={
          activeList && (
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-primary-foreground">
              <Plus className="size-4 mr-1.5" /> New {singularize(activeList.label).toLowerCase()}
            </Button>
          )
        }
      />
      <div className="p-8 grid grid-cols-12 gap-6">
        <Card className="col-span-3 p-2 h-fit">
          <div className="px-3 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Lists</div>
          <div className="space-y-0.5">
            {lists.map((l) => (
              <button
                key={l.key}
                onClick={() => setActiveKey(l.key)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                  activeKey === l.key ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50"
                )}
              >
                <Database className="size-3.5 text-muted-foreground" />
                {l.label}
              </button>
            ))}
          </div>
        </Card>

        <div className="col-span-9 space-y-4">
          {activeList && (
            <div>
              <h2 className="text-lg font-semibold">{activeList.label}</h2>
              {activeList.description && <p className="text-sm text-muted-foreground">{activeList.description}</p>}
            </div>
          )}
          <Card className="overflow-hidden shadow-elev-sm">
            <div className="grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
              <div className="col-span-1">Order</div>
              <div className="col-span-4">Label</div>
              <div className="col-span-3">Code</div>
              <div className="col-span-2">Active</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y">
              {loading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>}
              {!loading && items.length === 0 && <div className="px-4 py-12 text-center text-sm text-muted-foreground">No items yet.</div>}
              {items.map((it, i) => (
                <div key={it.id} className="grid grid-cols-12 px-4 py-2.5 items-center text-sm">
                  <div className="col-span-1 flex gap-0.5">
                    <Button size="icon" variant="ghost" className="size-6" disabled={i === 0} onClick={() => onMove(it, -1)}><ArrowUp className="size-3" /></Button>
                    <Button size="icon" variant="ghost" className="size-6" disabled={i === items.length - 1} onClick={() => onMove(it, 1)}><ArrowDown className="size-3" /></Button>
                  </div>
                  <div className="col-span-4 font-medium">{it.label}</div>
                  <div className="col-span-3 font-mono text-xs text-muted-foreground">{it.code}</div>
                  <div className="col-span-2"><Switch checked={it.is_active} onCheckedChange={() => onToggleActive(it)} /></div>
                  <div className="col-span-2 text-right flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditing(it); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => onDelete(it)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ItemEditorDialog
        open={open}
        onOpenChange={setOpen}
        listKey={activeKey}
        item={editing}
        existingCodes={items.map((i) => i.code)}
        nextSortOrder={(items[items.length - 1]?.sort_order ?? 0) + 10}
        onSaved={() => { refreshMaster(activeKey as MasterListKey); loadItems(activeKey); }}
      />
    </AppLayout>
  );
};

function ItemEditorDialog({
  open, onOpenChange, listKey, item, existingCodes, nextSortOrder, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  listKey: string;
  item: MasterItem | null;
  existingCodes: string[];
  nextSortOrder: number;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [metadata, setMetadata] = useState("{}");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(item?.label ?? "");
      setCode(item?.code ?? "");
      setCodeTouched(!!item);
      setMetadata(JSON.stringify(item?.metadata ?? {}, null, 2));
    }
  }, [open, item]);

  useEffect(() => {
    if (!codeTouched && !item) setCode(slugify(label));
  }, [label, codeTouched, item]);

  const codeConflict = useMemo(() => {
    if (!code) return false;
    if (item && item.code === code) return false;
    return existingCodes.includes(code);
  }, [code, existingCodes, item]);

  const onSubmit = async () => {
    if (!label.trim() || !code.trim()) { toast.error("Label and code are required"); return; }
    if (codeConflict) { toast.error("Code already used in this list"); return; }
    let parsedMeta: Record<string, unknown> = {};
    try { parsedMeta = JSON.parse(metadata || "{}"); }
    catch { toast.error("Metadata must be valid JSON"); return; }
    setBusy(true);
    try {
      if (item) {
        const { error } = await supabase.from("master_items").update({
          label: label.trim(), code: code.trim(), metadata: parsedMeta as never,
        }).eq("id", item.id);
        if (error) throw error;
        await logActivity("master.updated", "master", item.id, { list: listKey, label });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("master_items").insert([{
          list_key: listKey, label: label.trim(), code: code.trim(),
          metadata: parsedMeta as never, sort_order: nextSortOrder,
          created_by: user?.id ?? null,
        }]).select().single();
        if (error) throw error;
        await logActivity("master.created", "master", data.id, { list: listKey, label });
      }
      toast.success(item ? "Updated" : "Added");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit value" : "Add value"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Label *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. South Korea" autoFocus />
            <p className="text-[11px] text-muted-foreground">Shown to users in dropdowns.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeTouched(true); }}
              placeholder="e.g. south_korea"
              className={codeConflict ? "border-destructive" : ""}
            />
            <p className="text-[11px] text-muted-foreground">
              {codeConflict ? "Already used in this list." : "Stable identifier — auto-generated from the label."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Metadata (JSON, optional)</Label>
            <Textarea
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder='{"icon": "flag-ca"}'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy || codeConflict || !label.trim() || !code.trim()} className="gradient-brand text-primary-foreground">
            {busy ? "Saving…" : item ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Masters;