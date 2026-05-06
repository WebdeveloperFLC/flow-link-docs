import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users as UsersIcon, Info } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

type Perm = "view" | "edit" | "upload" | "full";
const PERM_OPTIONS: { value: Perm; label: string }[] = [
  { value: "view", label: "View" },
  { value: "edit", label: "Edit" },
  { value: "upload", label: "Upload" },
  { value: "full", label: "Full" },
];

interface Row { id: string; member_id: string; permission: Perm; profile?: { full_name: string | null; email: string | null } | null }
interface Profile { id: string; full_name: string | null; email: string | null }

export function DefaultTeamMembersCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newMember, setNewMember] = useState("");
  const [newPerm, setNewPerm] = useState<Perm>("view");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: dt }, { data: pr }] = await Promise.all([
      supabase
        .from("default_team_members")
        .select("id,member_id,permission")
        .eq("owner_id", user.id),
      supabase.from("profiles").select("id,full_name,email,status").eq("status", "active").order("full_name"),
    ]);
    const profs = (pr ?? []) as Profile[];
    const byId = new Map(profs.map((p) => [p.id, p]));
    setRows(((dt ?? []) as any[]).map((r) => ({ ...r, profile: byId.get(r.member_id) ?? null })));
    setProfiles(profs.filter((p) => p.id !== user.id));
  };

  useEffect(() => { load(); }, [user?.id]);

  const add = async () => {
    if (!user || !newMember) return;
    setBusy(true);
    const { error } = await supabase.from("default_team_members").insert({
      owner_id: user.id, member_id: newMember, permission: newPerm,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await logActivity("team.default_added", "user", newMember, { permission: newPerm });
    toast.success("Default team member added");
    setNewMember(""); setNewPerm("view");
    load();
  };

  const updatePerm = async (id: string, perm: Perm, memberId: string) => {
    const { error } = await supabase.from("default_team_members").update({ permission: perm }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("team.default_changed", "user", memberId, { permission: perm });
    load();
  };

  const remove = async (id: string, memberId: string) => {
    const { error } = await supabase.from("default_team_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("team.default_removed", "user", memberId);
    toast.success("Removed");
    load();
  };

  const available = profiles.filter((p) => !rows.some((r) => r.member_id === p.id));

  return (
    <Card className="p-5 shadow-elev-sm space-y-4">
      <div className="flex items-start gap-2">
        <UsersIcon className="size-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold">Default team members</div>
          <div className="text-xs text-muted-foreground">
            These users automatically inherit the chosen permission on every client you own — current and future.
          </div>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2.5 text-xs">
        <Info className="size-3.5 mt-0.5 shrink-0" />
        <span>Per-client grants you set on a client page <b>override</b> these defaults when higher.</span>
      </div>
      <div className="flex gap-2">
        <Select value={newMember} onValueChange={setNewMember}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Select a user…" /></SelectTrigger>
          <SelectContent>
            {available.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">No more users available</div>}
            {available.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={newPerm} onValueChange={(v) => setNewPerm(v as Perm)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{PERM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={add} disabled={!newMember || busy}><Plus className="size-4" /></Button>
      </div>
      <div className="border rounded-md divide-y">
        {rows.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No default team members yet</div>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{r.profile?.full_name ?? r.profile?.email ?? r.member_id}</div>
              <div className="text-xs text-muted-foreground truncate">{r.profile?.email}</div>
            </div>
            <Select value={r.permission} onValueChange={(v) => updatePerm(r.id, v as Perm, r.member_id)}>
              <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{PERM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(r.id, r.member_id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}