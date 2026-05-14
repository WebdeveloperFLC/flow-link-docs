import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReportShell from "../../components/reports/ReportShell";
import ReportFilterBar from "../../components/reports/ReportFilterBar";
import ReportExportMenu from "../../components/reports/ReportExportMenu";
import ReportTable from "../../components/reports/ReportTable";
import { getBSTree, MOCK_ENTITIES } from "../../data/mockReports";
import { formatAccounting } from "../../lib/format";
import type { EntityCode } from "../../types/reports";

export default function AccountingBSPage() {
  const [entities, setEntities] = useState<EntityCode[]>(MOCK_ENTITIES.map((e) => e.code));
  const [asOf, setAsOf] = useState<Date>(new Date());

  const { assets, liabEquity } = useMemo(() => getBSTree(), []);
  const totalAssets = assets.find((n) => n.id === "total-assets")?.current ?? 0;
  const totalLE = liabEquity.find((n) => n.id === "total-le")?.current ?? 0;
  const balanced = Math.abs(totalAssets - totalLE) < 1;
  const delta = totalAssets - totalLE;

  return (
    <ReportShell
      title="Balance sheet"
      subtitle="Assets, liabilities & equity"
      filterBar={
        <ReportFilterBar
          entities={entities}
          onEntitiesChange={setEntities}
          showPeriod={false}
          showComparison={false}
          showBranch={false}
          extra={
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="size-4" />
                  As of {format(asOf, "PP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 bg-popover">
                <Calendar mode="single" selected={asOf} onSelect={(d) => d && setAsOf(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          }
          rightSlot={<ReportExportMenu reportName="Balance Sheet" />}
        />
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ReportTable nodes={assets} title="Assets" />
        <ReportTable nodes={liabEquity} title="Liabilities & equity" />
      </div>

      <Card className={cn("p-4 flex items-center gap-3 border-l-4", balanced ? "border-l-emerald-500 bg-emerald-500/5" : "border-l-amber-500 bg-amber-500/5")}>
        {balanced ? <CheckCircle2 className="size-5 text-emerald-500 flex-shrink-0" /> : <AlertTriangle className="size-5 text-amber-500 flex-shrink-0" />}
        <div className="flex-1">
          <div className="font-semibold text-sm">
            {balanced ? "Balance sheet balances — Assets = Liabilities + Equity" : "Balance sheet does not balance"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            Assets {formatAccounting(totalAssets)} · Liab + Equity {formatAccounting(totalLE)}
            {!balanced && <span className="text-amber-600 font-medium">{" · "}Δ {formatAccounting(delta)}</span>}
          </div>
        </div>
      </Card>
    </ReportShell>
  );
}