import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet, AlertTriangle, Clock, ShieldAlert, TrendingDown, Plus,
  Download, ArrowUpRight, ScanSearch, RefreshCw, Settings, Users, Tags, Building2, MoreHorizontal, Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import { usePettyCash } from "../../stores/pettyCashStore";
import DeleteRecordDialog from "../../components/shared/DeleteRecordDialog";
import { formatCurrency } from "../../lib/format";
import { PettyCategory } from "../../types/pettyCash";
import { usePettyCashAdmin } from "../../hooks/usePettyCashAdmin";
import { ManageBranchesDialog } from "../../components/petty-cash/ManageBranchesDialog";
import { ManagePeopleDialog } from "../../components/petty-cash/ManagePeopleDialog";
import { ManageCategoriesDialog } from "../../components/petty-cash/ManageCategoriesDialog";

export default function AccountingPettyCashDashboardPage() {
  const navigate = useNavigate();
  const { branches, vouchers, categories, getBranchSummary, getCategoryBreakdown, getMonthlyTrend, deleteVoucher } = usePettyCash();
  const { isAdmin } = usePettyCashAdmin();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [showManageBranches, setShowManageBranches] = useState(false);
  const [showManagePeople, setShowManagePeople] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);

  const CAT_LABEL = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach(c => { m[c.value] = c.label; });
    return m;
  }, [categories]);

  const summaries = branches.map(b => getBranchSummary(b.id));
  const totals = useMemo(() => {
    const totalFloat = branches.reduce((s, b) => s + b.openingFloat, 0);
    const totalRemaining = branches.reduce((s, b) => s + b.currentBalance, 0);
    const spentToday = summaries.reduce((s, x) => s + x.spentToday, 0);
    const spentMonth = summaries.reduce((s, x) => s + x.spentMonth, 0);
    const pendingTotal = summaries.reduce((s, x) => s + x.pendingCount, 0);
    const flaggedTotal = summaries.reduce((s, x) => s + x.flaggedCount, 0);
    return { totalFloat, totalRemaining, spentToday, spentMonth, pendingTotal, flaggedTotal };
  }, [branches, summaries]);

  const lowBranches = summaries.filter(s => s.remaining < 2500);

  const breakdown = useMemo(() => {
    const data = getCategoryBreakdown(branchFilter === "all" ? undefined : branchFilter);
    const sum = data.reduce((s, d) => s + d.amount, 0) || 1;
    return data.slice(0, 8).map(d => ({ ...d, pct: (d.amount / sum) * 100 }));
  }, [getCategoryBreakdown, branchFilter]);

  const trend = useMemo(() => getMonthlyTrend(), [getMonthlyTrend]);
  const trendMax = Math.max(1, ...trend.map(t => t.amount));

  const filteredVouchers = vouchers.filter(v => {
    if (branchFilter !== "all" && v.branchId !== branchFilter) return false;
    if (categoryFilter !== "all" && v.category !== categoryFilter) return false;
    if (from && v.date < from) return false;
    if (to && v.date > to) return false;
    return true;
  });

  const exportCsv = () => {
    const rows = [
      ["Voucher", "Branch", "Date", "Category", "Paid to", "Amount (INR)", "Status"],
      ...filteredVouchers.map(v => [
        v.voucherNumber,
        branches.find(b => b.id === v.branchId)?.name ?? "",
        v.date, CAT_LABEL[v.category], v.paidTo, String(v.amount), v.status,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `petty-cash-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  const maxBranchSpend = Math.max(1, ...summaries.map(s => s.spentMonth));

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <AccountingPageHeader
          title="Petty cash"
          subtitle="Branch-wise petty cash operations, approvals, and audit"
          actions={
            <>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline"><Settings className="size-4 mr-1.5" /> Manage</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowManageBranches(true)}>
                      <Building2 className="size-4 mr-2" /> Branches
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowManagePeople(true)}>
                      <Users className="size-4 mr-2" /> Custodians, approvers & employees
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowManageCategories(true)}>
                      <Tags className="size-4 mr-2" /> Categories
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="outline" onClick={() => navigate("/accounting/petty-cash/audit")}>
                <ScanSearch className="size-4 mr-1.5" /> Audit
              </Button>
              <Button variant="outline" onClick={() => navigate("/accounting/petty-cash/replenishment")}>
                <RefreshCw className="size-4 mr-1.5" /> Replenishment
              </Button>
              <Button onClick={() => navigate("/accounting/petty-cash/new")}>
                <Plus className="size-4 mr-1.5" /> New voucher
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <AccountingKPICard label="Total float" value={totals.totalFloat} currency="INR" icon={Wallet} delta={`Remaining ${formatCurrency(totals.totalRemaining, "INR")}`} />
          <AccountingKPICard label="Spent today" value={totals.spentToday} currency="INR" icon={TrendingDown} />
          <AccountingKPICard label="Spent this month" value={totals.spentMonth} currency="INR" icon={TrendingDown} />
          <AccountingKPICard label="Pending approvals" value={totals.pendingTotal} icon={Clock} />
          <AccountingKPICard label="Flagged vouchers" value={totals.flaggedTotal} icon={ShieldAlert} />
        </div>

        {/* Replenishment alert */}
        {lowBranches.length > 0 && (
          <Card className="p-4 border-amber-300/60 bg-amber-50/50 dark:bg-amber-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Replenishment suggested for {lowBranches.length} branch{lowBranches.length > 1 ? "es" : ""}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Below ₹2,500 threshold: {lowBranches.map(b => b.branch.name).join(", ")}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/accounting/petty-cash/replenishment")}>
                Review <ArrowUpRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {/* Branch grid */}
        <div>
          <div className="text-sm font-semibold mb-3">Branches</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {summaries.map(s => {
              const pct = Math.max(0, Math.min(100, (s.remaining / s.branch.openingFloat) * 100));
              const low = s.remaining < 2500;
              return (
                <Card key={s.branch.id} className="p-4 hover:shadow-elev-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{s.branch.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">Custodian: {s.branch.custodianName}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {s.pendingCount > 0 && <Badge variant="secondary" className="text-[10px]">{s.pendingCount} pending</Badge>}
                      {s.flaggedCount > 0 && <Badge className="text-[10px] bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-50">{s.flaggedCount} flagged</Badge>}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Opening</div>
                      <div className="font-mono tabular-nums font-medium">{formatCurrency(s.branch.openingFloat, "INR")}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Remaining</div>
                      <div className={cn("font-mono tabular-nums font-medium", low && "text-destructive")}>{formatCurrency(s.remaining, "INR")}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Spent today</div>
                      <div className="font-mono tabular-nums">{formatCurrency(s.spentToday, "INR")}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Spent MTD</div>
                      <div className="font-mono tabular-nums">{formatCurrency(s.spentMonth, "INR")}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full transition-all", low ? "bg-destructive" : pct < 40 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
                      <span>{pct.toFixed(0)}% of float</span>
                      <span>Updated {s.lastUpdated ? new Date(s.lastUpdated).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link to={`/accounting/petty-cash/audit?branch=${s.branch.id}`}>View activity</Link>
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/accounting/petty-cash/new?branch=${s.branch.id}`)}>
                      New voucher
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Branch comparison + trend + breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="p-4 lg:col-span-1">
            <div className="text-sm font-semibold mb-3">Branch comparison (MTD)</div>
            <div className="space-y-2">
              {summaries.map(s => (
                <div key={s.branch.id}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-muted-foreground truncate">{s.branch.name}</span>
                    <span className="font-mono tabular-nums">{formatCurrency(s.spentMonth, "INR")}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(s.spentMonth / maxBranchSpend) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 lg:col-span-1">
            <div className="text-sm font-semibold mb-3">Monthly trend</div>
            {trend.length === 0 ? (
              <div className="text-xs text-muted-foreground py-8 text-center">No data</div>
            ) : (
              <div className="h-32 flex items-end gap-1.5">
                {trend.map(t => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-primary/70 rounded-t" style={{ height: `${(t.amount / trendMax) * 100}%` }} title={`${t.month}: ${formatCurrency(t.amount, "INR")}`} />
                    <div className="text-[9px] text-muted-foreground">{t.month.slice(5)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 lg:col-span-1">
            <div className="text-sm font-semibold mb-3">Category breakdown</div>
            <div className="space-y-2">
              {breakdown.map(b => (
                <div key={b.category}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-muted-foreground">{CAT_LABEL[b.category]}</span>
                    <span className="font-mono tabular-nums">{formatCurrency(b.amount, "INR")}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary/80" style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
              {breakdown.length === 0 && <div className="text-xs text-muted-foreground">No data</div>}
            </div>
          </Card>
        </div>

        {/* Recent vouchers + filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="text-sm font-semibold">Recent vouchers</div>
            <div className="flex flex-wrap gap-2">
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.filter(c => !c.disabled).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[140px] text-xs" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[140px] text-xs" />
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="size-3.5 mr-1.5" /> Export
              </Button>
            </div>
          </div>

          {filteredVouchers.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">No vouchers match the filters.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-9">
                      <th className="text-left px-3">Voucher</th>
                      <th className="text-left px-3">Branch</th>
                      <th className="text-left px-3">Date</th>
                      <th className="text-left px-3">Category</th>
                      <th className="text-left px-3">Paid to</th>
                      <th className="text-right px-3">Amount</th>
                      <th className="text-left px-3">Status</th>
                      <th className="px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.slice(0, 25).map(v => (
                      <tr key={v.id} className="border-b last:border-b-0 hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/accounting/petty-cash/${v.id}`)}>
                        <td className="px-3 py-2 font-mono text-xs">{v.voucherNumber}</td>
                        <td className="px-3 py-2">{branches.find(b => b.id === v.branchId)?.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{v.date}</td>
                        <td className="px-3 py-2">{CAT_LABEL[v.category] ?? v.category}</td>
                        <td className="px-3 py-2 truncate max-w-[200px]">{v.paidTo}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(v.amount, "INR")}</td>
                        <td className="px-3 py-2">
                          <StatusPill status={v.status} />
                        </td>
                        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(v.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filteredVouchers.slice(0, 15).map(v => (
                  <Card key={v.id} className="p-3" onClick={() => navigate(`/accounting/petty-cash/${v.id}`)}>
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-muted-foreground">{v.voucherNumber}</div>
                        <div className="text-sm font-medium truncate">{v.paidTo}</div>
                        <div className="text-[11px] text-muted-foreground">{branches.find(b => b.id === v.branchId)?.name} · {v.date}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono tabular-nums text-sm">{formatCurrency(v.amount, "INR")}</div>
                        <StatusPill status={v.status} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <ManageBranchesDialog open={showManageBranches} onOpenChange={setShowManageBranches} />
      <ManagePeopleDialog open={showManagePeople} onOpenChange={setShowManagePeople} />
      <ManageCategoriesDialog open={showManageCategories} onOpenChange={setShowManageCategories} />

      <DeleteRecordDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteVoucher(deleteTarget);
            setDeleteTarget(null);
            toast.success("Deleted successfully");
          }
        }}
      />
    </AppLayout>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    REIMBURSED: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    REJECTED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  };
  return <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full inline-block", map[status] ?? "bg-muted text-muted-foreground")}>{status}</span>;
}