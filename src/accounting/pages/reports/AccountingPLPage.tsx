import { useMemo, useState } from "react";
import { TrendingUp, Percent, DollarSign, Activity } from "lucide-react";
import ReportShell from "../../components/reports/ReportShell";
import ReportFilterBar from "../../components/reports/ReportFilterBar";
import ReportExportMenu from "../../components/reports/ReportExportMenu";
import ReportTable from "../../components/reports/ReportTable";
import ReportKPIBar from "../../components/reports/ReportKPIBar";
import ReportTrendChart from "../../components/reports/ReportTrendChart";
import ReportBreakdownDonut from "../../components/reports/ReportBreakdownDonut";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import {
  getPLTree,
  REVENUE_TREND,
  EXPENSE_BREAKDOWN,
  MOCK_ENTITIES,
} from "../../data/mockReports";
import { variancePct, formatPercent } from "../../lib/format";
import type {
  EntityCode,
  PeriodPreset,
  ComparisonMode,
} from "../../types/reports";

export default function AccountingPLPage() {
  const [entities, setEntities] = useState<EntityCode[]>(
    MOCK_ENTITIES.map((e) => e.code)
  );
  const [branch, setBranch] = useState("all");
  const [period, setPeriod] = useState<PeriodPreset>("QUARTER");
  const [comparison, setComparison] = useState<ComparisonMode>("PRIOR_PERIOD");

  const tree = useMemo(() => getPLTree(), []);
  const find = (id: string) => tree.find((n) => n.id === id);
  const totalRev = find("total-rev");
  const gp = find("gp");
  const ebitda = find("ebitda");
  const net = find("net");

  const deltaText = (curr?: number, prior?: number) => {
    const v = curr != null && prior != null ? variancePct(curr, prior) : null;
    if (v === null) return undefined;
    return `${formatPercent(Math.abs(v))} vs prior`;
  };
  const dir = (curr?: number, prior?: number) => {
    if (curr == null || prior == null) return "neutral" as const;
    return curr >= prior ? ("up" as const) : ("down" as const);
  };

  return (
    <ReportShell
      title="Profit & Loss"
      subtitle="Revenue, expenses, and margins"
      filterBar={
        <ReportFilterBar
          entities={entities}
          onEntitiesChange={setEntities}
          branch={branch}
          onBranchChange={setBranch}
          period={period}
          onPeriodChange={setPeriod}
          comparison={comparison}
          onComparisonChange={setComparison}
          rightSlot={<ReportExportMenu reportName="P&L" />}
        />
      }
      kpiBar={
        <ReportKPIBar>
          <AccountingKPICard
            label="Total revenue"
            value={totalRev?.current ?? 0}
            delta={deltaText(totalRev?.current, totalRev?.prior)}
            deltaDirection={dir(totalRev?.current, totalRev?.prior)}
            icon={DollarSign}
          />
          <AccountingKPICard
            label="Gross profit"
            value={gp?.current ?? 0}
            delta={deltaText(gp?.current, gp?.prior)}
            deltaDirection={dir(gp?.current, gp?.prior)}
            icon={TrendingUp}
          />
          <AccountingKPICard
            label="EBITDA"
            value={ebitda?.current ?? 0}
            delta={deltaText(ebitda?.current, ebitda?.prior)}
            deltaDirection={dir(ebitda?.current, ebitda?.prior)}
            icon={Activity}
          />
          <AccountingKPICard
            label="Net profit"
            value={net?.current ?? 0}
            delta={deltaText(net?.current, net?.prior)}
            deltaDirection={dir(net?.current, net?.prior)}
            icon={Percent}
          />
        </ReportKPIBar>
      }
    >
      <ReportTable nodes={tree} title="P&L statement" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportTrendChart title="Revenue trend (6 months)" data={REVENUE_TREND} />
        <ReportBreakdownDonut title="Expense breakdown" data={EXPENSE_BREAKDOWN} />
      </div>
    </ReportShell>
  );
}