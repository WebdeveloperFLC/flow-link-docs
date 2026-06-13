import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { toast } from "sonner";
import { Plus, RefreshCw, Users } from "lucide-react";

interface SegmentRow {
  id: string;
  name: string;
  description: string | null;
  definition: string | null;
  is_active: boolean;
  member_count: number;
  linked_offers: number;
}

export default function PerformanceOffersSegments() {
  const { loading, hasRole } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator"]);
  const canManage = canEdit || hasRole(["manager", "admin", "administrator"]);
  const [rows, setRows] = useState<SegmentRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("fn_offer_segments_summary");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as SegmentRow[]);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function createSegment() {
    if (!canManage || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("offer_groups").insert({
      name: name.trim(),
      description: description.trim() || null,
      definition: definition.trim() || null,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Segment saved — available in offer wizard audience picker");
    setName("");
    setDefinition("");
    setDescription("");
    load();
  }

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <PerformanceHubHeader
        title="Segment library"
        subtitle="Reusable audiences for offers, campaigns, and auto-rules"
      />
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <OffersStudioNav />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            <RefreshCw className={busy ? "size-4 mr-1 animate-spin" : "size-4 mr-1"} />
            Refresh
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  {!s.is_active && (
                    <Badge variant="secondary" className="mt-1">
                      inactive
                    </Badge>
                  )}
                </div>
                <Users className="size-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{s.definition || s.description || "—"}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline">{s.member_count.toLocaleString()} members</Badge>
                <Badge variant="outline">{s.linked_offers} linked offers</Badge>
              </div>
            </Card>
          ))}
        </div>

        {rows.length === 0 && !busy && (
          <Card className="p-6 text-center text-muted-foreground text-sm">No segments yet. Create one below.</Card>
        )}

        {canManage && (
          <Card className="p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Plus className="size-4" />
              Create segment
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gen-Z hot leads" />
              </div>
              <div className="space-y-1">
                <Label>Short description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional internal note"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Definition</Label>
              <Textarea
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Lifecycle · service · behaviour · geo"
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Add members via Offers admin or import — segment appears in the offer wizard group audience picker.
            </p>
            <Button onClick={createSegment} disabled={saving || !name.trim()}>
              Save segment
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
