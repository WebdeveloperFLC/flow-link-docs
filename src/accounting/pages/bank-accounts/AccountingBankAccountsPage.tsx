import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Landmark, Plus, Search, MoreHorizontal, Pencil, Trash2, Power, ExternalLink, Eye } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingBreadcrumbs from "../../components/shared/AccountingBreadcrumbs";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingTableSkeleton from "../../components/shared/AccountingTableSkeleton";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import DarkModeToggle from "../../components/shared/DarkModeToggle";
import BankAccountStatusBadge from "../../components/bank-accounts/BankAccountStatusBadge";
import BankAccountDefaultsBadges from "../../components/bank-accounts/BankAccountDefaultsBadges";
import ReconciliationStatusPill from "../../components/bank-accounts/ReconciliationStatusPill";
import BankAccountFormDialog from "../../components/bank-accounts/BankAccountFormDialog";
import { ownerLabel } from "../../components/bank-accounts/BankAccountFormDialog";
import { useBankAccounts, deleteBankAccount, toggleStatus } from "../../stores/bankAccountsStore";
import { useAccounts } from "../../stores/coaStore";
import { useEntities } from "../../stores/accountingEntitiesStore";
import { useOwners } from "../../stores/ownersStore";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { BankAccount, maskAccountNumber } from "../../types/bankAccounts";

const ALL = "__all__";

