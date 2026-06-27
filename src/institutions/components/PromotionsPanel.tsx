import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePromotions } from "../hooks/useInstitutionData";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DynamicFieldGroup } from "./DynamicFieldGroup";
import { Archive, Copy, Plus, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PROMOTIONS_EMPTY_MESSAGE } from "../lib/promotionsConstants";

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string" && v.trim()) {
    return v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function toEditForm(p: Record<string, unknown> | null, institutionId: string) {
  const meta = (p?.metadata ?? {}) as Record<string, unknown>;
  return {
    institution_id: institutionId,
    title: String(p?.title ?? ""),
    promo_type: String(p?.promo_type ?? "general"),
    valid_from: p?.valid_from ?? "",
    valid_to: p?.valid_to ?? "",
    target_countries: asStringArray(p?.target_countries),
    target_disciplines_csv: asStringArray(p?.target_disciplines).join(", "),
    description: String(p?.description ?? ""),
    is_active: p?.is_active !== false,
    source_type: String(meta.source_type ?? "manual"),
    official_url: String(meta.official_url ?? ""),
  };
}

function fromEditForm(form: Record<string, unknown>, existing?: Record<string, unknown> | null) {
  const prevMeta = (existing?.metadata ?? {}) as Record<string, unknown>;
  const disciplines = asStringArray(form.target_disciplines_csv);
  return {
    title: String(form.title ?? "").trim(),
    promo_type: String(form.promo_type ?? "general"),
    valid_from: form.valid_from || null,
    valid_to: form.valid_to || null,
    target_countries: asStringArray(form.target_countries),
    target_disciplines: disciplines,
    description: String(form.description ?? "").trim() || null,
    is_active: form.is_active !== false,
    auto_detected: false,
    detection_source: `manual:${String(form.source_type ?? "manual")}`,
    metadata: {
      ...prevMeta,
      source_type: String(form.source_type ?? "manual"),
      official_url: String(form.official_url ?? "").trim() || null,
    },
  };
}

export function PromotionsPanel({
  institutionId,
  onRunCampaign,
  readOnly = false,
}: {
  institutionId: string;
  onRunCampaign?: (promo: { id: string; title: string }) => void;
  readOnly?: boolean;
}) {
  const { data: promos, loading, reload } = usePromotions(institutionId) as any;
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditId(null);
    setEdit(toEditForm(null, institutionId));
  };

  const openEdit = (p: Record<string, unknown>) => {
    setEditId(String(p.id));
    setEdit(toEditForm(p, institutionId));
  };

  const savePromo = async () => {
    if (!edit) return;
    if (!String(edit.title ?? "").trim()) return toast.error("Title is required");
    setSaving(true);
    const payload = fromEditForm(edit, editId ? promos.find((p: any) => p.id === editId) : null);
    try {
      if (editId) {
        const { error } = await supabase.from("upi_promotions").update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("Promotion updated");
      } else {
        const { error } = await supabase.from("upi_promotions").insert({
          ...payload,
          institution_id: institutionId,
        });
        if (error) throw error;
        toast.success("Promotion created");
      }
      setEdit(null);
      setEditId(null);
      reload?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deletePromo = async (p: { id: string; title: string }) => {
    if (!confirm(`Delete promotion "${p.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("upi_promotions").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Promotion deleted");
    reload?.();
  };

  const duplicatePromo = async (p: Record<string, unknown>) => {
    const payload = fromEditForm(toEditForm(p, institutionId), p);
    const { error } = await supabase.from("upi_promotions").insert({
      ...payload,
      institution_id: institutionId,
      title: `${payload.title} (copy)`,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Promotion duplicated");
    reload?.();
  };

  const archivePromo = async (p: { id: string; title: string }) => {
    const { error } = await supabase.from("upi_promotions").update({ is_active: false }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`"${p.title}" archived`);
    reload?.();
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading promotions…</div>;

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="size-4 mr-1" /> Create promotion
          </Button>
        </div>
      )}

      {promos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">{PROMOTIONS_EMPTY_MESSAGE}</Card>
      ) : (
        <div className="space-y-2">
          {promos.map((p: any) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.title}</span>
                    <Badge variant="outline">{p.promo_type}</Badge>
                    <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Archived"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(p.valid_from ?? "—")} → {(p.valid_to ?? "—")} · Countries: {(p.target_countries ?? []).join(", ") || "—"}
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => duplicatePromo(p)}>
                      <Copy className="size-4 mr-1" /> Duplicate
                    </Button>
                    {p.is_active !== false && (
                      <Button size="sm" variant="outline" onClick={() => archivePromo(p)}>
                        <Archive className="size-4 mr-1" /> Archive
                      </Button>
                    )}
                    {onRunCampaign && p.is_active !== false && (
                      <Button size="sm" onClick={() => onRunCampaign({ id: p.id, title: p.title })}>
                        <Send className="size-4 mr-1" /> Run campaign
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePromo(p)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(v) => { if (!v) { setEdit(null); setEditId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit promotion" : "Create promotion"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <DynamicFieldGroup
              scope="promotion"
              values={edit}
              onChange={(v) => setEdit({ ...edit, ...v })}
              readOnly={readOnly}
            />
          )}
          {!readOnly && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEdit(null); setEditId(null); }} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={savePromo} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
