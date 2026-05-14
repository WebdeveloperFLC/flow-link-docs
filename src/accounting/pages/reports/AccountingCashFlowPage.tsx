import { useMemo, useState } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle2, PiggyBank } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReportShell from "../../components/reports/ReportShell";
import ReportFilterBar from "../../components/reports/ReportFilterBar";
import ReportExportMenu from "../../components/reports/ReportExportMenu";
import ReportTable from "../../components/reports/ReportTable";
import ReportKPIBar from "../../components/reports/ReportKPIBar";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import { getCashFlowTree, MOCK_ENTITIES } from "../../data/mockReports";
import { formatAccounting } from "../../lib/format";
import type { EntityCode, PeriodPreset, ComparisonMode, ReportNode } from "../../types/reports";

export default function AccountingCashFlowPage() {
  const [entities, setEntities] = useState<EntityCode[]>(MOCK_ENTITIES.map((e) => e.code));
  const [period, setPeriod] = useState<PeriodPreset>("QUARTER");
  const [comparison, setComparison] = useState<ComparisonMode>("PRIOR_PERIOD");

  const { sections, opening, closing, netChange } = useMemo(getCashFlowTree, []);

  const tableNodes: ReportNode[] = [
    ...sections,
    { id: "net-change", label: "Net change in cash", kind: "subtotal", current: netChange, prior: netChange * 0.9 },
  ];

  const reconciles = Math.abs(opening + netChange - closing) < 1;

  return (
    <ReportShell
      title="Cash flow statement"
      subtitle="Indirect method · Operating, investing & financing activities"
      filterBar={
        <ReportFilterBar
          entities={entities}
          onEntitiesChange={setEntities}
          period={period}
          onPeriodChange={setPeriod}
          comparison={comparison}
          onComparisonChange={setComparison}
          showBranch={false}
          rightSlot={<ReportExportMenu reportName="Cash Flow" />}
        />
      }
      kpiBar={
        <ReportKPIBar>
          <AccountingKPICard label="Opening balance" value={opening} icon={Wallet} />
          <AccountingKPICard label="Net cash movement" value={netChange} deltaDirection={netChange >= 0 ? "up" : "down"} icon={netChange >= 0 ? ArrowUpCircle : ArrowDownCircle} />
          <AccountingKPICard label="Closing balance" value={closing} icon={Wallet} />
          <AccountingKPICard label="Free cash flow" value={sections[0].current + sections[1].current} icon={PiggyBank} />
        </ReportKPIBar>
      }
    >
      <ReportTable nodes={tableNodes} title="Cash flow statement" />

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">Reconciliation</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <Recon label="Opening balance" value={opening} />
          <Recon label="+ Net change" value={netChange} />
          <Recon label="= Closing balance" value={closing} highlight />
        </div>
        <div className={cn("flex items-center gap-2 text-xs px-3 py-2 rounded-md border-l-4", reconciles ? "border-l-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400" : "border-l-amber-500 bg-amber-500/5 text-amber-700 dark:text-amber-400")}>
          <CheckCircle2 className="size-4" />
          {reconciles ? "Cash flow reconciles — opening + net change = closing" : "Cash flow does not reconcile"}
        </div>
      </Card>
    </ReportShell>
  );
}

function Recon({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-md border border-border p-3", highlight && "bg-primary/5 border-primary/30")}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-1">{formatAccounting(value)}</div>
    </div>
  );
}