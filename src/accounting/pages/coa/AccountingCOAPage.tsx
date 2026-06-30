import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Layers,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingBreadcrumbs from "../../components/shared/AccountingBreadcrumbs";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import AccountingTableSkeleton from "../../components/shared/AccountingTableSkeleton";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import DarkModeToggle from "../../components/shared/DarkModeToggle";
import AccountFormDialog from "../../components/coa/AccountFormDialog";
import AccountDetailDrawer from "../../components/coa/AccountDetailDrawer";
import CoaAccountsTable from "../../components/coa/CoaAccountsTable";
import { useAccounts, deleteAccount } from "../../stores/coaStore";
import { useGroups, useTypes } from "../../stores/coaMasterStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { CoaAccount } from "../../types/coa";
import { useCan } from "../../hooks/usePermission";
import { accountMatchesBusinessSearch, COA_PAGE_INTRO } from "../../lib/coaUxHelpers";
import CoaReadOnlyBanner from "../../components/coa/CoaReadOnlyBanner";

const ALL = "__all__";

export default function AccountingCOAPage() {
  const accounts = useAccounts();
  const groups = useGroups();
  const types = useTypes();
  const entities = useScopedEntities();
  const { isAdmin: canEditCoa } = useCan();

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [entityFilter, setEntityFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "INACTIVE">("all");
  const [currencyFilter, setCurrencyFilter] = useState(ALL);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CoaAccount | null>(null);
  const [forcedParent, setForcedParent] = useState<string | null>(null);
  const [detail, setDetail] = useState<CoaAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoaAccount | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(accounts.map((a) => a.id)));

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      accounts.forEach((a) => next.add(a.id));
      return next;
    });
  }, [accounts]);

  const accountById = useMemo(() => {
    const m = new Map<string, CoaAccount>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesDirect = (a: CoaAccount) => {
      if (groupFilter !== ALL && a.groupCode !== groupFilter) return false;
      if (typeFilter !== ALL && a.typeCode !== typeFilter) return false;
      if (entityFilter !== ALL) {
        if (entityFilter === "__none__" ? a.entityId !== null : a.entityId !== entityFilter) return false;
      }
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (currencyFilter !== ALL && a.currency !== currencyFilter) return false;
      if (q && !accountMatchesBusinessSearch(a, q, groups, types)) return false;
      return true;
    };
    // Include ancestors of matches so the tree stays connected
    const keep = new Set<string>();
    accounts.forEach((a) => {
      if (matchesDirect(a)) {
        keep.add(a.id);
        let p = a.parentId;
        while (p) {
          keep.add(p);
          p = accountById.get(p)?.parentId ?? null;
        }
      }
    });
    return accounts.filter((a) => keep.has(a.id));
  }, [accounts, accountById, search, groupFilter, typeFilter, entityFilter, statusFilter, currencyFilter, groups, types]);

  const visibleRows = useMemo(() => {
    return filtered.filter((a) => {
      let parentId = a.parentId;
      while (parentId) {
        if (!expandedIds.has(parentId)) return false;
        parentId = accountById.get(parentId)?.parentId ?? null;
      }
      return true;
    });
  }, [filtered, expandedIds, accountById]);

  const kpis = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((a) => a.status === "ACTIVE").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [accounts]);

  // Reset type filter when group filter changes
  useEffect(() => {
    setTypeFilter(ALL);
  }, [groupFilter]);

  const [formMode, setFormMode] = useState<"ledger" | "group" | "any">("any");
  const openNew = (mode: "ledger" | "group" | "any" = "any") => {
    setFormMode(mode);
    setEditing(null);
    setForcedParent(null);
    setFormOpen(true);
  };
  const openEdit = (a: CoaAccount) => {
    setEditing(a);
    setForcedParent(null);
    setFormOpen(true);
    setDetail(null);
  };
  const openAddChild = (a: CoaAccount) => {
    setEditing(null);
    setForcedParent(a.id);
    setFormOpen(true);
    setDetail(null);
  };

  useKeyboardShortcuts({ onNew: canEditCoa ? openNew : undefined });

  const onConfirmDelete = () => {
    if (!deleteTarget) return;
    const result = deleteAccount(deleteTarget.id);
    if (!result.ok) toast.error(result.error ?? "Cannot delete account");
    else toast.success(`Account "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  const expandAll = () => setExpandedIds(new Set(accounts.map((a) => a.id)));
  const collapseAll = () => {
    const roots = new Set(accounts.filter((a) => !a.parentId).map((a) => a.id));
    setExpandedIds(roots);
  };

  const filtersActive =
    search ||
    groupFilter !== ALL ||
    typeFilter !== ALL ||
    entityFilter !== ALL ||
    statusFilter !== "all" ||
    currencyFilter !== ALL;
  const currencies = Array.from(new Set(accounts.map((a) => a.currency))).sort();

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingBreadcrumbs items={[{ label: "Finance", to: "/accounting" }, { label: "Account setup" }]} />
        <AccountingPageHeader
          title="Account setup"
          subtitle={COA_PAGE_INTRO}
          actions={
            <>
              <DarkModeToggle />
              {canEditCoa && (
                <>
                  <Button variant="outline" onClick={() => openNew("group")}>
                    <Plus className="size-4 mr-1" /> New group header
                  </Button>
                  <Button onClick={() => openNew("ledger")}>
                    <Plus className="size-4 mr-1" /> New account
                  </Button>
                </>
              )}
            </>
          }
        />

        {!canEditCoa && <CoaReadOnlyBanner />}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <AccountingKPICard label="Total accounts" value={String(kpis.total)} icon={Layers} />
          <AccountingKPICard label="Active accounts" value={String(kpis.active)} icon={Layers} />
          <AccountingKPICard label="Inactive accounts" value={String(kpis.inactive)} icon={Layers} />
        </div>

        <Card className="p-5 shadow-elev-sm">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-search
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code, or term (e.g. tuition, tax, commission)…"
                className="pl-8 h-9"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.code} value={g.code}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {types
                  .filter((t) => groupFilter === ALL || t.groupCode === groupFilter)
                  .map((t) => (
                    <SelectItem key={t.code} value={t.code}>
                      {t.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                <SelectItem value="__none__">All-entity accounts</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All currencies</SelectItem>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-9" onClick={expandAll}>
                <ChevronDown className="size-3.5 mr-1" /> Expand
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={collapseAll}>
                <ChevronRight className="size-3.5 mr-1" /> Collapse
              </Button>
            </div>
          </div>

          {loading ? (
            <AccountingTableSkeleton rows={8} cols={8} />
          ) : filtered.length === 0 ? (
            <AccountingEmptyState
              icon={Layers}
              title={filtersActive ? "No accounts match your filters" : "No accounts yet"}
              description={
                filtersActive
                  ? "Try clearing some filters or searching for a different code."
                  : "Create your first account to start tracking balances."
              }
              action={
                !filtersActive && canEditCoa ? (
                  <Button size="sm" onClick={openNew}>
                    <Plus className="size-4 mr-1" /> New account
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <CoaAccountsTable
              rows={visibleRows}
              accountById={accountById}
              allAccounts={accounts}
              expandedIds={expandedIds}
              onToggleExpanded={toggleExpanded}
              groups={groups}
              entities={entities}
              onRowClick={setDetail}
            />
          )}
        </Card>

        <AccountFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={editing}
          forcedParentId={forcedParent}
          mode={editing ? "any" : formMode}
        />

        <AccountDetailDrawer
          account={detail}
          onOpenChange={(v) => {
            if (!v) setDetail(null);
          }}
          readOnly={!canEditCoa}
          onEdit={openEdit}
          onAddChild={openAddChild}
          onDelete={(a) => setDeleteTarget(a)}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
          }}
          title="Delete account?"
          description={
            deleteTarget
              ? `This will permanently remove "${deleteTarget.code} · ${deleteTarget.name}" from the chart of accounts.`
              : ""
          }
          confirmLabel="Delete account"
          destructive
          onConfirm={onConfirmDelete}
        />
      </div>
    </AppLayout>
  );
}
