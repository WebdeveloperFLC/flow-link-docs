import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { pushHandoff, TASK_LABELS } from "@/lib/handoffs";

interface User { id: string; full_name: string | null; email: string | null; role: AppRole; }

export function HandoffDialog({ open, onOpenChange, clientId, clientName }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  clientName?: string;
}) {
  const { user, roles } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [taskLabel, setTaskLabel] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: rolesData } = await supabase
        .from("user_roles").select("user_id,role").in("role", ["telecaller", "counselor"]);
      const ids = Array.from(new Set((rolesData ?? []).map((r) => r.user_id))).filter((id) => id !== user?.id);
      if (!ids.length) { setUsers([]); return; }
      const { data: profiles } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      const roleMap = new Map<string, AppRole>();
      for (const r of rolesData ?? []) roleMap.set(r.user_id, r.role as AppRole);
      setUsers((profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "viewer" } as User)));
    })();
  }, [open, user?.id]);

  const grouped = useMemo(() => ({
    counselor: users.filter((u) => u.role === "counselor"),
    telecaller: users.filter((u) => u.role === "telecaller"),
  }), [users]);

  const myRole: AppRole | null = useMemo(() => {
    if (roles.includes("telecaller")) return "telecaller";
    if (roles.includes("counselor")) return "counselor";
    if (roles.includes("admin")) return "counselor"; // admins can act as counselor for routing
    return null;
  }, [roles]);

  const submit = async () => {
    if (!toUserId || !myRole) return;
    const target = users.find((u) => u.id === toUserId);
    if (!target) return;
    setBusy(true);
    try {
      await pushHandoff({
        clientId,
        toUserId,
        toRole: target.role,
        fromRole: myRole,
        note,
        taskLabel: taskLabel || undefined,
        clientName,
      });
      toast.success("Lead handed off");
      onOpenChange(false);
      setNote(""); setTaskLabel(""); setToUserId("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to hand off");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Hand off lead{clientName ? ` — ${clientName}` : ""}</DialogTitle></DialogHeader>
        {!myRole && (
          <div className="text-sm text-muted-foreground border rounded p-3 bg-muted/30">
            Only counselors and telecallers can hand off leads. Ask an admin to assign you a role.
          </div>
        )}
        {myRole && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Assign to *</Label>
              <Select value={toUserId} onValueChange={setToUserId}>
                <SelectTrigger><SelectValue placeholder="Pick a teammate" /></SelectTrigger>
                <SelectContent>
                  {grouped.counselor.length > 0 && <div className="px-2 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Counselors</div>}
                  {grouped.counselor.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                  {grouped.telecaller.length > 0 && <div className="px-2 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Telecallers</div>}
                  {grouped.telecaller.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                  {users.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">No telecallers or counselors yet.</div>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Task for recipient</Label>
              <Select value={taskLabel} onValueChange={setTaskLabel}>
                <SelectTrigger><SelectValue placeholder="Optional task" /></SelectTrigger>
                <SelectContent>
                  {TASK_LABELS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Parent wants fee waiver discussed" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!toUserId || busy || !myRole}>Hand off</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
