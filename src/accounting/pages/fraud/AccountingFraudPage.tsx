import { useMemo, useState } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import FraudFlagBadge from "../../components/fraud/FraudFlagBadge";
import RiskDistributionChart from "../../components/fraud/RiskDistributionChart";
import FlagDetailModal from "../../components/fraud/FlagDetailModal";
import { FRAUD_FLAGS, getRiskDistribution } from "../../data/mockFraud";
import { FlagStatus, FraudFlag } from "../../types/fraud";
import { formatCurrency } from "../../lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<FlagStatus, string> = {
  under_review: "PENDING_REVIEW",
  confirmed: "REJECTED",
  false_positive: "APPROVED",
  dismissed: "VOIDED",
  escalated: "OTP_PENDING",
  auto_cleared: "POSTED",
};

export default function AccountingFraudPage() {
  const [flags, setFlags] = useState<FraudFlag[]>(FRAUD_FLAGS);
  const [selected, setSelected] = useState<FraudFlag | null>(null);
  const distribution = useMemo(() => getRiskDistribution(), []);

  const counts = useMemo(() => {
    return {
      critical: flags.filter((f) => f.severity === "critical").length,
      warning: flags.filter((f) => f.severity === "warning").length,
      autoCleared: flags.filter((f) => f.status === "auto_cleared").length,
      underReview: flags.filter((f) => f.status === "under_review").length,
    };
  }, [flags]);

  const handleAction = (id: string, action: "confirm" | "false_positive" | "escalate" | "dismiss") => {
    const map: Record<typeof action, FlagStatus> = {
      confirm: "confirmed",
      false_positive: "false_positive",
      escalate: "escalated",
      dismiss: "dismissed",
    };
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, status: map[action] } : f)));
    setSelected(null);
    const labels = {
      confirm: "Marked as confirmed fraud",
      false_positive: "Marked as false positive",
      escalate: "Escalated to compliance team",
      dismiss: "Flag dismissed",
    };
    toast.success(labels[action]);
  };

  const sorted = useMemo(
    () => [...flags].sort((a, b) => b.riskScore - a.riskScore),
    [flags],
  );

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingPageHeader
          title="Fraud & audit"
          subtitle="Accounting · Future Link Flow"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AccountingKPICard label="Critical flags" value={String(counts.critical)} icon={AlertTriangle} delta={`${counts.critical} active`} deltaDirection="down" />
          <AccountingKPICard label="Warnings" value={String(counts.warning)} icon={AlertCircle} delta="Last 30 days" />
          <AccountingKPICard label="Auto-cleared" value={String(counts.autoCleared)} icon={CheckCircle2} delta="Resolved by rules" deltaDirection="up" />
          <AccountingKPICard label="Under review" value={String(counts.underReview)} icon={Eye} delta="Awaiting analyst" />
        </div>

        <RiskDistributionChart data={distribution} />

        <Card className="overflow-hidden">
          <div className="flex items-baseline justify-between p-4 border-b">
            <div className="text-sm font-semibold">Flagged transactions</div>
            <div className="text-[11px] text-muted-foreground">{sorted.length} total · ranked by risk</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-10">Reference</TableHead>
                <TableHead className="h-10">Vendor</TableHead>
                <TableHead className="h-10">Entity</TableHead>
                <TableHead className="h-10 text-right">Amount</TableHead>
                <TableHead className="h-10 text-right">Risk</TableHead>
                <TableHead className="h-10">Type</TableHead>
                <TableHead className="h-10">Status</TableHead>
                <TableHead className="h-10">Flagged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((f) => (
                <TableRow
                  key={f.id}
                  onClick={() => setSelected(f)}
                  className="cursor-pointer"
                >
                  <TableCell className="py-2.5 font-mono text-xs">{f.txnRef}</TableCell>
                  <TableCell className="py-2.5">{f.vendor}</TableCell>
                  <TableCell className="py-2.5 text-muted-foreground text-xs">{f.entity}</TableCell>
                  <TableCell className="py-2.5 text-right tabular-nums">{formatCurrency(f.amount, f.currency)}</TableCell>
                  <TableCell className="py-2.5 text-right">
                    <span className={cn(
                      "tabular-nums font-semibold",
                      f.riskScore >= 80 ? "text-red-600 dark:text-red-400" : f.riskScore >= 60 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                    )}>{f.riskScore}</span>
                  </TableCell>
                  <TableCell className="py-2.5"><FraudFlagBadge type={f.type} /></TableCell>
                  <TableCell className="py-2.5"><AccountingStatusBadge status={STATUS_LABEL[f.status]} /></TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">{new Date(f.flaggedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <FlagDetailModal flag={selected} onClose={() => setSelected(null)} onAction={handleAction} />
      </div>
    </AppLayout>
  );
}