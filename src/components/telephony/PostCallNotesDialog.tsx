import { useEffect, useMemo, useState } from "react";
import { useCall } from "@/contexts/CallContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { appendTimeline } from "@/lib/timeline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus, MessageSquarePlus } from "lucide-react";
import type { LeadStatus } from "@/lib/telecallerQueue";

interface Preset { id: string; label: string; category: string; }

interface PinnedCall {
  sessionId: string;
  clientId: string;
  /** "live" while the call is still in progress, "ended" after disconnect */
  phase: "live" | "ended";
}

/**
 * Floating call-notes panel.
 * - Pops up the moment a call is answered (connected).
 * - Can be minimized to a small bar so the user keeps talking.
 * - Re-opens (un-minimized) automatically when the call disconnects so
 *   the disposition / notes can be saved before moving on.
 * - Predefined-remark "add new option" is admin-only.
 */
export function PostCallNotesDialog() {
  const { user, isAdmin } = useAuth();
  const { currentCall, lastCompletedCall, clearLastCompletedCall } = useCall();

  const [pinned, setPinned] = useState<PinnedCall | null>(null);
  const [minimized, setMinimized] = useState(false);

  // Form state (resets per pinned call).
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState<string>("");
  const [newPreset, setNewPreset] = useState("");
  const [addingPreset, setAddingPreset] = useState(false);
  const [outcome, setOutcome] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [leadStatus, setLeadStatus] = useState<LeadStatus | "">("");
  const [callbackAt, setCallbackAt] = useState("");
  const [busy, setBusy] = useState(false);

  // Pin the call as soon as it's live so notes can be taken mid-call.
  // We open on any active state (initiated/ringing/answered) — provider
  // status updates can be delayed, and the user wants the panel up the
  // moment the call is in progress.
  useEffect(() => {
    if (!currentCall) return;
    const live = ["initiated", "ringing", "answered"].includes(currentCall.status);
    if (!live) return;
    setPinned((prev) => {
      if (prev && prev.sessionId === currentCall.sessionId) return prev;
      return { sessionId: currentCall.sessionId, clientId: currentCall.clientId, phase: "live" };
    });
  }, [currentCall]);

  // When the call disconnects, force the panel back open in "ended" phase.
  useEffect(() => {
    if (!lastCompletedCall) return;
    setPinned({ sessionId: lastCompletedCall.sessionId, clientId: lastCompletedCall.clientId, phase: "ended" });
    setMinimized(false);
    clearLastCompletedCall();
  }, [lastCompletedCall, clearLastCompletedCall]);

  // Load presets the first time a panel is shown.
  useEffect(() => {
    if (!pinned) return;
    supabase
      .from("remark_presets")
      .select("id,label,category")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setPresets(data ?? []));
  }, [pinned?.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when the pinned call session changes.
  useEffect(() => {
    setPresetId(""); setNewPreset(""); setOutcome("");
    setRemark(""); setLeadStatus(""); setCallbackAt("");
  }, [pinned?.sessionId]);

  const presetLabel = useMemo(
    () => presets.find((p) => p.id === presetId)?.label,
    [presets, presetId],
  );

  const addPreset = async () => {
    if (!isAdmin) return;
    const label = newPreset.trim();
    if (!label) return;
    setAddingPreset(true);
    try {
      const { data, error } = await supabase
        .from("remark_presets")
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

  const close = () => { setPinned(null); setMinimized(false); };

  const submit = async () => {
    if (!user || !pinned) return;
    if (!remark.trim() && !presetId) { toast.error("Pick a preset or write a remark"); return; }
    setBusy(true);
    try {
      const finalRemark = [presetLabel, remark.trim()].filter(Boolean).join(" — ");
      const { error } = await supabase.from("lead_remarks").insert({
        client_id: pinned.clientId,
        call_session_id: pinned.sessionId,
        author_id: user.id,
        outcome: outcome || null,
        remark: finalRemark,
        lead_status: leadStatus || null,
        next_callback_at: callbackAt || null,
      });
      if (error) throw error;
      await appendTimeline({
        clientId: pinned.clientId, eventType: "remark",
        summary: finalRemark.slice(0, 140),
        metadata: { outcome, leadStatus, callbackAt, presetId, callPhase: pinned.phase },
      });
      toast.success("Remark saved");
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setBusy(false); }
  };

  if (!pinned) return null;

  const headerLabel = pinned.phase === "live" ? "Live call · add notes" : "Call ended · add notes";
  const canMinimize = pinned.phase === "live";

  if (minimized && canMinimize) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="sm"
          onClick={() => setMinimized(false)}
          className="shadow-lg gradient-brand text-primary-foreground"
        >
          <MessageSquarePlus className="size-4 mr-1.5" />
          {headerLabel}
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] shadow-xl border">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40 rounded-t-lg">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className={
              pinned.phase === "live"
                ? "size-2 rounded-full bg-emerald-500 animate-pulse"
                : "size-2 rounded-full bg-amber-500"
            }
          />
          {headerLabel}
        </div>
        <div className="flex gap-1">
          {canMinimize && (
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setMinimized(true)} title="Minimize">
              <Minus className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
        <div className="space-y-1.5">
          <Label className="text-xs">Predefined remark</Label>
          <Select value={presetId} onValueChange={setPresetId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Pick from list" /></SelectTrigger>
            <SelectContent>
              {presets.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin ? (
            <div className="flex gap-2 pt-1">
              <Input value={newPreset} onChange={(e) => setNewPreset(e.target.value)} placeholder="Add new option (admin only)" className="h-8 text-sm" />
              <Button type="button" size="sm" variant="outline" onClick={addPreset} disabled={addingPreset || !newPreset.trim()}>
                <Plus className="size-3.5 mr-1" />Add
              </Button>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground pt-1">Only admins can add new predefined remarks.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Custom remark</Label>
          <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} placeholder="Add details…" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Lead status</Label>
            <Select value={leadStatus} onValueChange={(v) => setLeadStatus(v as LeadStatus)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
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
            <Label className="text-xs">Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
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
          <Label className="text-xs">Callback date & time (optional)</Label>
          <Input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} className="h-9" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {pinned.phase === "live" && (
            <Button variant="outline" size="sm" onClick={() => setMinimized(true)}>Minimize</Button>
          )}
          <Button size="sm" onClick={submit} disabled={busy}>Save remark</Button>
        </div>
        {pinned.phase === "ended" && (
          <p className="text-[10px] text-muted-foreground text-center">A remark is required before this panel can close.</p>
        )}
      </div>
    </Card>
  );
}
