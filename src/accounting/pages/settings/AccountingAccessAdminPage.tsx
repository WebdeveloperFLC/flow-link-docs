import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ShieldCheck, History, Search, RefreshCw, ChevronDown } from "lucide-react";
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
import DataAccessPanel from "../../components/settings/DataAccessPanel";

type UserPermsRow = AccountingUser & { perms: AcctPermissionMap; dirty: boolean; saving?: boolean };

const ASSIGNABLE = ACCT_MODULES.filter((m) => !m.adminOnly);

// Visual grouping of sections for the vertical layout
const SECTION_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Core",                  keys: ["dashboard", "coa", "journals"] },
  { label: "Transactions",          keys: ["ap", "ar", "vendors", "clients_link", "reimbursements", "intercompany"] },
  { label: "Banking & Cash",        keys: ["bank", "card_recon", "petty_cash"] },
  { label: "Setup & Documents",     keys: ["entities", "masters", "documents", "approvals", "tax"] },
  { label: "Reports",               keys: ["reports_reconciliation", "reports_consolidated", "reports_financials"] },
  { label: "Other",                 keys: ["fraud", "ai", "owners", "onboarding", "users"] },
];

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const loadAll = async () => {
    if (!isAdmin) return; // hardening: never fetch for non-admins
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
    // Auto-expand first non-admin user
    const firstNonAdmin = rows.find((r) => !isAdminRole(r.role));
    if (firstNonAdmin) setExpandedIds(new Set([firstNonAdmin.id]));
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
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId || isAdminRole(u.role)) return u;
      const def = ACCT_ROLE_DEFAULTS[u.role] ?? acctEmptyMap();
      return { ...u, perms: resolveDependencies({ ...def }), dirty: true };
    }));
  };

  const revokeAll = (userId: string) => {
    if (!isAdmin) return;
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId || isAdminRole(u.role)) return u;
      return { ...u, perms: acctEmptyMap(), dirty: true };
    }));
  };

  const saveRow = async (row: UserPermsRow) => {
    if (!isAdmin) return;
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

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-5 max-w-5xl">
        <AccountingBreadcrumbs items={[{ label: "Accounting", to: "/accounting" }, { label: "Access management" }]} />
        <AccountingPageHeader
          title="User & Access Management"
          subtitle="Grant per-section View / Edit access. Admins always have full access. Granting a section auto-grants its dependencies."
          actions={<Button variant="outline" size="sm" onClick={loadAll}><RefreshCw className="size-4 mr-1" /> Refresh</Button>}
        />

        <Card className="p-3 shadow-elev-sm">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="max-w-sm" />
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading users and permissions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center">No users match your search.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <UserCard
                key={u.id}
                row={u}
                expanded={expandedIds.has(u.id)}
                onToggleExpand={() => toggleExpanded(u.id)}
                onToggle={toggle}
                onReset={() => resetRow(u.id)}
                onRevoke={() => revokeAll(u.id)}
                onSave={() => saveRow(u)}
                onAudit={() => setAuditFor(u)}
              />
            ))}
          </div>
        )}

        <AuditDrawer row={auditFor} onClose={() => setAuditFor(null)} />
      </div>
    </AppLayout>
  );
}

interface UserCardProps {
  row: UserPermsRow;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggle: (userId: string, modKey: string, level: "view" | "edit", value: boolean) => void;
  onReset: () => void;
  onRevoke: () => void;
  onSave: () => void;
  onAudit: () => void;
}

function UserCard({ row, expanded, onToggleExpand, onToggle, onReset, onRevoke, onSave, onAudit }: UserCardProps) {
  const admin = isAdminRole(row.role);
  const grantedCount = ASSIGNABLE.filter((m) => row.perms[m.key]?.view).length;
  const editableCount = ASSIGNABLE.filter((m) => row.perms[m.key]?.edit).length;

  return (
    <Card className="shadow-elev-sm overflow-hidden">
      <Collapsible open={expanded} onOpenChange={onToggleExpand}>
        <div className="flex items-center justify-between gap-3 p-4">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-3 flex-1 text-left min-w-0">
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{row.name}</span>
                  <RoleBadge role={row.role} />
                </div>
                <div className="text-[12px] text-muted-foreground truncate">{row.email}</div>
              </div>
              <div className="text-[11px] text-muted-foreground hidden sm:block">
                {admin ? "All sections" : `${grantedCount} view · ${editableCount} edit`}
              </div>
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {admin ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-primary px-2">
                <ShieldCheck className="size-3.5" /> Full access (locked)
              </span>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={onAudit} title="History">
                  <History className="size-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={onReset}>Reset</Button>
                <Button size="sm" variant="ghost" onClick={onRevoke}>Revoke all</Button>
                <Button size="sm" disabled={!row.dirty || row.saving} onClick={onSave}>
                  {row.saving ? "Saving…" : row.dirty ? "Save" : "Saved"}
                </Button>
              </>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t bg-muted/20 px-4 py-3">
            {admin ? (
              <div className="space-y-3">
                <div className="text-[12px] text-muted-foreground py-2">
                  Admin roles automatically have full View, Edit, and Delete on every section.
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Data Access</div>
                  <div className="rounded-md border bg-background p-3">
                    <DataAccessPanel accountingUserId={row.id} isAdminRole={true} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {SECTION_GROUPS.map((g) => {
                  const keys = g.keys.filter((k) => ACCT_MODULE_BY_KEY[k] && !ACCT_MODULE_BY_KEY[k].adminOnly);
                  if (!keys.length) return null;
                  return (
                    <div key={g.label}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">{g.label}</div>
                      <div className="rounded-md border bg-background overflow-hidden">
                        <div className="grid grid-cols-[1fr_64px_64px] items-center px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/40 border-b">
                          <div>Section</div>
                          <div className="text-center">View</div>
                          <div className="text-center">Edit</div>
                        </div>
                        {keys.map((k) => {
                          const m = ACCT_MODULE_BY_KEY[k];
                          const p = row.perms[k] ?? { view: false, edit: false, delete: false };
                          const deps = autoGrantsFor(k);
                          return (
                            <div key={k} className="grid grid-cols-[1fr_64px_64px] items-center px-3 py-2 border-t first:border-t-0 text-[13px] hover:bg-muted/30">
                              <div className="min-w-0 pr-2">
                                <div className="truncate">{m.label}</div>
                                {deps.length > 0 && (
                                  <div className="text-[10.5px] text-muted-foreground truncate">Auto-grants: {deps.join(", ")}</div>
                                )}
                              </div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={p.view}
                                  onCheckedChange={(v) => onToggle(row.id, k, "view", !!v)}
                                />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={p.edit}
                                  onCheckedChange={(v) => onToggle(row.id, k, "edit", !!v)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Data Access</div>
                  <div className="rounded-md border bg-background p-3">
                    <DataAccessPanel accountingUserId={row.id} isAdminRole={false} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
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
