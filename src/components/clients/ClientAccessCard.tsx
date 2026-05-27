import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, UserCog, UserPlus, Users, ArrowRightLeft, LogOut, ShieldCheck, Settings2, Loader2, Ban, RotateCcw, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/contexts/AuthContext";

type Perm = "view" | "edit" | "upload" | "full";

const permLabel = (p: Perm) =>
  p === "full" ? "Full" : p === "upload" ? "Upload" : p === "edit" ? "Edit" : "View";

const permTone: Record<Perm, string> = {
  full: "bg-primary/10 text-primary border-primary/20",
  upload: "bg-secondary/10 text-secondary border-secondary/20",
  edit: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  view: "bg-muted text-muted-foreground border-border",
};

interface Profile { id: string; full_name: string | null; email: string | null }
interface DefaultMemberRow { id: string; member_id: string; permission: Perm; revoked_at: string | null; profile?: Profile | null }
interface AccessUserRow { id: string; user_id: string; permission: Perm; revoked_at: string | null; profile?: Profile | null }
interface AccessTeamRow { id: string; team_id: string; permission: Perm; team_name?: string | null; members: Profile[] }

export function ClientAccessCard({
  clientId,
  ownerId,
  createdBy,
  onOwnerChanged,
  onManageClick,
}: {
  clientId: string;
  ownerId: string | null;
  createdBy: string | null;
  onOwnerChanged: () => void;
  onManageClick?: () => void;
}) {
  const { user, isAdmin } = useAuth();
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [defaults, setDefaults] = useState<DefaultMemberRow[]>([]);
  const [users, setUsers] = useState<AccessUserRow[]>([]);
  const [teams, setTeams] = useState<AccessTeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    kind: "revoke" | "restore" | "remove";
    scope: "client_access" | "default_team_members";
    rowId: string;
    subjectId: string;
    name: string;
    prevPerm: Perm;
  }>(null);

  const effectiveOwnerId = ownerId ?? createdBy;
  const isPrimary = !!user && (user.id === ownerId || (!ownerId && user.id === createdBy));
  const canManage = isAdmin || isPrimary;

  const load = useCallback(async () => {
    setLoading(true);
    const [dtmRes, uaRes, taRes] = await Promise.all([
      effectiveOwnerId
        ? supabase.from("default_team_members").select("id,member_id,permission,revoked_at").eq("owner_id", effectiveOwnerId)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("client_access").select("id,user_id,permission,revoked_at").eq("client_id", clientId).not("user_id", "is", null),
      supabase.from("client_access").select("id,team_id,permission").eq("client_id", clientId).not("team_id", "is", null),
    ]);
    const dtmRows = (dtmRes.data ?? []) as Array<{ id: string; member_id: string; permission: Perm; revoked_at: string | null }>;
    const uaRows = (uaRes.data ?? []) as Array<{ id: string; user_id: string; permission: Perm; revoked_at: string | null }>;
    const taRows = (taRes.data ?? []) as Array<{ id: string; team_id: string; permission: Perm }>;

    // Fetch team names + members
    const teamIds = taRows.map((t) => t.team_id);
    const [teamsRes, teamMembersRes] = await Promise.all([
      teamIds.length
        ? supabase.from("teams").select("id,name").in("id", teamIds)
        : Promise.resolve({ data: [] as any[] }),
      teamIds.length
        ? supabase.from("team_members").select("team_id,user_id").in("team_id", teamIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const teamNameMap = new Map<string, string>(((teamsRes.data ?? []) as any[]).map((t) => [t.id, t.name]));
    const teamMemberMap = new Map<string, string[]>();
    for (const tm of (teamMembersRes.data ?? []) as any[]) {
      const arr = teamMemberMap.get(tm.team_id) ?? [];
      arr.push(tm.user_id);
      teamMemberMap.set(tm.team_id, arr);
    }

    // Collect all profile ids needed.
    const ids = new Set<string>();
    if (effectiveOwnerId) ids.add(effectiveOwnerId);
    dtmRows.forEach((r) => ids.add(r.member_id));
    uaRows.forEach((r) => ids.add(r.user_id));
    teamMemberMap.forEach((arr) => arr.forEach((id) => ids.add(id)));
    const profMap = new Map<string, Profile>();
    if (ids.size) {
      // Hydrate profiles via the SECURITY DEFINER staff resolver so EVERY
      // viewer with client access (not just admins) sees full names/emails.
      // Falls back to direct profiles query for any ids the resolver doesn't
      // return (e.g. self-readable profile, non-staff edge cases).
      const { data: staff } = await supabase.rpc("list_assignable_staff");
      ((staff ?? []) as any[]).forEach((p) => {
        if (ids.has(p.id)) profMap.set(p.id, { id: p.id, full_name: p.full_name, email: p.email });
      });
      const missing = Array.from(ids).filter((id) => !profMap.has(id));
      if (missing.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", missing);
        ((profs ?? []) as Profile[]).forEach((p) => profMap.set(p.id, p));
      }
    }

    setOwnerProfile(effectiveOwnerId ? profMap.get(effectiveOwnerId) ?? null : null);
    setDefaults(dtmRows.map((r) => ({ ...r, profile: profMap.get(r.member_id) ?? null })));
    setUsers(uaRows.map((r) => ({ ...r, profile: profMap.get(r.user_id) ?? null })));
    setTeams(taRows.map((r) => ({
      id: r.id,
      team_id: r.team_id,
      permission: r.permission,
      team_name: teamNameMap.get(r.team_id) ?? null,
      members: (teamMemberMap.get(r.team_id) ?? []).map((id) => profMap.get(id)).filter((p): p is Profile => !!p),
    })));
    setLoading(false);
  }, [clientId, effectiveOwnerId]);

  useEffect(() => { load(); }, [load]);

  // Build candidates for transfer: current additional users + default team members.
  const transferCandidates: Profile[] = (() => {
    const map = new Map<string, Profile>();
    for (const u of users) if (u.profile) map.set(u.user_id, u.profile);
    for (const d of defaults) if (d.profile) map.set(d.member_id, d.profile);
    if (effectiveOwnerId) map.delete(effectiveOwnerId);
    return Array.from(map.values());
  })();

  const initials = (p: Profile | null) => {
    const s = (p?.full_name ?? p?.email ?? "?").trim();
    return s.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase() ?? "").join("") || "?";
  };

  const Avatar = ({ p }: { p: Profile | null }) => (
    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground/70 shrink-0">
      {initials(p)}
    </div>
  );

  const transfer = async () => {
    if (!newOwnerId || !effectiveOwnerId) return;
    setBusy(true);
    // 1) Reassign client primary.
    const { error: updErr } = await supabase
      .from("clients").update({ owner_id: newOwnerId, created_by: newOwnerId }).eq("id", clientId);
    if (updErr) { setBusy(false); toast.error(updErr.message); return; }
    // 2) Preserve previous owner's access at FULL (so they don't lose it unless they exit).
    if (effectiveOwnerId && effectiveOwnerId !== newOwnerId) {
      const { data: existing } = await supabase
        .from("client_access").select("id").eq("client_id", clientId).eq("user_id", effectiveOwnerId).maybeSingle();
      if (existing) {
        await supabase.from("client_access").update({ permission: "full" }).eq("id", existing.id);
      } else {
        await supabase.from("client_access").insert({ client_id: clientId, user_id: effectiveOwnerId, permission: "full" });
      }
    }
    // 3) Remove the new owner's redundant client_access row (they own it now).
    await supabase.from("client_access").delete().eq("client_id", clientId).eq("user_id", newOwnerId);
    await logActivity("client.ownership_transferred", "client", clientId, {
      from_user_id: effectiveOwnerId, to_user_id: newOwnerId,
    });
    setBusy(false);
    setTransferOpen(false);
    setNewOwnerId("");
    toast.success("Ownership transferred");
    onOwnerChanged();
    load();
  };

  const exitAfterReassign = async () => {
    if (!newOwnerId || !user) return;
    setBusy(true);
    // Reassign first (same as transfer).
    const { error: updErr } = await supabase
      .from("clients").update({ owner_id: newOwnerId, created_by: newOwnerId }).eq("id", clientId);
    if (updErr) { setBusy(false); toast.error(updErr.message); return; }
    // Remove self from client_access entirely (exit).
    await supabase.from("client_access").delete().eq("client_id", clientId).eq("user_id", user.id);
    await supabase.from("client_access").delete().eq("client_id", clientId).eq("user_id", newOwnerId);
    await logActivity("client.primary_exited", "client", clientId, {
      from_user_id: user.id, to_user_id: newOwnerId,
    });
    setBusy(false);
    setExitOpen(false);
    setNewOwnerId("");
    toast.success("You exited as Primary. New Primary assigned.");
    onOwnerChanged();
    load();
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    setBusy(true);
    const { kind, scope, rowId, subjectId, prevPerm } = confirm;
    let err: any = null;
    if (kind === "remove") {
      ({ error: err } = await supabase.from(scope as any).delete().eq("id", rowId));
    } else if (kind === "revoke") {
      ({ error: err } = await supabase.from(scope as any).update({ revoked_at: new Date().toISOString() }).eq("id", rowId));
    } else {
      ({ error: err } = await supabase.from(scope as any).update({ revoked_at: null }).eq("id", rowId));
    }
    setBusy(false);
    if (err) { toast.error(err.message); return; }
    const action =
      kind === "remove" ? "client.access_removed" :
      kind === "revoke" ? "client.access_revoked" : "client.access_restored";
    await logActivity(action, "client", clientId, {
      scope, subject_id: subjectId, previous_permission: prevPerm,
    });
    toast.success(
      kind === "remove" ? "User removed" : kind === "revoke" ? "Access revoked" : "Access restored"
    );
    setConfirm(null);
    load();
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-5 py-3.5 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">Access & Assigned Users</div>
            <div className="text-[11px] text-muted-foreground">Who can see and edit this client</div>
          </div>
        </div>
        {canManage && onManageClick && (
          <Button size="sm" variant="outline" onClick={onManageClick}>
            <Settings2 className="size-3.5 mr-1.5" /> Manage
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Primary */}
        <section>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Crown className="size-3.5 text-amber-500" /> Primary user
          </div>
          {ownerProfile ? (
            <div className="flex items-center gap-2.5 rounded-md border bg-amber-50/50 dark:bg-amber-500/5 border-amber-500/20 p-2.5">
              <Avatar p={ownerProfile} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                  {ownerProfile.full_name ?? ownerProfile.email}
                  {user?.id === ownerProfile.id && <span className="text-[10px] text-muted-foreground">(you)</span>}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{ownerProfile.email}</div>
              </div>
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0">FULL RIGHTS</Badge>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">No primary owner assigned.</div>
          )}
          {canManage && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" className="h-8" onClick={() => setTransferOpen(true)} disabled={transferCandidates.length === 0 && !isAdmin}>
                <ArrowRightLeft className="size-3.5 mr-1.5" /> Transfer
              </Button>
              {isPrimary && (
                <Button size="sm" variant="outline" className="h-8 text-destructive hover:text-destructive" onClick={() => setExitOpen(true)} disabled={transferCandidates.length === 0}>
                  <LogOut className="size-3.5 mr-1.5" /> Exit as Primary
                </Button>
              )}
            </div>
          )}
          {canManage && transferCandidates.length === 0 && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Add team members or grant access first to enable transfer / exit.
            </div>
          )}
        </section>

        {/* Default team members (inherited) */}
        <section>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <UserCog className="size-3.5" /> Team members <span className="text-muted-foreground/70 font-normal normal-case">(inherited from primary)</span>
          </div>
          {defaults.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-1">No default team members.</div>
          ) : (
            <div className="space-y-1.5">
              {defaults.map((d) => (
                <div key={d.id} className={`flex items-center gap-2.5 rounded-md border p-2 ${d.revoked_at ? "bg-muted/40 opacity-80" : ""}`}>
                  <Avatar p={d.profile ?? null} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{d.profile?.full_name ?? d.profile?.email ?? d.member_id}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{d.profile?.email}</div>
                  </div>
                  {d.revoked_at ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-destructive/10 text-destructive border-destructive/20">Access Revoked</span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Active</span>
                  )}
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${permTone[d.permission]}`}>
                    {permLabel(d.permission)}
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      {d.revoked_at ? (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-700 hover:text-emerald-700"
                          onClick={() => setConfirm({ kind: "restore", scope: "default_team_members", rowId: d.id, subjectId: d.member_id, name: d.profile?.full_name ?? d.profile?.email ?? "user", prevPerm: d.permission })}>
                          <RotateCcw className="size-3.5 mr-1" />Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-700 hover:text-amber-700"
                          onClick={() => setConfirm({ kind: "revoke", scope: "default_team_members", rowId: d.id, subjectId: d.member_id, name: d.profile?.full_name ?? d.profile?.email ?? "user", prevPerm: d.permission })}>
                          <Ban className="size-3.5 mr-1" />Revoke
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setConfirm({ kind: "remove", scope: "default_team_members", rowId: d.id, subjectId: d.member_id, name: d.profile?.full_name ?? d.profile?.email ?? "user", prevPerm: d.permission })}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Additional users (manual per-client) */}
        <section>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <UserPlus className="size-3.5" /> Added users <span className="text-muted-foreground/70 font-normal normal-case">(per-client)</span>
          </div>
          {users.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-1">No additional users.</div>
          ) : (
            <div className="space-y-1.5">
              {users.map((u) => (
                <div key={u.id} className={`flex items-center gap-2.5 rounded-md border p-2 ${u.revoked_at ? "bg-muted/40 opacity-80" : ""}`}>
                  <Avatar p={u.profile ?? null} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate flex items-center gap-1.5">
                      {u.profile?.full_name ?? u.profile?.email ?? u.user_id}
                      {user?.id === u.user_id && <span className="text-[10px] text-muted-foreground">(you)</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{u.profile?.email}</div>
                  </div>
                  {u.revoked_at ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-destructive/10 text-destructive border-destructive/20">Access Revoked</span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Active</span>
                  )}
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${permTone[u.permission]}`}>
                    {permLabel(u.permission)}
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      {u.revoked_at ? (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-700 hover:text-emerald-700"
                          onClick={() => setConfirm({ kind: "restore", scope: "client_access", rowId: u.id, subjectId: u.user_id, name: u.profile?.full_name ?? u.profile?.email ?? "user", prevPerm: u.permission })}>
                          <RotateCcw className="size-3.5 mr-1" />Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-700 hover:text-amber-700"
                          onClick={() => setConfirm({ kind: "revoke", scope: "client_access", rowId: u.id, subjectId: u.user_id, name: u.profile?.full_name ?? u.profile?.email ?? "user", prevPerm: u.permission })}>
                          <Ban className="size-3.5 mr-1" />Revoke
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setConfirm({ kind: "remove", scope: "client_access", rowId: u.id, subjectId: u.user_id, name: u.profile?.full_name ?? u.profile?.email ?? "user", prevPerm: u.permission })}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {teams.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <Users className="size-3.5" /> Teams
            </div>
            <div className="space-y-1.5">
              {teams.map((t) => (
                <div key={t.id} className="rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 text-sm font-medium truncate">{t.team_name ?? t.team_id}</div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${permTone[t.permission]}`}>
                      {permLabel(t.permission)}
                    </span>
                  </div>
                  {t.members.length > 0 && (
                    <div className="mt-1.5 pl-1 text-[11px] text-muted-foreground truncate">
                      {t.members.map((m) => m.full_name ?? m.email).join(" · ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Loading…</div>
        )}
      </div>

      {/* Transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Primary ownership</DialogTitle>
            <DialogDescription>
              Choose a new Primary user. The current Primary will keep <b>Full</b> access unless removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Select value={newOwnerId} onValueChange={setNewOwnerId}>
              <SelectTrigger><SelectValue placeholder="Select new primary user…" /></SelectTrigger>
              <SelectContent>
                {transferCandidates.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">No assigned users available. Add a team member or grant access first.</div>
                )}
                {transferCandidates.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTransferOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={transfer} disabled={!newOwnerId || busy}>
              {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <ArrowRightLeft className="size-4 mr-1.5" />}
              Confirm transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit dialog */}
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit as Primary user</DialogTitle>
            <DialogDescription>
              You must assign a new Primary before exiting. After exit, you will <b>lose all access</b> to this client unless re-added.
            </DialogDescription>
          </DialogHeader>
          <Select value={newOwnerId} onValueChange={setNewOwnerId}>
            <SelectTrigger><SelectValue placeholder="Select new primary user…" /></SelectTrigger>
            <SelectContent>
              {transferCandidates.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExitOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={exitAfterReassign} disabled={!newOwnerId || busy}>
              {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <LogOut className="size-4 mr-1.5" />}
              Reassign & exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "remove" && `Remove ${confirm.name}?`}
              {confirm?.kind === "revoke" && `Revoke access for ${confirm.name}?`}
              {confirm?.kind === "restore" && `Restore access for ${confirm.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "remove" && "This permanently detaches the user from this client. Activity history is preserved in audit logs."}
              {confirm?.kind === "revoke" && "Access will be temporarily disabled. The user stays in the list and can be restored later."}
              {confirm?.kind === "restore" && "The user will regain their previous permission immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); runConfirmed(); }}
              className={confirm?.kind === "remove" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              disabled={busy}
            >
              {busy && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {confirm?.kind === "remove" ? "Remove permanently" : confirm?.kind === "revoke" ? "Revoke access" : "Restore access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}