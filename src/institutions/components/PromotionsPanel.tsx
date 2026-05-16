import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePromotions } from "../hooks/useInstitutionData";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DynamicFieldGroup } from "./DynamicFieldGroup";
import { Send, Trash2 } from "lucide-react";
import { ALLOW_TEST_DELETIONS } from "../config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function PromotionsPanel({
  institutionId,
  onRunCampaign,
}: {
  institutionId: string;
  onRunCampaign?: (promo: { id: string; title: string }) => void;
}) {
  const { data: promos, loading, reload } = usePromotions(institutionId) as any;
  const [edit, setEdit] = useState<any | null>(null);

  const deletePromo = async (p: any) => {
    if (!confirm(`Delete promotion "${p.title}"?`)) return;
    const { error } = await supabase.from("upi_promotions").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Promotion deleted");
    reload?.();
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading promotions…</div>;
  if (promos.length === 0)
    return <Card className="p-8 text-center text-sm text-muted-foreground">No promotions yet. Upload a brochure to auto-detect.</Card>;

  return (
    <div className="space-y-2">
      {promos.map((p: any) => (
        <Card key={p.id} className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{p.title}</span>
                <Badge variant="outline">{p.promo_type}</Badge>
                <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                {p.auto_detected && <Badge variant="secondary">AI detected</Badge>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {(p.valid_from ?? "?")} → {(p.valid_to ?? "?")} · Countries: {(p.target_countries ?? []).join(", ") || "—"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEdit(p)}>Edit</Button>
              {onRunCampaign && (
                <Button size="sm" onClick={() => onRunCampaign({ id: p.id, title: p.title })}>
                  <Send className="size-4 mr-1" /> Run campaign
                </Button>
              )}
              {ALLOW_TEST_DELETIONS && (
                <Button size="sm" variant="ghost" onClick={() => deletePromo(p)} className="text-destructive hover:text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.title ?? "Promotion"}</DialogTitle></DialogHeader>
          {edit && (
            <DynamicFieldGroup scope="promotion" values={edit} onChange={(v) => setEdit({ ...edit, ...v })} readOnly />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}