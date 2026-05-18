import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, ExternalLink, Landmark, Power } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingBreadcrumbs from "../../components/shared/AccountingBreadcrumbs";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import DarkModeToggle from "../../components/shared/DarkModeToggle";
import BankAccountStatusBadge from "../../components/bank-accounts/BankAccountStatusBadge";
import BankAccountDefaultsBadges from "../../components/bank-accounts/BankAccountDefaultsBadges";
import ReconciliationStatusPill from "../../components/bank-accounts/ReconciliationStatusPill";
import BankAccountFormDialog, { ownerLabel } from "../../components/bank-accounts/BankAccountFormDialog";
import { useBankAccounts, deleteBankAccount, toggleStatus, setDefault, updateBankAccount } from "../../stores/bankAccountsStore";
import { useAccounts } from "../../stores/coaStore";
import { useEntities } from "../../stores/accountingEntitiesStore";
import { useOwners } from "../../stores/ownersStore";
import { MOCK_JOURNALS } from "../../data/mockJournals";
import { formatCurrency } from "../../lib/format";
import { DefaultKind } from "../../types/bankAccounts";

export default function AccountingBankAccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const accounts = useBankAccounts();
  const ledgers = useAccounts();
  const entities = useEntities();

  const ownersList = useOwners();
  const account = accounts.find((a) => a.id === id);
  const ledger = account ? ledgers.find((l) => l.id === account.coaAccountId) : null;
  const entity = account ? entities.find((e) => e.id === account.entityId) : null;
  const branch = account?.branchId ? entities.find((e) => e.id === account.branchId) : null;
  const owner = account ? ownersList.find((o) => o.id === account.ownerProfileId) : null;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const recentJournals = useMemo(() => {
    if (!ledger) return [];
    return MOCK_JOURNALS
      .filter((j) => j.lines.some((l) => l.accountCode === ledger.code))
      .slice(0, 8);
  }, [ledger]);

  if (!account) {
    return (
      <AppLayout>
        <div className="p-8">
          <AccountingBreadcrumbs items={[
            { label: "Accounting", to: "/accounting" },
            { label: "Bank accounts", to: "/accounting/bank-accounts" },
            { label: "Not found" },
          ]} />
          <Card className="p-10 text-center">
            <div className="text-lg font-semibold">Bank account not found</div>
            <p className="text-sm text-muted-foreground mt-1">It may have been deleted.</p>
            <Button asChild className="mt-4"><Link to="/accounting/bank-accounts"><ArrowLeft className="size-4 mr-1" /> Back to bank accounts</Link></Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const currency = account.currency as "CAD" | "USD" | "INR";

  const onDelete = () => {
    const r = deleteBankAccount(account.id);
    if (!r.ok) { toast.error(r.error ?? "Cannot delete"); return; }
    toast.success(`${account.nickname} deleted`);
    navigate("/accounting/bank-accounts");
  };

  const updateField = (patch: Partial<typeof account>) => {
    const r = updateBankAccount(account.id, { ...account, ...patch });
    if (r.ok === false) toast.error(r.error.message);
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingBreadcrumbs items={[
          { label: "Accounting", to: "/accounting" },
          { label: "Bank accounts", to: "/accounting/bank-accounts" },
          { label: account.nickname },
        ]} />

        <AccountingPageHeader
          title={account.nickname}
          subtitle={`${account.bankName} · ${account.country} · ${account.currency}`}
          actions={
            <>
              <DarkModeToggle />
              <Button variant="outline" onClick={() => { toggleStatus(account.id); toast.success("Status updated"); }}>
                <Power className="size-4 mr-1" /> {account.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="size-4 mr-1" /> Edit</Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4 mr-1" /> Delete</Button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile label="Current balance" value={ledger ? formatCurrency(ledger.currentBalance, currency) : "—"} />
          <KpiTile label="Status" valueNode={<BankAccountStatusBadge status={account.status} />} />
          <KpiTile label="Last reconciled" value={account.lastReconciledAt ? new Date(account.lastReconciledAt).toLocaleDateString() : "—"} />
          <KpiTile label="Recon status" valueNode={<ReconciliationStatusPill status={account.lastReconciliationStatus} />} />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-5 space-y-3">
                <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Entity & linking</div>
                <Row label="Entity" value={entity?.name ?? "—"} />
                <Row label="Branch" value={branch?.name ?? "—"} />
                <Row label="Owner" value={owner ? <Link to={`/accounting/owners/${owner.id}`} className="text-primary hover:underline">{ownerLabel(owner)}</Link> : "—"} />
                <Row label="Linked COA ledger" value={ledger ? <Link to="/accounting/coa" className="text-primary hover:underline">{ledger.code} · {ledger.name}</Link> : "—"} />
                <Row label="Currency" value={account.currency} />
                <Row label="Defaults" value={<BankAccountDefaultsBadges account={account} />} />
              </Card>
              <Card className="p-5 space-y-3">
                <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Bank details</div>
                <Row label="Bank" value={account.bankName} />
                <Row label="Holder" value={account.holderName} />
                <Row label="Account #" value={<span className="font-mono">{account.accountNumber}</span>} />
                <Row label="IBAN" value={account.iban ?? "—"} />
                <Row label="SWIFT/BIC" value={account.swift ?? "—"} />
                <Row label="IFSC" value={account.ifsc ?? "—"} />
                <Row label="Routing" value={account.routingNumber ?? "—"} />
                <Row label="Transit" value={account.transitNumber ?? "—"} />
                <Row label="Branch code" value={account.branchCode ?? "—"} />
                <Row label="Branch name" value={account.branchName ?? "—"} />
                <Row label="Branch address" value={account.branchAddress ?? "—"} />
              </Card>
              <Card className="p-5 space-y-3">
                <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Relationship manager</div>
                <Row label="Name" value={account.rmName ?? "—"} />
                <Row label="Email" value={account.rmEmail ?? "—"} />
                <Row label="Phone" value={account.rmPhone ?? "—"} />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="p-5 space-y-3">
              <div className="text-sm font-semibold">Defaults</div>
              <p className="text-[12px] text-muted-foreground">Setting a default automatically clears the same flag on other accounts in the same entity & currency.</p>
              <DefaultRow label="Default payment account" on={account.isDefaultPayment} onSet={() => { setDefault("payment" as DefaultKind, account.id); toast.success("Default payment updated"); }} />
              <DefaultRow label="Default payroll account" on={account.isDefaultPayroll} onSet={() => { setDefault("payroll" as DefaultKind, account.id); toast.success("Default payroll updated"); }} />
              <DefaultRow label="Default tax payment account" on={account.isDefaultTax} onSet={() => { setDefault("tax" as DefaultKind, account.id); toast.success("Default tax updated"); }} />
            </Card>
            <Card className="p-5 space-y-3">
              <div className="text-sm font-semibold">Reconciliation</div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2">
                <div>
                  <div className="text-[13px] font-medium">Reconciliation enabled</div>
                  <div className="text-[11px] text-muted-foreground">Show this account in the Reconciliation module</div>
                </div>
                <Switch checked={account.reconciliationEnabled} onCheckedChange={(v) => updateField({ reconciliationEnabled: v })} />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Latest reconciliation</div>
                  <div className="mt-2"><ReconciliationStatusPill status={account.lastReconciliationStatus} /></div>
                  <div className="text-[12px] text-muted-foreground mt-1">
                    Last reconciled: {account.lastReconciledAt ? new Date(account.lastReconciledAt).toLocaleString() : "Never"}
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link to="/accounting/reconciliation"><ExternalLink className="size-4 mr-1" /> Open Reconciliation</Link>
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="text-sm font-semibold">Recent journal activity</div>
                <div className="text-[11px] text-muted-foreground">{recentJournals.length} entries</div>
              </div>
              {recentJournals.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">No journal activity for the linked ledger yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-4 py-2 font-semibold">Date</th>
                      <th className="px-4 py-2 font-semibold">Entry #</th>
                      <th className="px-4 py-2 font-semibold">Narration</th>
                      <th className="px-4 py-2 font-semibold text-right">Debit</th>
                      <th className="px-4 py-2 font-semibold text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJournals.map((j) => {
                      const line = j.lines.find((l) => l.accountCode === ledger?.code);
                      return (
                        <tr key={j.id} className="border-t border-border hover:bg-accent/30">
                          <td className="px-4 py-2 tabular-nums">{j.entryDate}</td>
                          <td className="px-4 py-2 font-mono text-[12px]">{j.entryNumber}</td>
                          <td className="px-4 py-2 max-w-[360px] truncate">{j.narration}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{line?.debit ? formatCurrency(line.debit, currency) : "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{line?.credit ? formatCurrency(line.credit, currency) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <BankAccountFormDialog open={editOpen} onOpenChange={setEditOpen} initial={account} />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete bank account?"
          description={`This will permanently remove "${account.nickname}". The linked Chart of Accounts ledger is not affected.`}
          confirmLabel="Delete bank account"
          destructive
          onConfirm={onDelete}
        />
      </div>
    </AppLayout>
  );
}

function KpiTile({ label, value, valueNode }: { label: string; value?: string; valueNode?: React.ReactNode }) {
  return (
    <Card className="p-5 shadow-elev-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-xl font-bold mt-2 tabular-nums truncate">
        {valueNode ?? value}
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3 text-[13px]">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground break-words">{value}</div>
    </div>
  );
}

function DefaultRow({ label, on, onSet }: { label: string; on: boolean; onSet: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{on ? "Currently default" : "Not set as default"}</div>
      </div>
      <Button size="sm" variant={on ? "secondary" : "outline"} onClick={onSet} disabled={on}>
        {on ? "Default" : "Set as default"}
      </Button>
    </div>
  );
}