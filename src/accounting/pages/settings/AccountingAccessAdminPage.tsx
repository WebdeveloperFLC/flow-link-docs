import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, ShieldCheck, History, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingBreadcrumbs from "../../components/shared/AccountingBreadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACCT_MODULES,
  ACCT_MODULE_BY_KEY,
  ACCT_ROLE_DEFAULTS,
  AcctPermissionMap,
  acctEmptyMap,
  autoGrantsFor,
  fetchAcctPermissions,
  resolveDependencies,
  saveAcctPermissions,
} from "../../lib/accountingModulePermissions";
import { AccountingUser, AccountingRole } from "../../types/accountingUsers";
import { refreshAccountingPermissions, useCan } from "../../hooks/usePermission";
import { Navigate } from "react-router-dom";
import RoleBadge from "../../components/settings/RoleBadge";

type UserPermsRow = AccountingUser & { perms: AcctPermissionMap; dirty: boolean; saving?: boolean };

const ASSIGNABLE = ACCT_MODULES.filter((m) => !m.adminOnly);

function isAdminRole(r: AccountingRole) {
  return r === "SUPER_ADMIN" || r === "FINANCE_ADMIN";
}

export default function AccountingAccessAdminPage() {
  const { user } = useAuth();
  const { isAdmin, loading: permsLoading } = useCan();
  const [users, setUsers] = useState<UserPermsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [auditFor, setAuditFor] = useState<UserPermsRow | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accounting_users" as any)
      .select("id, name, email, role, status, entity_scope, mfa_enabled, last_login")
      .order("created_at", { ascending: true });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const rows: UserPermsRow[] = [];
    for (const r of (data ?? []) as any[]) {
      const u: AccountingUser = {
        id: r.id, name: r.name, email: r.email, role: r.role,
        entityScope: r.entity_scope ?? ["*"], mfaEnabled: !!r.mfa_enabled,
        lastLogin: r.last_login ?? undefined, status: r.status,
      };
      let perms: AcctPermissionMap;
      if (isAdminRole(u.role)) {
        perms = acctEmptyMap();
        for (const m of ACCT_MODULES) perms[m.key] = { view: true, edit: true, delete: true };
      } else {
        try { perms = await fetchAcctPermissions(u.id); }
        catch { perms = acctEmptyMap(); }
      }
      rows.push({ ...u, perms, dirty: false });
    }
    setUsers(rows);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  if (permsLoading) {
    return <AppLayout><div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div></AppLayout>;
  }
  if (!isAdmin) return <Navigate to="/accounting/no-access?section=access_admin&level=view" replace />;

  const toggle = (userId: string, modKey: string, level: "view" | "edit", value: boolean) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      if (isAdminRole(u.role)) return u;
      const next = { ...u.perms };
      const cur = { ...(next[modKey] ?? { view: false, edit: false, delete: false }) };
      cur[level] = value;
      if (level === "view" && !value) cur.edit = false;
      if (level === "edit" && value) cur.view = true;
      next[modKey] = cur;
      return { ...u, perms: resolveDependencies(next), dirty: true };
    }));
  };

  const resetRow = (userId: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId || isAdminRole(u.role)) return u;
      const def = ACCT_ROLE_DEFAULTS[u.role] ?? acctEmptyMap();
      return { ...u, perms: resolveDependencies({ ...def }), dirty: true };
    }));
  };

  const revokeAll = (userId: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId || isAdminRole(u.role)) return u;
      return { ...u, perms: acctEmptyMap(), dirty: true };
    }));
  };

  const saveRow = async (row: UserPermsRow) => {
    setUsers((p) => p.map((u) => u.id === row.id ? { ...u, saving: true } : u));
    try {
      await saveAcctPermissions(row.id, row.perms);
      toast.success(`Saved permissions for ${row.name}`);
      setUsers((p) => p.map((u) => u.id === row.id ? { ...u, dirty: false, saving: false } : u));
      if (user) refreshAccountingPermissions(user.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
      setUsers((p) => p.map((u) => u.id === row.id ? { ...u, saving: false } : u));
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        <AccountingBreadcrumbs items={[{ label: "Accounting", to: "/accounting" }, { label: "Access management" }]} />
        <AccountingPageHeader
          title="User & Access Management"
          subtitle="Grant per-section View / Edit access. Admins always have full access. Granting a section auto-grants its dependencies."
          actions={<Button variant="outline" size="sm" onClick={loadAll}><RefreshCw className="size-4 mr-1" /> Refresh</Button>}
        />

        <Card className="p-3 shadow-elev-sm">
          <div className="flex items-center gap-2 mb-3">
            <Search className="size-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="max-w-sm" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading users and permissions…
            </div>
          ) : (
            <div className="overflow-auto border rounded-md">
              <table className="text-[12px] w-max min-w-full">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 sticky left-0 z-20 bg-muted/50 min-w-[240px]">User</th>
                    <th className="text-left px-2 py-2 min-w-[140px]">Role</th>
                    {ASSIGNABLE.map((m) => (
                      <th key={m.key} className="text-center px-2 py-2 min-w-[110px]" title={m.label}>
                        <div className="truncate max-w-[110px]">{m.label}</div>
                        <div className="flex justify-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>View</span><span>Edit</span>
                        </div>
                      </th>
                    ))}
                    <th className="text-left px-3 py-2 sticky right-0 bg-muted/50 min-w-[220px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const admin = isAdminRole(u.role);
                    return (
                      <tr key={u.id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2 sticky left-0 bg-background z-10">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-2 py-2"><RoleBadge role={u.role} /></td>
                        {ASSIGNABLE.map((m) => {
                          const p = u.perms[m.key] ?? { view: false, edit: false, delete: false };
                          const deps = autoGrantsFor(m.key);
                          const title = deps.length ? `Auto-grants View on: ${deps.join(", ")}` : undefined;
                          return (
                            <td key={m.key} className="px-2 py-2 text-center" title={title}>
                              <div className="flex justify-center gap-3">
                                <Checkbox checked={admin || p.view} disabled={admin}
                                  onCheckedChange={(v) => toggle(u.id, m.key, "view", !!v)} />
                                <Checkbox checked={admin || p.edit} disabled={admin}
                                  onCheckedChange={(v) => toggle(u.id, m.key, "edit", !!v)} />
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 sticky right-0 bg-background">
                          {admin ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                              <ShieldCheck className="size-3.5" /> Full access (locked)
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => resetRow(u.id)}>Reset</Button>
                              <Button size="sm" variant="ghost" onClick={() => revokeAll(u.id)}>Revoke all</Button>
                              <Button size="sm" variant="ghost" onClick={() => setAuditFor(u)}>
                                <History className="size-3.5" />
                              </Button>
                              <Button size="sm" disabled={!u.dirty || u.saving} onClick={() => saveRow(u)}>
                                {u.saving ? "Saving…" : u.dirty ? "Save" : "Saved"}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <AuditDrawer row={auditFor} onClose={() => setAuditFor(null)} />
      </div>
    </AppLayout>
  );
}

function AuditDrawer({ row, onClose }: { row: UserPermsRow | null; onClose: () => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!row) { setEntries([]); return; }
    setLoading(true);
    supabase
      .from("accounting_access_audit" as any)
      .select("*")
      .eq("target_accounting_user_id", row.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setEntries((data ?? []) as any[]); setLoading(false); });
  }, [row?.id]);

  return (
    <Sheet open={!!row} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Audit — {row?.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</div>
          ) : entries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No changes recorded yet.</div>
          ) : entries.map((e) => (
            <div key={e.id} className="text-[12px] border rounded-md p-2">
              <div className="flex justify-between text-muted-foreground">
                <span>{new Date(e.created_at).toLocaleString()}</span>
                <span className="uppercase">{e.action}</span>
              </div>
              <div className="font-medium mt-0.5">{ACCT_MODULE_BY_KEY[e.module]?.label ?? e.module}</div>
              <div className="grid grid-cols-2 gap-2 mt-1 text-[11px]">
                <div><div className="text-muted-foreground">Before</div><pre className="bg-muted/40 p-1 rounded">{JSON.stringify(e.before ?? {}, null, 0)}</pre></div>
                <div><div className="text-muted-foreground">After</div><pre className="bg-muted/40 p-1 rounded">{JSON.stringify(e.after ?? {}, null, 0)}</pre></div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}