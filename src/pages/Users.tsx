import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { Navigate } from "react-router-dom";
import { Shield, UserCog, Plus, MoreHorizontal, Eye, EyeOff, KeyRound, ChevronDown, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { cn } from "@/lib/utils";
import { callAdminUsers } from "@/lib/adminUsers";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { HandleUserDataDialog, LifecycleAction } from "@/components/users/HandleUserDataDialog";
import { UserPermissionsDialog } from "@/components/users/UserPermissionsDialog";
import { ModuleAccessCard } from "@/components/users/ModuleAccessCard";

interface Profile { id: string; email: string | null; full_name: string | null; status?: string | null; }
interface RoleRow { user_id: string; role: AppRole; }

const ALL_ROLES: AppRole[] = ["admin", "commission_admin", "counselor", "documentation", "telecaller", "viewer"];

// Highest-privilege role wins for the "Reset to role defaults" hint in the
// permissions dialog.
const ROLE_PRIORITY: AppRole[] = ["admin", "commission_admin", "counselor", "documentation", "telecaller", "viewer", "client"];
const highestRole = (rs: AppRole[]): AppRole =>
  ROLE_PRIORITY.find((r) => rs.includes(r)) ?? "viewer";

const ROLE_HELP: Record<AppRole, string> = {
  admin: "Full system access, settings and team role management",
  commission_admin: "Full access to commissions, claims, agreements and invoicing",
  counselor: "Edit access: add clients, upload documents and fill client details",
  documentation: "Edit access: add clients, upload documents and fill client details",
  telecaller: "Lead calling and remarks; can hand leads to counselors",
  viewer: "View-only access",
  client: "Client portal access only",
};

const ROLE_SHORT: Record<AppRole, string> = {
  admin: "Full system access",
  commission_admin: "Commission admin",
  counselor: "Edit access",
  documentation: "Edit access",
  telecaller: "Telecaller",
  viewer: "View-only access",
  client: "Client portal access only",
};

const roleOptionLabel = (role: AppRole) => {
  if (role === "counselor") return "Edit - Counselor";
  if (role === "documentation") return "Edit - Documentation";
  if (role === "telecaller") return "Telecaller";
  if (role === "commission_admin") return "Commission admin";
  return ROLE_LABELS[role];
};

const Users = () => {
  const { isAdmin, user, loading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [lifecycle, setLifecycle] = useState<{ action: LifecycleAction; user: Profile } | null>(null);
  const [resetUser, setResetUser] = useState<Profile | null>(null);
  const [permsUser, setPermsUser] = useState<Profile | null>(null);
  const [newPw, setNewPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

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

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (q) {
        const userRoles = rolesFor(p.id);
        const roleText = userRoles.flatMap((r) => [r, roleOptionLabel(r), ROLE_LABELS[r], ROLE_SHORT[r]]).join(" ");
        const hay = `${p.full_name ?? ""} ${p.email ?? ""} ${p.status ?? "active"} ${roleText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const userRoles = rolesFor(p.id);
      if (roleFilter.length && !roleFilter.some((r) => userRoles.includes(r))) return false;
      const st = p.status ?? "active";
      if (statusFilter.length && !statusFilter.includes(st)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, roles, query, roleFilter, statusFilter]);

  const filtersActive = query.length > 0 || roleFilter.length > 0 || statusFilter.length > 0;

  const updateUserRoles = async (uid: string, next: AppRole[]) => {
    const nextSet = Array.from(new Set(next));
    if (nextSet.length === 0) { toast.error("Select at least one role"); return; }
    // Last-admin guard: prevent removing admin from the last admin globally.
    const current = rolesFor(uid);
    const removingAdmin = current.includes("admin") && !nextSet.includes("admin");
    if (removingAdmin) {
      const otherAdmins = roles.some((r) => r.role === "admin" && r.user_id !== uid);
      if (!otherAdmins) { toast.error("Cannot demote the last admin"); return; }
    }
    setBusy(uid);
    try {
      const toAdd = nextSet.filter((r) => !current.includes(r));
      const toRemove = current.filter((r) => !nextSet.includes(r));
      if (toRemove.length) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).in("role", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase.from("user_roles").insert(toAdd.map((role) => ({ user_id: uid, role })));
        if (error) throw error;
      }
      await logActivity("user.roles_changed", "user", uid, { roles: nextSet });
      toast.success("Roles updated");
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to update roles");
    } finally {
      setBusy(null);
    }
  };

  const callAction = async (body: Record<string, unknown>, successMsg: string) => {
    try {
      await callAdminUsers(body);
      toast.success(successMsg);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
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
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, role, status…"
              className="pl-8 h-9"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                Role{roleFilter.length ? ` · ${roleFilter.length}` : ""}
                <ChevronDown className="size-3.5 ml-1 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              {ALL_ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                  <Checkbox
                    checked={roleFilter.includes(r)}
                    onCheckedChange={(v) =>
                      setRoleFilter((prev) => (v ? [...prev, r] : prev.filter((x) => x !== r)))
                    }
                  />
                  {roleOptionLabel(r)}
                </label>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                Status{statusFilter.length ? ` · ${statusFilter.length}` : ""}
                <ChevronDown className="size-3.5 ml-1 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-44 p-2">
              {(["active", "suspended", "revoked"] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm capitalize">
                  <Checkbox
                    checked={statusFilter.includes(s)}
                    onCheckedChange={(v) =>
                      setStatusFilter((prev) => (v ? [...prev, s] : prev.filter((x) => x !== s)))
                    }
                  />
                  {s}
                </label>
              ))}
            </PopoverContent>
          </Popover>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={() => { setQuery(""); setRoleFilter([]); setStatusFilter([]); }}
            >
              <X className="size-3.5 mr-1" /> Clear
            </Button>
          )}
          <div className="text-xs text-muted-foreground ml-1">
            {filteredProfiles.length} of {profiles.length}
          </div>
          <div className="flex-1" />
          <Button onClick={() => setAddOpen(true)} className="gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-1" /> Add new user
          </Button>
        </div>
        <div className="mb-6">
          <div className="mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Section access
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Institutions, Commissions and the Digital Success Hub are managed independently. Grant or revoke access per teammate below.
            </p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ModuleAccessCard
              module="institutions"
              title="Institutions section"
              description="Who can view or manage partner institutions, programs and related details."
              profiles={profiles}
              roles={roles}
            />
            <ModuleAccessCard
              module="commissions"
              title="Commissions section"
              description="Who can view or manage commissions, claims, agreements and invoicing."
              profiles={profiles}
              roles={roles}
            />
            <ModuleAccessCard
              module="digital_success_hub"
              title="Digital Success Hub"
              description="Who can view or manage promotional media, AI Studio assets, client links, and branch notifications."
              profiles={profiles}
              roles={roles}
            />
          </div>
        </div>
        <Card className="overflow-hidden shadow-elev-sm">
          <div className="grid grid-cols-[minmax(0,3fr)_110px_minmax(0,2fr)_minmax(0,2fr)_60px] gap-4 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
            <div>User</div>
            <div>Status</div>
            <div>Roles</div>
            <div>Assign roles</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y">
            {filteredProfiles.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                {profiles.length === 0
                  ? "No team members yet. Invite people by sharing the sign-up link."
                  : "No users match the current filters."}
              </div>
            )}
            {filteredProfiles.map((p) => {
              const userRoles = rolesFor(p.id);
              const primary = highestRole(userRoles.length ? userRoles : ["viewer"]);
              const isMe = p.id === user?.id;
              const status = p.status ?? "active";
              return (
                <div key={p.id} className="grid grid-cols-[minmax(0,3fr)_110px_minmax(0,2fr)_minmax(0,2fr)_60px] gap-4 px-6 py-3.5 items-center">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-1.5">
                      <span className="truncate">{p.full_name ?? p.email}</span>
                      {isMe && <span className="text-[10px] text-muted-foreground shrink-0">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                  </div>
                  <div>{statusBadge(status)}</div>
                  <div className="min-w-0 flex flex-wrap gap-1">
                    {(userRoles.length ? userRoles : ["viewer" as AppRole]).map((r) => (
                      <span key={r} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider", ROLE_COLORS[r])}>
                        <Shield className="size-2.5 shrink-0" />
                        <span className="truncate">{roleOptionLabel(r)}</span>
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" disabled={busy === p.id} className="h-9 w-full justify-between text-xs font-normal">
                          <span className="truncate">
                            {userRoles.length === 0
                              ? "No roles"
                              : userRoles.length === 1
                                ? roleOptionLabel(userRoles[0])
                                : `${userRoles.length} roles`}
                          </span>
                          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-2">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 pt-1 pb-2">
                          Assign one or more roles
                        </div>
                        <div className="space-y-1">
                          {ALL_ROLES.map((r) => {
                            const checked = userRoles.includes(r);
                            return (
                              <label key={r} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                                <Checkbox
                                  checked={checked}
                                  disabled={busy === p.id}
                                  onCheckedChange={(v) => {
                                    const next = v
                                      ? [...userRoles, r]
                                      : userRoles.filter((x) => x !== r);
                                    updateUserRoles(p.id, next);
                                  }}
                                />
                                <span className="flex flex-col">
                                  <span className="text-sm">{roleOptionLabel(r)}</span>
                                  <span className="text-[10px] text-muted-foreground leading-tight">{ROLE_HELP[r]}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setPermsUser(p)}
                        ><KeyRound className="size-3.5 mr-2" /> Module access</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { setResetUser(p); setNewPw(""); setShowNewPw(false); }}
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
          <p>
            Users can hold <b>multiple roles</b> at once (e.g. Counselor + Documentation). Tick all that apply in <b>Assign roles</b>.{" "}
            <b>Administrator</b> manages the CRM (clients, documents, telephony, settings).{" "}
            <b>Commission admin</b> manages commissions, claims, agreements and invoicing.{" "}
            <b>Accounting</b> access is managed separately in <code>/accounting/settings/users</code>.{" "}
            <b>Edit</b> users add clients/documents · <b>Viewer</b> is read-only. Use <b>Module access</b> to grant per-section View / Edit / Delete — including <b>Institutions</b> and <b>Commissions</b> independently.
          </p>
        </div>
      </div>
      <Dialog open={!!resetUser} onOpenChange={(o) => { if (!o) setResetUser(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reset password</DialogTitle></DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!resetUser) return;
              if (newPw.length < 8 || newPw.length > 72) { toast.error("Password must be 8–72 characters"); return; }
              setResetBusy(true);
              try {
                await callAdminUsers({ action: "reset_password", user_id: resetUser.id, password: newPw });
                toast.success("Password updated");
                setResetUser(null);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Password update failed");
              } finally {
                setResetBusy(false);
              }
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Set a new password for <b>{resetUser?.full_name ?? resetUser?.email}</b>. The user will need to sign in with this password.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="rp-pw">New password</Label>
              <div className="relative">
                <Input id="rp-pw" type={showNewPw ? "text" : "password"} required minLength={8} maxLength={72} value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
                <button type="button" onClick={() => setShowNewPw((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetUser(null)}>Cancel</Button>
              <Button type="submit" disabled={resetBusy}>{resetBusy ? "Updating…" : "Update password"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} onCreated={load} />
      {permsUser && (
        <UserPermissionsDialog
          open={!!permsUser}
          onOpenChange={(o) => { if (!o) setPermsUser(null); }}
          userId={permsUser.id}
          userName={permsUser.full_name ?? permsUser.email ?? ""}
          role={highestRole(rolesFor(permsUser.id).length ? rolesFor(permsUser.id) : ["viewer"]) as AppRole}
        />
      )}
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