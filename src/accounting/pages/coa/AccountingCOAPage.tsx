import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Layers, Plus, Search, MoreHorizontal, Pencil, Trash2, Power, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { toast } from "sonner";
import type { ColDef, GridApi, GridReadyEvent, ICellRendererParams } from "ag-grid-community";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingBreadcrumbs from "../../components/shared/AccountingBreadcrumbs";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import AccountingTableSkeleton from "../../components/shared/AccountingTableSkeleton";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import DarkModeToggle from "../../components/shared/DarkModeToggle";
import AccountStatusBadge from "../../components/coa/AccountStatusBadge";
import AccountFormDialog from "../../components/coa/AccountFormDialog";
import AccountDetailDrawer from "../../components/coa/AccountDetailDrawer";
import { useAccounts, deleteAccount, toggleAccountStatus, canDeleteAccount } from "../../stores/coaStore";
import { useGroups, useTypes } from "../../stores/coaMasterStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { CoaAccount } from "../../types/coa";
import { formatCurrency } from "../../lib/format";

const ALL = "__all__";

export default function AccountingCOAPage() {
  const accounts = useAccounts();
  const navigate = useNavigate();
  const groups = useGroups();
  const types = useTypes();
  const entities = useScopedEntities();

  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 200); return () => clearTimeout(t); }, []);

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

  const apiRef = useRef<GridApi<CoaAccount> | null>(null);

  const accountById = useMemo(() => {
    const m = new Map<string, CoaAccount>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  // Build tree path from parentId chain
  const getPath = (a: CoaAccount): string[] => {
    const out: string[] = [];
    let cur: CoaAccount | undefined = a;
    while (cur) {
      out.unshift(`${cur.code} ${cur.name}`);
      cur = cur.parentId ? accountById.get(cur.parentId) : undefined;
    }
    return out;
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
      if (q && !`${a.code} ${a.name}`.toLowerCase().includes(q)) return false;
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
  }, [accounts, accountById, search, groupFilter, typeFilter, entityFilter, statusFilter, currencyFilter]);

  const kpis = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((a) => a.status === "ACTIVE").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [accounts]);

  // Reset type filter when group filter changes
  useEffect(() => { setTypeFilter(ALL); }, [groupFilter]);

  const openNew = () => { setEditing(null); setForcedParent(null); setFormOpen(true); };
  const openEdit = (a: CoaAccount) => { setEditing(a); setForcedParent(null); setFormOpen(true); setDetail(null); };
  const openAddChild = (a: CoaAccount) => { setEditing(null); setForcedParent(a.id); setFormOpen(true); setDetail(null); };

  useKeyboardShortcuts({ onNew: openNew });

  const onConfirmDelete = () => {
    if (!deleteTarget) return;
    const result = deleteAccount(deleteTarget.id);
    if (!result.ok) toast.error(result.error ?? "Cannot delete account");
    else toast.success(`Account "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  const cols: ColDef<CoaAccount>[] = [
    { headerName: "Code", field: "code", minWidth: 100, maxWidth: 120, cellClass: "font-mono text-[12.5px]" },
    {
      headerName: "Type", minWidth: 170, flex: 1,
      valueGetter: (p) => types.find((t) => t.code === p.data?.typeCode)?.label ?? p.data?.typeCode,
    },
    {
      headerName: "Group", minWidth: 140,
      valueGetter: (p) => groups.find((g) => g.code === p.data?.groupCode)?.label ?? p.data?.groupCode,
    },
    {
      headerName: "Parent", minWidth: 200, flex: 1,
      valueGetter: (p) => p.data?.parentId ? accountById.get(p.data.parentId)?.name ?? "—" : "—",
    },
    { headerName: "Currency", field: "currency", minWidth: 100, maxWidth: 110 },
    {
      headerName: "Entity", minWidth: 180, flex: 1,
      valueGetter: (p) => p.data?.entityId ? entities.find((e) => e.id === p.data!.entityId)?.name ?? "—" : "All entities",
    },
    {
      headerName: "Status", field: "status", minWidth: 110, maxWidth: 130,
      cellRenderer: (p: ICellRendererParams<CoaAccount>) => p.data ? <AccountStatusBadge status={p.data.status} /> : null,
    },
    {
      headerName: "Balance", field: "currentBalance", minWidth: 130, type: "rightAligned",
      cellClass: "tabular-nums",
      valueFormatter: (p) => p.data ? formatCurrency(p.value as number, p.data.currency as "CAD" | "USD" | "INR") : "—",
    },
    {
      headerName: "", maxWidth: 56, minWidth: 56, sortable: false, filter: false, resizable: false,
      cellRenderer: (p: ICellRendererParams<CoaAccount>) => {
        if (!p.data) return null;
        const a = p.data;
        const check = canDeleteAccount(a.id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(a)}><Pencil className="size-3.5 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAddChild(a)}><Plus className="size-3.5 mr-2" /> Add child</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/accounting/reports/general-ledger/${a.id}`)}>
                <BookOpen className="size-3.5 mr-2" /> View ledger
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleAccountStatus(a.id); toast.success(`Account ${a.status === "ACTIVE" ? "deactivated" : "activated"}`); }}>
                <Power className="size-3.5 mr-2" /> {a.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!check.canDelete}
                onClick={() => check.canDelete ? setDeleteTarget(a) : toast.error(check.reason ?? "Cannot delete")}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const autoGroupColumnDef: ColDef = {
    headerName: "Account",
    minWidth: 320,
    flex: 2,
    cellRendererParams: {
      suppressCount: true,
      innerRenderer: (p: ICellRendererParams<CoaAccount>) => {
        const a = p.data;
        if (!a) return p.value;
        const isHeader = a.isPostable === false;
        return (
          <span className={isHeader ? "font-semibold" : ""}>
            {a.code} {a.name}
            {isHeader && (
              <span className="ml-2 inline-block text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border">
                Header
              </span>
            )}
          </span>
        );
      },
    },
  };

  const onGridReady = (e: GridReadyEvent<CoaAccount>) => { apiRef.current = e.api; e.api.expandAll(); };
  const expandAll = () => apiRef.current?.expandAll();
  const collapseAll = () => apiRef.current?.collapseAll();

  const filtersActive = search || groupFilter !== ALL || typeFilter !== ALL || entityFilter !== ALL || statusFilter !== "all" || currencyFilter !== ALL;
  const currencies = Array.from(new Set(accounts.map((a) => a.currency))).sort();

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingBreadcrumbs items={[{ label: "Accounting", to: "/accounting" }, { label: "Chart of accounts" }]} />
        <AccountingPageHeader
          title="Chart of accounts"
          subtitle="Hierarchical ledger of every account across entities and currencies"
          actions={
            <>
              <DarkModeToggle />
              <Button onClick={openNew}><Plus className="size-4 mr-1" /> New account</Button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AccountingKPICard label="Total accounts" value={String(kpis.total)} icon={Layers} />
          <AccountingKPICard label="Active" value={String(kpis.active)} icon={Layers} />
          <AccountingKPICard label="Inactive" value={String(kpis.inactive)} icon={Layers} />
          <AccountingKPICard label="Account groups" value={String(groups.length)} icon={Layers} />
        </div>

        <Card className="p-5 shadow-elev-sm">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-search
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code or name…"
                className="pl-8 h-9"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All groups</SelectItem>
                {groups.map((g) => <SelectItem key={g.code} value={g.code}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {types.filter((t) => groupFilter === ALL || t.groupCode === groupFilter).map((t) =>
                  <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                <SelectItem value="__none__">All-entity accounts</SelectItem>
                {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Currency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All currencies</SelectItem>
                {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-9" onClick={expandAll}><ChevronDown className="size-3.5 mr-1" /> Expand</Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={collapseAll}><ChevronRight className="size-3.5 mr-1" /> Collapse</Button>
            </div>
          </div>

          {loading ? (
            <AccountingTableSkeleton rows={8} cols={7} />
          ) : filtered.length === 0 ? (
            <AccountingEmptyState
              icon={Layers}
              title={filtersActive ? "No accounts match your filters" : "No accounts yet"}
              description={filtersActive ? "Try clearing some filters or searching for a different code." : "Create your first account to start tracking balances."}
              action={!filtersActive ? <Button size="sm" onClick={openNew}><Plus className="size-4 mr-1" /> New account</Button> : undefined}
            />
          ) : (
            <AccountingAGGrid<CoaAccount>
              rowData={filtered}
              columnDefs={cols}
              treeData
              getDataPath={(d) => getPath(d as CoaAccount)}
              groupDefaultExpanded={-1}
              autoGroupColumnDef={autoGroupColumnDef as ColDef<CoaAccount>}
              getRowId={(p) => p.data.id}
              onGridReady={onGridReady}
              onRowClicked={(e) => { if (e.data) setDetail(e.data); }}
              height={620}
            />
          )}
        </Card>

        <AccountFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={editing}
          forcedParentId={forcedParent}
        />

        <AccountDetailDrawer
          account={detail}
          onOpenChange={(v) => { if (!v) setDetail(null); }}
          onEdit={openEdit}
          onAddChild={openAddChild}
          onDelete={(a) => setDeleteTarget(a)}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          title="Delete account?"
          description={deleteTarget ? `This will permanently remove "${deleteTarget.code} · ${deleteTarget.name}" from the chart of accounts.` : ""}
          confirmLabel="Delete account"
          destructive
          onConfirm={onConfirmDelete}
        />
      </div>
    </AppLayout>
  );
}
