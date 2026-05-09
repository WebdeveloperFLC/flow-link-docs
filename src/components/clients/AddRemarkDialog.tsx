import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { appendTimeline } from "@/lib/timeline";
import type { LeadStatus } from "@/lib/telecallerQueue";
import { Plus } from "lucide-react";

interface Preset { id: string; label: string; category: string; }

export function AddRemarkDialog({ open, onOpenChange, clientId, queueItemId, callSessionId, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  queueItemId?: string | null;
  callSessionId?: string | null;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState<string>("");
  const [newPreset, setNewPreset] = useState("");
  const [addingPreset, setAddingPreset] = useState(false);
  const [outcome, setOutcome] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [leadStatus, setLeadStatus] = useState<LeadStatus | "">("");
  const [callbackAt, setCallbackAt] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPresets = () =>
    supabase.from("remark_presets").select("id,label,category").eq("active", true).order("sort_order").then(({ data }) => setPresets(data ?? []));
  useEffect(() => { if (open) loadPresets(); }, [open]);

  const addPreset = async () => {
    const label = newPreset.trim();
    if (!label) return;
    setAddingPreset(true);
    try {
      const { data, error } = await supabase.from("remark_presets")
        .insert({ label, category: "custom", sort_order: 999 })
        .select("id,label,category").single();
      if (error) throw error;
      setPresets((p) => [...p, data as Preset]);
      setPresetId(data.id);
      setNewPreset("");
      toast.success("Preset added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add preset");
    } finally { setAddingPreset(false); }
  };

  const submit = async () => {
    if (!user) return;
    if (!remark.trim() && !presetId) { toast.error("Pick a preset or write a remark"); return; }
    setBusy(true);
    try {
      const presetLabel = presets.find((p) => p.id === presetId)?.label;
      const finalRemark = [presetLabel, remark.trim()].filter(Boolean).join(" — ");
      const { error } = await supabase.from("lead_remarks").insert({
        client_id: clientId,
        queue_item_id: queueItemId ?? null,
        call_session_id: callSessionId ?? null,
        author_id: user.id,
        outcome: outcome || null,
        remark: finalRemark,
        lead_status: leadStatus || null,
        next_callback_at: callbackAt || null,
      });
      if (error) throw error;
      await appendTimeline({
        clientId, eventType: "remark",
        summary: finalRemark.slice(0, 140),
        metadata: { outcome, leadStatus, callbackAt, presetId },
      });
      if (queueItemId) {
        const patch: Record<string, unknown> = {};
        if (leadStatus) patch.lead_status = leadStatus;
        if (callbackAt) { patch.status = "callback"; patch.next_call_at = callbackAt; }
        if (Object.keys(patch).length) await supabase.from("call_queue_items").update(patch as never).eq("id", queueItemId);
      }
      toast.success("Remark saved");
      onOpenChange(false);
      setRemark(""); setPresetId(""); setOutcome(""); setLeadStatus(""); setCallbackAt("");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add remark</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Predefined remark</Label>
            <Select value={presetId} onValueChange={setPresetId}>
              <SelectTrigger><SelectValue placeholder="Pick from list (searchable)" /></SelectTrigger>
              <SelectContent>
                {presets.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 pt-1">
              <Input value={newPreset} onChange={(e) => setNewPreset(e.target.value)} placeholder="Add new option (e.g. Wants scholarship info)" className="h-8" />
              <Button type="button" size="sm" variant="outline" onClick={addPreset} disabled={addingPreset || !newPreset.trim()}>
                <Plus className="size-3.5 mr-1" />Add
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Custom remark</Label>
            <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} placeholder="Add details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lead status</Label>
              <Select value={leadStatus} onValueChange={(v) => setLeadStatus(v as LeadStatus)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="not_interested">Not interested</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="no_answer">No answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="wrong_number">Wrong number</SelectItem>
                  <SelectItem value="callback">Callback</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Callback date & time (optional)</Label>
            <Input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Save remark</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}