import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Shuffle, ListOrdered } from "lucide-react";

type Role = "telecaller" | "counselor";
type Mode = "round_robin" | "random";

interface Member { id: string; full_name: string | null; email: string | null }

export function BulkDistributeDialog({ open, onOpenChange, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void;
}) {
  const [role, setRole] = useState<Role>("telecaller");
  const [mode, setMode] = useState<Mode>("round_robin");
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [limit, setLimit] = useState(100);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected({});
    (async () => {
      const { data: rolesData } = await supabase.from("user_roles").select("user_id").eq("role", role);
      const ids = (rolesData ?? []).map((r) => r.user_id);
      if (!ids.length) { setMembers([]); return; }
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      setMembers((profs ?? []) as Member[]);
    })();
  }, [open, role]);

  const chosen = useMemo(() => members.filter((m) => selected[m.id]).map((m) => m.id), [members, selected]);

  const run = async () => {
    if (chosen.length === 0) { toast.error("Pick at least one member"); return; }
    setBusy(true);
    try {
      // Pick leads: most recent N, optionally only unassigned via call_queue_items.assigned_agent_id IS NULL
      let q = supabase.from("leads").select("id, created_at").order("created_at", { ascending: false }).limit(limit);
      const { data: leads, error } = await q;
      if (error) throw error;
      let leadIds = (leads ?? []).map((l) => l.id);
      if (pendingOnly && role === "telecaller") {
        const { data: queued } = await supabase.from("call_queue_items").select("lead_id").is("assigned_agent_id", null).in("lead_id", leadIds);
        const queuedSet = new Set((queued ?? []).map((q) => q.lead_id).filter(Boolean));
        leadIds = leadIds.filter((id) => queuedSet.has(id));
      }
      if (leadIds.length === 0) { toast.error("No leads matched the filter"); setBusy(false); return; }

      // Create an ad-hoc rule
      const { data: rule, error: rErr } = await supabase.from("distribution_rules")
        .insert({ name: `Adhoc ${new Date().toISOString()}`, mode, target_role: role })
        .select("id").single();
      if (rErr) throw rErr;
      const { error: mErr } = await supabase.from("distribution_rule_members")
        .insert(chosen.map((uid) => ({ rule_id: rule.id, user_id: uid })));
      if (mErr) throw mErr;

      const { data: res, error: dErr } = await supabase.rpc("distribute_leads", { _lead_ids: leadIds, _rule_id: rule.id });
      if (dErr) throw dErr;
      const total = (res as { total?: number } | null)?.total ?? leadIds.length;
      toast.success(`Distributed ${total} leads to ${chosen.length} ${role}(s) in ${mode === "random" ? "shuffle" : "sequence"}`);
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Distribution failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Bulk distribute leads</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Distribute to</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="telecaller">Telecallers</SelectItem>
                  <SelectItem value="counselor">Counselors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin"><span className="flex items-center gap-2"><ListOrdered className="size-3.5" />Sequence (round-robin)</span></SelectItem>
                  <SelectItem value="random"><span className="flex items-center gap-2"><Shuffle className="size-3.5" />Shuffle (random)</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lead count (most recent)</Label>
              <Input type="number" min={1} max={2000} value={limit} onChange={(e) => setLimit(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          {role === "telecaller" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={pendingOnly} onCheckedChange={(c) => setPendingOnly(c === true)} />
              Only unassigned queue items
            </label>
          )}
          <div>
            <Label className="mb-1.5 block">Pick {role}s ({chosen.length} selected)</Label>
            <div className="border rounded max-h-72 overflow-auto divide-y">
              {members.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No {role}s found.</div>}
              {members.map((m) => (
                <label key={m.id} className="px-3 py-2 flex items-center gap-2 hover:bg-muted/30 cursor-pointer">
                  <Checkbox checked={!!selected[m.id]} onCheckedChange={(c) => setSelected((s) => ({ ...s, [m.id]: c === true }))} />
                  <div className="text-sm">
                    <div className="font-medium">{m.full_name || m.email}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={busy || chosen.length === 0}>
            {busy && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            Distribute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}