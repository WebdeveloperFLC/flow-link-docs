import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { Navigate } from "react-router-dom";
import { Shield, UserCog } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { cn } from "@/lib/utils";

interface Profile { id: string; email: string | null; full_name: string | null; }
interface RoleRow { user_id: string; role: AppRole; }

const ALL_ROLES: AppRole[] = ["admin", "counselor", "documentation", "viewer"];

const Users = () => {
  const { isAdmin, user, loading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name").order("email"),
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

  return (
    <AppLayout>
      <PageHeader
        title="Team & roles"
        description="Assign roles to team members. Only admins can change permissions."
      />
      <div className="p-8">
        <Card className="overflow-hidden shadow-elev-sm">
          <div className="grid grid-cols-12 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
            <div className="col-span-5">User</div>
            <div className="col-span-3">Current role</div>
            <div className="col-span-4">Change role</div>
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
              return (
                <div key={p.id} className="grid grid-cols-12 px-6 py-3.5 items-center">
                  <div className="col-span-5 min-w-0">
                    <div className="font-medium text-sm truncate">{p.full_name ?? p.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                  </div>
                  <div className="col-span-3">
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider", ROLE_COLORS[primary])}>
                      <Shield className="size-2.5" />
                      {ROLE_LABELS[primary]}
                    </span>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Select value={primary} onValueChange={(v) => setRole(p.id, v as AppRole)} disabled={busy === p.id}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {p.id === user?.id && <span className="text-[10px] text-muted-foreground">(you)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="mt-4 text-xs text-muted-foreground flex items-start gap-2">
          <UserCog className="size-3.5 mt-0.5 shrink-0" />
          <p>Roles control access: <b>Admins</b> manage everything · <b>Counselors</b> create/edit clients & upload · <b>Documentation</b> uploads & generates binders · <b>Viewers</b> read-only.</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Users;