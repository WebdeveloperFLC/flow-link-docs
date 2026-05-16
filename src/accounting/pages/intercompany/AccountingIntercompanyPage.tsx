import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeftRight, Search } from "lucide-react";
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
import { useIntercompany } from "@/accounting/stores/intercompanyStore";
import { useEntities } from "@/accounting/stores/accountingEntitiesStore";
import { formatCurrency } from "@/accounting/lib/format";

export default function AccountingIntercompanyPage() {
  const navigate = useNavigate();
  const txns = useIntercompany();
  const entities = useEntities();
  const [from, setFrom] = useState("all");
  const [to, setTo] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    txns.filter((t) =>
      (from === "all" || t.fromEntity === from) &&
      (to === "all" || t.toEntity === to) &&
      (status === "all" || t.status === status) &&
      (!search || `${t.txnNumber} ${t.description}`.toLowerCase().includes(search.toLowerCase()))
    ), [txns, from, to, status, search]);

  const year = new Date().getFullYear();
  const ytd = txns.filter((t) => t.txnDate.startsWith(String(year)));
  const total = ytd.reduce((s, t) => s + t.amount * t.fxRate, 0);
  const pending = txns.filter((t) => t.status === "DRAFT").length;
  const voided = txns.filter((t) => t.status === "VOIDED").length;

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <AccountingPageHeader
          title="Inter-company transactions"
          subtitle="Auto-mirrors entries across entities"
          actions={
            <Button onClick={() => navigate("/accounting/intercompany/new")} className="gap-2">
              <Plus className="size-4" /> New transaction
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AccountingKPICard label="YTD transactions" value={String(ytd.length)} icon={ArrowLeftRight} />
          <AccountingKPICard label="YTD amount (CAD)" value={total} icon={ArrowLeftRight} />
          <AccountingKPICard label="Pending posting" value={String(pending)} icon={ArrowLeftRight} />
          <AccountingKPICard label="Voided" value={String(voided)} icon={ArrowLeftRight} />
        </div>

        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger><SelectValue placeholder="From entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All from entities</SelectItem>
                {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger><SelectValue placeholder="To entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All to entities</SelectItem>
                {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="VOIDED">Voided</SelectItem>
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
                icon={ArrowLeftRight}
                title="No inter-company transactions yet"
                description="Record a transaction between entities to generate mirror journal entries."
                action={
                  <Button onClick={() => navigate("/accounting/intercompany/new")} className="gap-2">
                    <Plus className="size-4" /> New transaction
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Txn #</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">From → To</th>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-right px-4 py-3">FX</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id}
                        onClick={() => navigate(`/accounting/intercompany/${t.id}`)}
                        className="border-t hover:bg-muted/30 cursor-pointer">
                      <td className="px-4 py-3 font-medium">{t.txnNumber}</td>
                      <td className="px-4 py-3">{t.txnDate}</td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground">{entityName(t.fromEntity)}</span>
                        <span className="mx-2">→</span>
                        <span>{entityName(t.toEntity)}</span>
                      </td>
                      <td className="px-4 py-3 truncate max-w-xs">{t.description}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(t.amount, (t.currency as any) || "CAD")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{t.fxRate}</td>
                      <td className="px-4 py-3"><AccountingStatusBadge status={t.status} /></td>
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