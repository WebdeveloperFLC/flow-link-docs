import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Wallet, ArrowDownToLine, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import { useTrustState, refreshTrust } from "../../stores/trustStore";
import { useCrmBridgeStatus, syncCrmAll } from "../../stores/crmBridgeStore";
import { trustBucketLabel } from "../../lib/trustBuckets";
import { hydrateCollectionCategories } from "../../stores/collectionCategoriesStore";

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function AccountingTrustPage() {
  const navigate = useNavigate();
  const { accounts, entries, loading } = useTrustState();
  const bridge = useCrmBridgeStatus();
  const [q, setQ] = useState("");

  useEffect(() => {
    void hydrateCollectionCategories();
  }, []);

  const totalsByCurrency = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of accounts) m.set(a.currency, (m.get(a.currency) ?? 0) + a.balance);
    return Array.from(m.entries());
  }, [accounts]);

  const totalsByBucket = useMemo(() => {
    const m = new Map<string, { amount: number; currency: string; roleKey: string; collectionCategoryId?: string | null }>();
    for (const a of accounts) {
      const bucketKey = a.collectionCategoryId ?? a.roleKey;
      const key = `${bucketKey}|${a.currency}`;
      const cur = m.get(key) ?? { amount: 0, currency: a.currency, roleKey: a.roleKey, collectionCategoryId: a.collectionCategoryId };
      cur.amount += a.balance;
      m.set(key, cur);
    }
    return Array.from(m.values());
  }, [accounts]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return accounts
      .filter((a) => a.balance !== 0 || !term)
      .filter((a) => !term || [a.clientName, a.clientId, trustBucketLabel(a.roleKey, a.collectionCategoryId), a.entityId]
        .some((v) => String(v ?? "").toLowerCase().includes(term)));
  }, [accounts, q]);

  const onSync = async () => {
    const res = await syncCrmAll();
    toast.success(`CRM sync complete · ${res.invoicesPosted} invoices, ${res.paymentsPosted} payments journalized`);
    await refreshTrust();
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <AccountingPageHeader
          title="Student Trust"
          subtitle="Pass-through funds held on behalf of students · liability, never revenue"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onSync} disabled={bridge.running}>
                <RefreshCw className={`size-4 mr-1 ${bridge.running ? "animate-spin" : ""}`} /> Sync CRM
              </Button>
              <Button onClick={() => navigate("/accounting/trust/disburse")}>
                <ArrowDownToLine className="size-4 mr-1" /> New disbursement
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {totalsByCurrency.map(([cur, amt]) => (
            <Card key={cur} className="p-4">
              <div className="text-xs text-muted-foreground">Total held ({cur})</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{fmt(amt, cur)}</div>
            </Card>
          ))}
          {totalsByCurrency.length === 0 && (
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Total held</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">—</div>
            </Card>
          )}
        </div>

        {totalsByBucket.length > 0 && (
          <Card className="p-4 mt-4">
            <div className="text-sm font-medium mb-3">Held by bucket</div>
            <div className="flex flex-wrap gap-2">
              {totalsByBucket.map((b) => (
                <Badge key={`${b.collectionCategoryId ?? b.roleKey}${b.currency}`} variant="outline" className="text-xs">
                  {trustBucketLabel(b.roleKey, b.collectionCategoryId)}: {fmt(b.amount, b.currency)}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4 mt-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-7 h-9" placeholder="Search client, bucket, entity…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="text-xs text-muted-foreground ml-auto">
              {loading ? "Loading…" : `${filtered.length} trust balances`}
            </div>
          </div>

          {!loading && filtered.length === 0 ? (
            <AccountingEmptyState
              icon={Wallet}
              title="No trust balances"
              description="Sync CRM to journalize verified student payments, or record a receipt to see held funds here."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Client</th>
                    <th className="text-left px-3 py-2">Bucket</th>
                    <th className="text-left px-3 py-2">Entity</th>
                    <th className="text-left px-3 py-2">Branch</th>
                    <th className="text-right px-3 py-2">Available</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{a.clientName}</td>
                      <td className="px-3 py-2">{trustBucketLabel(a.roleKey, a.collectionCategoryId)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.entityId}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.branchId}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(a.balance, a.currency)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={a.balance <= 0}
                          onClick={() => navigate(`/accounting/trust/disburse?client=${a.clientId}&account=${a.id}`)}
                        >
                          Disburse
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {entries.length > 0 && (
          <Card className="p-4 mt-4">
            <div className="text-sm font-medium mb-3">Recent movements</div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Source</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 25).map((e) => (
                    <tr key={e.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">{e.entryType}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.sourceModule}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${e.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                        {fmt(e.amount, e.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
