import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Plus, Info } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { notifyUsers } from "@/lib/appNotifications";

type Perm = "view" | "edit" | "upload" | "full";
const PERM_OPTIONS: { value: Perm; label: string; help: string }[] = [
  { value: "view", label: "View", help: "Read-only access" },
  { value: "edit", label: "Edit", help: "Edit client details" },
  { value: "upload", label: "Upload", help: "Edit + upload documents" },
  { value: "full", label: "Full", help: "Manage everything for this client" },
];

interface UserRow { id: string; user_id: string; permission: Perm; profile?: { full_name: string | null; email: string | null } | null }
interface TeamRow { id: string; team_id: string; permission: Perm; team?: { name: string } | null }
interface Profile { id: string; full_name: string | null; email: string | null; status: string | null }
interface Team { id: string; name: string }

export function ClientAccessDialog({
  open, onOpenChange, clientId, clientName, onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  clientName: string;
  onChanged?: () => void;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [newUserId, setNewUserId] = useState<string>("");
  const [newUserPerm, setNewUserPerm] = useState<Perm>("view");
  const [newTeamId, setNewTeamId] = useState<string>("");
  const [newTeamPerm, setNewTeamPerm] = useState<Perm>("view");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [uaRes, taRes, profsRes, tmsRes] = await Promise.all([
      supabase.from("client_access").select("id,user_id,permission").eq("client_id", clientId).not("user_id", "is", null),
      supabase.from("client_access").select("id,team_id,permission").eq("client_id", clientId).not("team_id", "is", null),
      supabase.rpc("list_assignable_staff"),
      supabase.rpc("list_assignable_teams"),
    ]);
    if (uaRes.error) {
      console.warn("[ClientAccessDialog] client_access load failed", uaRes.error.message);
      toast.error(uaRes.error.message);
    }
    if (taRes.error) {
      console.warn("[ClientAccessDialog] team access load failed", taRes.error.message);
    }

    const profMap = new Map<string, Profile>();
    ((profsRes.data ?? []) as Profile[]).forEach((p) => profMap.set(p.id, p));

    setUsers(
      ((uaRes.data ?? []) as Array<{ id: string; user_id: string; permission: Perm }>).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        permission: r.permission,
        profile: profMap.get(r.user_id) ?? null,
      })),
    );

    const teamNameMap = new Map<string, string>();
    ((tmsRes.data ?? []) as Team[]).forEach((t) => teamNameMap.set(t.id, t.name));
    setTeams(
      ((taRes.data ?? []) as Array<{ id: string; team_id: string; permission: Perm }>).map((r) => ({
        id: r.id,
        team_id: r.team_id,
        permission: r.permission,
        team: { name: teamNameMap.get(r.team_id) ?? r.team_id },
      })),
    );
    setAllProfiles(((profsRes.data ?? []) as Profile[]).map((p) => ({ ...p, status: "active" })));
    setAllTeams((tmsRes.data ?? []) as Team[]);
  };

  useEffect(() => { if (open && clientId) void load(); }, [open, clientId]);

  const notifyChanged = () => {
    onChanged?.();
  };

  const grantUser = async () => {
    if (!newUserId) return;
    setBusy(true);
    const { data: existing } = await supabase
      .from("client_access")
      .select("id")
      .eq("client_id", clientId)
      .eq("user_id", newUserId)
      .maybeSingle();
    const { error } = existing
      ? await supabase.from("client_access").update({ permission: newUserPerm }).eq("id", existing.id)
      : await supabase.from("client_access").insert({ client_id: clientId, user_id: newUserId, permission: newUserPerm });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await logActivity("client.access_granted", "client", clientId, { user_id: newUserId, permission: newUserPerm });
    if (!existing) {
      try {
        const { data: au } = await supabase.auth.getUser();
        const actorId = au?.user?.id ?? null;
        let actorName = "A team member";
        if (actorId) {
          const { data: p } = await supabase.from("profiles").select("full_name,email").eq("id", actorId).maybeSingle();
          actorName = (p as { full_name?: string; email?: string } | null)?.full_name ?? (p as { email?: string } | null)?.email ?? actorName;
        }
        await notifyUsers({
          userIds: [newUserId],
          category: "client_access_granted",
          severity: "info",
          title: "Client access granted",
          body: `${actorName} granted you access to ${clientName}`,
          link: `/clients/${clientId}`,
          entityType: "client",
          entityId: clientId,
          dedupeKey: `access-granted:${newUserId}:${clientId}`,
          metadata: { permission: newUserPerm, actor_id: actorId, actor_name: actorName, client_name: clientName },
        });
      } catch (e) {
        console.warn("[ClientAccessDialog] access grant notify failed", e);
      }
    }
    toast.success("Access granted");
    setNewUserId("");
    setNewUserPerm("view");
    await load();
    notifyChanged();
  };

  const grantTeam = async () => {
    if (!newTeamId) return;
    setBusy(true);
    const { data: existing } = await supabase
      .from("client_access")
      .select("id")
      .eq("client_id", clientId)
      .eq("team_id", newTeamId)
      .maybeSingle();
    const { error } = existing
      ? await supabase.from("client_access").update({ permission: newTeamPerm }).eq("id", existing.id)
      : await supabase.from("client_access").insert({ client_id: clientId, team_id: newTeamId, permission: newTeamPerm });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await logActivity("client.access_granted", "client", clientId, { team_id: newTeamId, permission: newTeamPerm });
    if (!existing) {
      try {
        const { data: au } = await supabase.auth.getUser();
        const actorId = au?.user?.id ?? null;
        let actorName = "A team member";
        if (actorId) {
          const { data: p } = await supabase.from("profiles").select("full_name,email").eq("id", actorId).maybeSingle();
          actorName = (p as { full_name?: string; email?: string } | null)?.full_name ?? (p as { email?: string } | null)?.email ?? actorName;
        }
        const { data: members } = await supabase.from("team_members").select("user_id").eq("team_id", newTeamId);
        const targets = (members ?? []).map((m: { user_id: string }) => m.user_id).filter(Boolean);
        if (targets.length) {
          await notifyUsers({
            userIds: targets,
            category: "client_access_granted",
            severity: "info",
            title: "Client access granted",
            body: `${actorName} granted your team access to ${clientName}`,
            link: `/clients/${clientId}`,
            entityType: "client",
            entityId: clientId,
            dedupeKey: `access-granted-team:${newTeamId}:${clientId}`,
            metadata: { permission: newTeamPerm, team_id: newTeamId, actor_id: actorId, actor_name: actorName, client_name: clientName },
          });
        }
      } catch (e) {
        console.warn("[ClientAccessDialog] team access grant notify failed", e);
      }
    }
    toast.success("Team access granted");
    setNewTeamId("");
    setNewTeamPerm("view");
    await load();
    notifyChanged();
  };

  const updatePerm = async (id: string, perm: Perm, kind: "user" | "team", subjectId: string) => {
    const { error } = await supabase.from("client_access").update({ permission: perm }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("client.access_changed", "client", clientId, { [`${kind}_id`]: subjectId, permission: perm });
    await load();
    notifyChanged();
  };

  const remove = async (id: string, kind: "user" | "team", subjectId: string) => {
    const { error } = await supabase.from("client_access").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("client.access_revoked", "client", clientId, { [`${kind}_id`]: subjectId });
    toast.success("Access revoked");
    await load();
    notifyChanged();
  };

  const availableProfiles = allProfiles.filter((p) => !users.some((u) => u.user_id === p.id));
  const availableTeams = allTeams.filter((t) => !teams.some((tm) => tm.team_id === t.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage access — {clientName}</DialogTitle>
          <DialogDescription>Grant per-user or per-team access. Each user has independent permissions.</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2.5 text-xs">
          <Info className="size-3.5 mt-0.5 shrink-0" />
          <span>Individual user permissions <b>override</b> any team-based permission for this client.</span>
        </div>
        <Tabs defaultValue="users">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="teams">Teams ({teams.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3">
            <div className="flex gap-2">
              <Select value={newUserId} onValueChange={setNewUserId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select a user…" /></SelectTrigger>
                <SelectContent>
                  {availableProfiles.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">No more users available</div>}
                  {availableProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newUserPerm} onValueChange={(v) => setNewUserPerm(v as Perm)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{PERM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={grantUser} disabled={!newUserId || busy}><Plus className="size-4" /></Button>
            </div>
            <div className="border rounded-md divide-y">
              {users.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No individual user access</div>}
              {users.map((u) => {
                const fullName = u.profile?.full_name ?? null;
                const email = u.profile?.email ?? null;
                const display = fullName ?? email ?? "Unknown user";
                const initials = (fullName ?? email ?? "?")
                  .split(/\s+/)
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div key={u.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="size-7 rounded-full bg-muted text-[11px] font-medium flex items-center justify-center text-muted-foreground shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{display}</div>
                      {email && <div className="text-xs text-muted-foreground truncate">{email}</div>}
                    </div>
                    <Select value={u.permission} onValueChange={(v) => updatePerm(u.id, v as Perm, "user", u.user_id)}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{PERM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(u.id, "user", u.user_id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-3">
            <div className="flex gap-2">
              <Select value={newTeamId} onValueChange={setNewTeamId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select a team…" /></SelectTrigger>
                <SelectContent>
                  {availableTeams.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">No more teams available</div>}
                  {availableTeams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={newTeamPerm} onValueChange={(v) => setNewTeamPerm(v as Perm)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{PERM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={grantTeam} disabled={!newTeamId || busy}><Plus className="size-4" /></Button>
            </div>
            <div className="border rounded-md divide-y">
              {teams.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No team access</div>}
              {teams.map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0 text-sm truncate">{t.team?.name ?? t.team_id}</div>
                  <Select value={t.permission} onValueChange={(v) => updatePerm(t.id, v as Perm, "team", t.team_id)}>
                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{PERM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(t.id, "team", t.team_id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
