import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ReportPreviewRow } from "@/incentives/lib/reportBuilderCmsLogic";
import { marginHeatClass } from "@/incentives/lib/commercialProfitabilityLogic";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

export function PerformanceReportPreviewTable({
  title,
  rows,
  loading,
  onExportCsv,
}: {
  title: string;
  rows: ReportPreviewRow[];
  loading?: boolean;
  onExportCsv: () => void;
}) {
  const columns = rows[0]?.cells ?? [];

  return (
    <Card className="ph-surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-5 border-b">
        <div>
          <h2 className="text-lg font-semibold ph-heading">Preview</h2>
          <p className="text-xs ph-muted mt-1">{title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">CSV</Badge>
          <Button size="sm" variant="outline" className="gap-1" disabled={loading || rows.length === 0} onClick={onExportCsv}>
            <Download className="size-4" /> Export
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="p-5 text-sm ph-muted">Building report…</p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm ph-muted">
          Select metrics and click Build report — data from fn_commercial_profitability (Phase 3C).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 px-5">Group</th>
                {columns.map((col) => (
                  <th key={col.metric} className="py-3 px-3 text-right">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.groupKey} className="border-b last:border-0">
                  <td className="py-3 px-5 font-semibold ph-heading">{row.groupLabel}</td>
                  {row.cells.map((cell) => (
                    <td key={cell.metric} className="py-3 px-3 text-right tabular-nums font-mono">
                      {cell.metric === "margin" ? (
                        <span
                          className={cn(
                            "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
                            marginHeatClass(cell.raw),
                          )}
                        >
                          {cell.display}
                        </span>
                      ) : (
                        cell.display
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
