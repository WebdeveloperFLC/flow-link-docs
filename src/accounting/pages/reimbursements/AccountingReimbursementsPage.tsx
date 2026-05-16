import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ReceiptText, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AccountingPageHeader from "@/accounting/components/shared/AccountingPageHeader";
import AccountingEmptyState from "@/accounting/components/shared/AccountingEmptyState";
import AccountingKPICard from "@/accounting/components/shared/AccountingKPICard";
import AccountingStatusBadge from "@/accounting/components/shared/AccountingStatusBadge";
import { useReimbursements } from "@/accounting/stores/reimbursementsStore";
import { useEntities } from "@/accounting/stores/accountingEntitiesStore";
import { formatCurrency } from "@/accounting/lib/format";
import { asCurrency } from "@/accounting/lib/journalHelpers";

export default function AccountingReimbursementsPage() {
  const navigate = useNavigate();
  const claims = useReimbursements();
  const entities = useEntities();
  const [status, setStatus] = useState("all");
  const [entity, setEntity] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    claims.filter((c) =>
      (status === "all" || c.status === status) &&
      (entity === "all" || c.entity === entity) &&
      (!search || `${c.claimNumber} ${c.claimedBy}`.toLowerCase().includes(search.toLowerCase()))
    ), [claims, status, entity, search]);

  const pending = claims.filter((c) => c.status === "SUBMITTED" || c.status === "UNDER_REVIEW");
  const approved = claims.filter((c) => c.status === "APPROVED");
  const thisMonth = new Date().toISOString().slice(0, 7);
  const paidThisMonth = claims.filter((c) => c.status === "PAID" && c.paidAt?.startsWith(thisMonth));
  const ytd = claims.filter((c) => c.claimDate.startsWith(String(new Date().getFullYear())));

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <AccountingPageHeader
          title="Reimbursement claims"
          subtitle="Personal card business expense claims"
          actions={<Button onClick={() => navigate("/accounting/reimbursements/new")} className="gap-2"><Plus className="size-4" /> New claim</Button>}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AccountingKPICard label="Pending approval" value={`${pending.length} · ${formatCurrency(pending.reduce((s,c)=>s+c.reimbursableAmount,0))}`} icon={ReceiptText} />
          <AccountingKPICard label="Approved — awaiting payment" value={approved.reduce((s,c)=>s+c.reimbursableAmount,0)} icon={ReceiptText} />
          <AccountingKPICard label="Paid this month" value={paidThisMonth.reduce((s,c)=>s+c.reimbursableAmount,0)} icon={ReceiptText} />
          <AccountingKPICard label="Total claimed YTD" value={ytd.reduce((s,c)=>s+c.reimbursableAmount,0)} icon={ReceiptText} />
        </div>

        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {["DRAFT","SUBMITTED","UNDER_REVIEW","APPROVED","PAID","REJECTED"].map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card>
          {filtered.length === 0 ? (
            <div className="p-10">
              <AccountingEmptyState
                icon={ReceiptText}
                title="No reimbursement claims yet"
                description="Create a claim to track business expenses paid on personal cards."
                action={<Button onClick={() => navigate("/accounting/reimbursements/new")} className="gap-2"><Plus className="size-4" /> New claim</Button>}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Claim #</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Claimed by</th>
                    <th className="text-left px-4 py-3">Entity</th>
                    <th className="text-right px-4 py-3">Lines</th>
                    <th className="text-right px-4 py-3">Business</th>
                    <th className="text-right px-4 py-3">Personal</th>
                    <th className="text-right px-4 py-3">Reimbursable</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}
                        onClick={() => navigate(`/accounting/reimbursements/${c.id}`)}
                        className="border-t hover:bg-muted/30 cursor-pointer">
                      <td className="px-4 py-3 font-medium">{c.claimNumber}</td>
                      <td className="px-4 py-3">{c.claimDate}</td>
                      <td className="px-4 py-3">{c.claimedBy}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entityName(c.entity)}</td>
                      <td className="px-4 py-3 text-right">{c.lines.length}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.businessAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(c.personalAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(c.reimbursableAmount)}</td>
                      <td className="px-4 py-3"><AccountingStatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}