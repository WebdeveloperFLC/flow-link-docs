import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck, ShieldOff, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingBreadcrumbs from "../../components/shared/AccountingBreadcrumbs";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import DarkModeToggle from "../../components/shared/DarkModeToggle";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import InviteUserDialog from "../../components/settings/InviteUserDialog";
import RoleBadge from "../../components/settings/RoleBadge";
import { AccountingUser } from "../../types/accountingUsers";
import { useEntities } from "../../stores/accountingEntitiesStore";
import { toast } from "sonner";
import type { ColDef } from "ag-grid-community";

export default function AccountingUsersPage() {
  const entities = useEntities();
  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;

  const [users, setUsers] = useState<AccountingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<AccountingUser | null>(null);

  const mapRow = (r: any): AccountingUser => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    entityScope: r.entity_scope ?? ["*"],
    mfaEnabled: !!r.mfa_enabled,
    lastLogin: r.last_login ?? undefined,
    status: r.status,
  });

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accounting_users" as any)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setUsers([]);
    } else {
      setUsers((data ?? []).map(mapRow));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const cols: ColDef<AccountingUser>[] = [
    {
      headerName: "User", field: "name", flex: 2, minWidth: 240,
      cellRenderer: (p: { data: AccountingUser }) => {
        const initials = p.data.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
        return (
          <div className="flex items-center gap-2 h-full">
            <div className="size-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">{initials}</div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium leading-tight truncate">{p.data.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{p.data.email}</div>
            </div>
          </div>
        );
      },
    },
    { headerName: "Role", field: "role", flex: 1, minWidth: 160,
      cellRenderer: (p: { value: AccountingUser["role"] }) => <RoleBadge role={p.value} /> },
    { headerName: "Entity scope", field: "entityScope", flex: 2, minWidth: 200,
      valueFormatter: (p) => {
        const v = p.value as string[];
        if (v.includes("*")) return "All entities";
        return v.map(entityName).join(", ");
      } },
    { headerName: "MFA", field: "mfaEnabled", flex: 0.6, minWidth: 80,
      cellRenderer: (p: { value: boolean }) => p.value
        ? <span className="inline-flex items-center gap-1 text-[12px] text-green-700 dark:text-green-400"><ShieldCheck className="size-3.5" /> On</span>
        : <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground"><ShieldOff className="size-3.5" /> Off</span> },
    { headerName: "Last login", field: "lastLogin", flex: 1, minWidth: 140,
      valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "—" },
    { headerName: "Status", field: "status", flex: 0.8, minWidth: 110,
      cellRenderer: (p: { value: AccountingUser["status"] }) => {
        const map: Record<AccountingUser["status"], string> = {
          ACTIVE: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
          INVITED: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
          SUSPENDED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
        };
        return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${map[p.value]}`}>{p.value.charAt(0) + p.value.slice(1).toLowerCase()}</span>;
      } },
    { headerName: "Actions", field: "id", flex: 0.8, minWidth: 110, sortable: false, filter: false,
      cellRenderer: (p: { data: AccountingUser }) => (
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmTarget(p.data)}>
          {p.data.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
        </Button>
      ) },
  ];

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingBreadcrumbs items={[{ label: "Accounting", to: "/accounting" }, { label: "Settings" }, { label: "Users & roles" }]} />
        <AccountingPageHeader
          title="Users & roles"
          subtitle="Manage who can access accounting and what they can do"
          actions={
            <>
              <DarkModeToggle />
              <Button onClick={() => setInviteOpen(true)}><Plus className="size-4 mr-1" /> Invite user</Button>
            </>
          }
        />
        <Card className="p-5 shadow-elev-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading users...
            </div>
          ) : users.length === 0 ? (
            <AccountingEmptyState
              icon={UserPlus}
              title="No users yet"
              description="Add the first admin to start managing access. The first account you create becomes Super admin."
              action={<Button size="sm" onClick={() => setInviteOpen(true)}><Plus className="size-4 mr-1" /> Add user</Button>}
            />
          ) : (
            <AccountingAGGrid rowData={users} columnDefs={cols} height={560} rowHeight={56} />
          )}
        </Card>

        <InviteUserDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onCreated={(u) => setUsers((prev) => [...prev, u])}
        />
        <ConfirmDialog
          open={!!confirmTarget}
          onOpenChange={(v) => { if (!v) setConfirmTarget(null); }}
          title={confirmTarget?.status === "SUSPENDED" ? "Reactivate user?" : "Suspend user?"}
          description={confirmTarget?.status === "SUSPENDED"
            ? `${confirmTarget?.name} will regain access to accounting.`
            : `${confirmTarget?.name} will lose access until reactivated.`}
          confirmLabel={confirmTarget?.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
          destructive={confirmTarget?.status !== "SUSPENDED"}
          onConfirm={async () => {
            if (!confirmTarget) return;
            const newStatus = confirmTarget.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
            const { data, error } = await supabase.functions.invoke("accounting-update-user", {
              body: { id: confirmTarget.id, status: newStatus },
            });
            if (error || data?.error) {
              toast.error(error?.message ?? data?.error ?? "Update failed");
              return;
            }
            setUsers((prev) => prev.map((u) => u.id === confirmTarget.id ? { ...u, status: newStatus } : u));
            toast.success("User updated");
            setConfirmTarget(null);
          }}
        />
      </div>
    </AppLayout>
  );
}