export default function AccountingBankAccountsPage() {
  const accounts = useBankAccounts();
  const ledgers = useAccounts();
  const entities = useEntities();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 200); return () => clearTimeout(t); }, []);

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState(ALL);
  const [entityFilter, setEntityFilter] = useState(ALL);
  const [ownerFilter, setOwnerFilter] = useState(ALL);
  const [currencyFilter, setCurrencyFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "INACTIVE">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);

  const ownersList = useOwners();
  const ledgerById = useMemo(() => new Map(ledgers.map((l) => [l.id, l])), [ledgers]);
  const entityById = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const ownerById = useMemo(() => new Map(ownersList.map((o) => [o.id, o])), [ownersList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((b) => {
      if (countryFilter !== ALL && b.country !== countryFilter) return false;
      if (entityFilter !== ALL && b.entityId !== entityFilter) return false;
      if (ownerFilter !== ALL && b.ownerProfileId !== ownerFilter) return false;
      if (currencyFilter !== ALL && b.currency !== currencyFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (q) {
        const hay = `${b.bankName} ${b.nickname} ${b.holderName} ${b.accountNumber}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [accounts, search, countryFilter, entityFilter, ownerFilter, currencyFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((a) => a.status === "ACTIVE").length;
    const reconPending = accounts.filter((a) => a.reconciliationEnabled && a.lastReconciliationStatus !== "MATCHED").length;
    const defaultsCovered = accounts.some((a) => a.isDefaultPayment);
    return { total, active, reconPending, defaultsCovered };
  }, [accounts]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (a: BankAccount) => { setEditing(a); setFormOpen(true); };
  useKeyboardShortcuts({ onNew: openNew });

  const onConfirmDelete = () => {
    if (!deleteTarget) return;
    const result = deleteBankAccount(deleteTarget.id);
    if (!result.ok) toast.error(result.error ?? "Cannot delete");
    else toast.success(`${deleteTarget.nickname} deleted`);
    setDeleteTarget(null);
  };

  const cols: ColDef<BankAccount>[] = [
    {
      headerName: "Nickname", minWidth: 180, flex: 1,
      cellRenderer: (p: ICellRendererParams<BankAccount>) =>
        p.data ? (
          <Link to={`/accounting/bank-accounts/${p.data.id}`} className="font-medium hover:text-primary">
            {p.data.nickname}
          </Link>
        ) : null,
    },
    { headerName: "Bank", field: "bankName", minWidth: 160, flex: 1 },
    {
      headerName: "Account #", minWidth: 130,
      cellClass: "font-mono text-[12.5px] text-muted-foreground",
      valueGetter: (p) => (p.data ? maskAccountNumber(p.data.accountNumber) : ""),
    },
    {
      headerName: "Entity / Branch", minWidth: 200, flex: 1,
      valueGetter: (p) => {
        if (!p.data) return "";
        const ent = entityById.get(p.data.entityId)?.name ?? "—";
        const br = p.data.branchId ? entityById.get(p.data.branchId)?.name : null;
        return br ? `${ent} · ${br}` : ent;
      },
    },
    {
      headerName: "Owner", minWidth: 180, flex: 1,
      valueGetter: (p) => {
        if (!p.data) return "";
        const o = ownerById.get(p.data.ownerProfileId);
        return o ? ownerLabel(o) : "—";
      },
    },
    {
      headerName: "Linked ledger", minWidth: 180, flex: 1,
      cellClass: "text-[12.5px]",
      valueGetter: (p) => {
        if (!p.data) return "";
        const l = ledgerById.get(p.data.coaAccountId);
        return l ? `${l.code} · ${l.name}` : "—";
      },
    },
    { headerName: "Currency", field: "currency", minWidth: 100, maxWidth: 110 },
    {
      headerName: "Defaults", minWidth: 110, maxWidth: 130, sortable: false,
      cellRenderer: (p: ICellRendererParams<BankAccount>) => p.data ? <BankAccountDefaultsBadges account={p.data} /> : null,
    },
    {
      headerName: "Reconciliation", minWidth: 150,
      cellRenderer: (p: ICellRendererParams<BankAccount>) => p.data ? <ReconciliationStatusPill status={p.data.lastReconciliationStatus} /> : null,
    },
    {
      headerName: "Last reconciled", minWidth: 140,
      valueGetter: (p) => p.data?.lastReconciledAt ? new Date(p.data.lastReconciledAt).toLocaleDateString() : "—",
    },
    {
      headerName: "Status", field: "status", minWidth: 110, maxWidth: 130,
      cellRenderer: (p: ICellRendererParams<BankAccount>) => p.data ? <BankAccountStatusBadge status={p.data.status} /> : null,
    },
    {
      headerName: "", maxWidth: 56, minWidth: 56, sortable: false, filter: false, resizable: false,
      cellRenderer: (p: ICellRendererParams<BankAccount>) => {
        if (!p.data) return null;
        const a = p.data;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/accounting/bank-accounts/${a.id}`}><Eye className="size-3.5 mr-2" /> View</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(a)}><Pencil className="size-3.5 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleStatus(a.id); toast.success(`Account ${a.status === "ACTIVE" ? "deactivated" : "activated"}`); }}>
                <Power className="size-3.5 mr-2" /> {a.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteTarget(a)} className="text-destructive focus:text-destructive">
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const filtersActive = search || countryFilter !== ALL || entityFilter !== ALL || ownerFilter !== ALL || currencyFilter !== ALL || statusFilter !== "all";
  const countries = Array.from(new Set(accounts.map((a) => a.country))).sort();
  const currencies = Array.from(new Set(accounts.map((a) => a.currency))).sort();

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingBreadcrumbs items={[{ label: "Accounting", to: "/accounting" }, { label: "Bank accounts" }]} />
        <AccountingPageHeader
          title="Bank accounts"
          subtitle="Operational bank accounts linked to Chart of Accounts ledgers"
          actions={
            <>
              <DarkModeToggle />
              <Button asChild variant="outline"><Link to="/accounting/reconciliation"><ExternalLink className="size-4 mr-1" /> Reconciliation</Link></Button>
              <Button onClick={openNew}><Plus className="size-4 mr-1" /> New bank account</Button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AccountingKPICard label="Total accounts" value={String(kpis.total)} icon={Landmark} />
          <AccountingKPICard label="Active" value={String(kpis.active)} icon={Landmark} />
          <AccountingKPICard label="Recon pending" value={String(kpis.reconPending)} icon={Landmark} />
          <AccountingKPICard label="Default payment set" value={kpis.defaultsCovered ? "Yes" : "No"} icon={Landmark} />
        </div>

        <Card className="p-5 shadow-elev-sm">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-search
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bank, nickname, holder, account…"
                className="pl-8 h-9"
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All countries</SelectItem>
                {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                {entities.filter((e) => !e.parentId).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All owners</SelectItem>
                {ownersList.filter((o) => o.isActive).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{ownerLabel(o)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Currency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All currencies</SelectItem>
                {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
          </div>

          {loading ? (
            <AccountingTableSkeleton rows={6} cols={8} />
          ) : filtered.length === 0 ? (
            <AccountingEmptyState
              icon={Landmark}
              title={filtersActive ? "No bank accounts match your filters" : "No bank accounts yet"}
              description={filtersActive ? "Try clearing some filters." : "Add your first bank account to start tracking balances and reconciliation."}
              action={!filtersActive ? <Button size="sm" onClick={openNew}><Plus className="size-4 mr-1" /> New bank account</Button> : undefined}
            />
          ) : (
            <AccountingAGGrid<BankAccount>
              rowData={filtered}
              columnDefs={cols}
              getRowId={(p) => p.data.id}
              height={560}
              rowClass="cursor-pointer"
              onRowClicked={(e) => {
                const target = e.event?.target as HTMLElement | undefined;
                if (target && target.closest('a,button,[role="menu"],[role="menuitem"]')) return;
                if (e.data) navigate(`/accounting/bank-accounts/${e.data.id}`);
              }}
            />
          )}
        </Card>

        <BankAccountFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          title="Delete bank account?"
          description={deleteTarget ? `This will permanently remove "${deleteTarget.nickname}". The linked Chart of Accounts ledger is not affected.` : ""}
          confirmLabel="Delete bank account"
          destructive
          onConfirm={onConfirmDelete}
        />
      </div>
    </AppLayout>
  );
}