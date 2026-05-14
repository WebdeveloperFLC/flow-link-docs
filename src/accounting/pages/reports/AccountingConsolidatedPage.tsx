import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReportShell from "../../components/reports/ReportShell";
import ReportFilterBar from "../../components/reports/ReportFilterBar";
import ReportExportMenu from "../../components/reports/ReportExportMenu";
import { MOCK_ENTITIES, getConsolidatedTree, convertToCAD } from "../../data/mockReports";
import { formatAccounting } from "../../lib/format";
import type { EntityCode } from "../../types/reports";

export default function AccountingConsolidatedPage() {
  const [entities, setEntities] = useState<EntityCode[]>(MOCK_ENTITIES.map((e) => e.code));
  const { rows, eliminations } = useMemo(() => getConsolidatedTree(entities), [entities]);
  const selectedEntities = MOCK_ENTITIES.filter((e) => entities.includes(e.code));

  return (
    <ReportShell
      title="Consolidated report"
      subtitle="Multi-entity rollup · Intercompany eliminations · CAD"
      filterBar={
        <ReportFilterBar
          entities={entities}
          onEntitiesChange={setEntities}
          showPeriod={false}
          showComparison={false}
          showBranch={false}
          rightSlot={<ReportExportMenu reportName="Consolidated" />}
        />
      }
    >
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-semibold">Consolidated P&L</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedEntities.map((e) => (
              <Badge key={e.code} variant="outline" className="text-[10px]">{e.code} · {e.currency}</Badge>
            ))}
          </div>
        </div>
        <div className="overflow-auto max-h-[calc(100vh-300px)]">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-card border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Account</th>
                {selectedEntities.map((e) => (
                  <th key={e.code} className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {e.code}
                    <div className="text-[9px] font-normal text-muted-foreground/70 normal-case tracking-normal">{e.currency}</div>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Eliminations
                  <div className="text-[9px] font-normal text-muted-foreground/70 normal-case tracking-normal">CAD</div>
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-primary/5">
                  Consolidated
                  <div className="text-[9px] font-normal text-muted-foreground/70 normal-case tracking-normal">CAD</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isTotal = row.kind === "total";
                const isSub = row.kind === "subtotal";
                return (
                  <tr key={row.id} className={cn("border-b border-border/60", isSub && "bg-muted/20 font-semibold", isTotal && "bg-primary/5 font-bold border-y-2 border-primary/30")}>
                    <td className="px-4 py-2">{row.label}</td>
                    {selectedEntities.map((e) => {
                      const v = row.byEntity?.[e.code] ?? 0;
                      return (
                        <td key={e.code} className="px-4 py-2 text-right tabular-nums">
                          <div>{formatAccounting(v, e.currency)}</div>
                          {e.currency !== "CAD" && (
                            <div className="text-[10px] text-muted-foreground">
                              {formatAccounting(convertToCAD(v, e.currency), "CAD")} CAD
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right tabular-nums text-rose-500">
                      {row.elimination ? formatAccounting(row.elimination) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums bg-primary/5">{formatAccounting(row.current)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Intercompany eliminations</div>
        <ul className="divide-y divide-border">
          {eliminations.map((e, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="text-foreground">{e.label}</span>
              <span className="tabular-nums text-rose-500 font-medium">{formatAccounting(e.amount)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between py-2 text-sm font-semibold border-t-2 border-border">
            <span>Total eliminations</span>
            <span className="tabular-nums text-rose-500">{formatAccounting(eliminations.reduce((s, e) => s + e.amount, 0))}</span>
          </li>
        </ul>
      </Card>
    </ReportShell>
  );
}