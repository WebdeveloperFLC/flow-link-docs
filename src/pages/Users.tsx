import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { Navigate } from "react-router-dom";
import { Shield, UserCog, Plus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { cn } from "@/lib/utils";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { HandleUserDataDialog, LifecycleAction } from "@/components/users/HandleUserDataDialog";

interface Profile { id: string; email: string | null; full_name: string | null; status?: string | null; }
interface RoleRow { user_id: string; role: AppRole; }

const ALL_ROLES: AppRole[] = ["admin", "counselor", "documentation", "viewer"];

const ROLE_HELP: Record<AppRole, string> = {
  admin: "Full system access, settings and team role management",
  counselor: "Edit access: add clients, upload documents and fill client details",
  documentation: "Edit access: add clients, upload documents and fill client details",
  viewer: "View-only access",
};

const ROLE_SHORT: Record<AppRole, string> = {
  admin: "Full system access",
  counselor: "Edit access",
  documentation: "Edit access",
  viewer: "View-only access",
};

const roleOptionLabel = (role: AppRole) => {
  if (role === "counselor") return "Edit - Counselor";
  if (role === "documentation") return "Edit - Documentation";
  return ROLE_LABELS[role];
};

const Users = () => {
  const { isAdmin, user, loading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [lifecycle, setLifecycle] = useState<{ action: LifecycleAction; user: Profile } | null>(null);

  const load = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,status").order("email"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setProfiles((p ?? []) as Profile[]);
    setRoles((r ?? []) as RoleRow[]);
  };
  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const rolesFor = (uid: string) => roles.filter((r) => r.user_id === uid).map((r) => r.role);

  const setRole = async (uid: string, role: AppRole) => {
    if (uid === user?.id && role !== "admin") {
      const stillAdmin = roles.some((r) => r.role === "admin" && r.user_id !== uid);
      if (!stillAdmin) { toast.error("Cannot demote the last admin"); return; }
    }
    setBusy(uid);
    try {
      // Replace all roles for the user with the single chosen role
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", uid);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (insErr) throw insErr;
      await logActivity("user.role_changed", "user", uid, { role });
      toast.success("Role updated");
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setBusy(null);
    }
  };

  const callAction = async (body: Record<string, unknown>, successMsg: string) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Failed");
      return;
    }
    toast.success(successMsg);
    await load();
  };

  const candidatesFor = (excludeId: string) =>
    profiles.filter((p) => p.id !== excludeId && (p.status ?? "active") === "active")
      .map((p) => ({ id: p.id, name: p.full_name ?? p.email ?? p.id }));

  const statusBadge = (status: string | null | undefined) => {
    const s = status ?? "active";
    const cls = s === "active" ? "bg-green-100 text-green-800"
      : s === "suspended" ? "bg-orange-100 text-orange-800"
      : s === "revoked" ? "bg-red-100 text-red-800"
      : "bg-muted text-muted-foreground";
    return <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider", cls)}>{s}</span>;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Team & roles"
        description="Assign roles to team members. Only admins can change permissions."
      />
      <div className="p-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setAddOpen(true)} className="gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-1" /> Add new user
          </Button>
        </div>
        <Card className="overflow-hidden shadow-elev-sm">
          <div className="grid grid-cols-[minmax(0,3fr)_110px_160px_minmax(0,2fr)_60px] gap-4 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
            <div>User</div>
            <div>Status</div>
            <div>Role</div>
            <div>Access level</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y">
            {profiles.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No team members yet. Invite people by sharing the sign-up link.
              </div>
            )}
            {profiles.map((p) => {
              const userRoles = rolesFor(p.id);
              const primary = (userRoles[0] ?? "viewer") as AppRole;
              const isMe = p.id === user?.id;
              const status = p.status ?? "active";
              return (
                <div key={p.id} className="grid grid-cols-[minmax(0,3fr)_110px_160px_minmax(0,2fr)_60px] gap-4 px-6 py-3.5 items-center">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-1.5">
                      <span className="truncate">{p.full_name ?? p.email}</span>
                      {isMe && <span className="text-[10px] text-muted-foreground shrink-0">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                  </div>
                  <div>{statusBadge(status)}</div>
                  <div className="min-w-0">
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider max-w-full truncate", ROLE_COLORS[primary])}>
                      <Shield className="size-2.5 shrink-0" />
                      <span className="truncate">{roleOptionLabel(primary)}</span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <Select value={primary} onValueChange={(v) => setRole(p.id, v as AppRole)} disabled={busy === p.id}>
                      <SelectTrigger className="h-9 text-xs w-full">
                        <SelectValue>
                          <span className="truncate block text-left">{ROLE_SHORT[primary]}</span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            <span className="flex flex-col py-1">
                              <span>{roleOptionLabel(r)}</span>
                              <span className="text-[10px] text-muted-foreground">{ROLE_HELP[r]}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => p.email && callAction({ action: "reset_password", email: p.email }, "Reset email sent")}
                          disabled={!p.email}
                        >Reset password</DropdownMenuItem>
                        {status === "active" ? (
                          <DropdownMenuItem disabled={isMe} onClick={() => setLifecycle({ action: "suspend", user: p })}>
                            Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => callAction({ action: "restore", user_id: p.id }, "User restored")}>
                            Restore
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem disabled={isMe} onClick={() => setLifecycle({ action: "revoke", user: p })}>
                          Revoke access
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={isMe}
                          className="text-destructive"
                          onClick={() => setLifecycle({ action: "delete", user: p })}
                        >Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="mt-4 text-xs text-muted-foreground flex items-start gap-2">
          <UserCog className="size-3.5 mt-0.5 shrink-0" />
          <p>Roles control access: <b>Administrator</b> manages everything · <b>Edit</b> users can add clients, upload documents and fill all details · <b>Viewer</b> is read-only. Users only see clients they own, are assigned to, or have been shared via team or per-client access.</p>
        </div>
      </div>
      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} onCreated={load} />
      {lifecycle && (
        <HandleUserDataDialog
          open={!!lifecycle}
          onOpenChange={(o) => { if (!o) setLifecycle(null); }}
          action={lifecycle.action}
          userId={lifecycle.user.id}
          userName={lifecycle.user.full_name ?? lifecycle.user.email ?? ""}
          candidates={candidatesFor(lifecycle.user.id)}
          onDone={load}
        />
      )}
    </AppLayout>
  );
};

export default Users;