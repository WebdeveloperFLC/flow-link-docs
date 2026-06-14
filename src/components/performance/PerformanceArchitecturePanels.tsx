import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ARCHITECTURE_API_ROWS,
  ARCHITECTURE_TABLES,
  methodBadgeClass,
} from "@/incentives/lib/architectureCmsLogic";
import { cn } from "@/lib/utils";

export function PerformanceArchitectureTablesPanel() {
  return (
    <Card className="ph-surface-card overflow-hidden h-full">
      <div className="p-5 border-b">
        <h2 className="text-lg font-semibold ph-heading">Core database tables</h2>
        <p className="text-xs ph-muted mt-1">{ARCHITECTURE_TABLES.length} entities · Supabase public schema</p>
      </div>
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {ARCHITECTURE_TABLES.map((row) => (
              <tr key={row.name} className="border-b last:border-0">
                <td className="py-2.5 px-4 font-mono text-xs ph-heading whitespace-nowrap align-top">
                  {row.name}
                </td>
                <td className="py-2.5 px-4 text-xs ph-muted align-top">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function PerformanceArchitectureApiPanel() {
  return (
    <Card className="ph-surface-card overflow-hidden h-full">
      <div className="p-5 border-b">
        <h2 className="text-lg font-semibold ph-heading">REST API surface</h2>
        <p className="text-xs ph-muted mt-1">v1 reference · implemented as Supabase RPC + RLS</p>
      </div>
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {ARCHITECTURE_API_ROWS.map((row) => (
              <tr key={`${row.method}-${row.path}`} className="border-b last:border-0">
                <td className="py-2.5 px-4 align-top">
                  <Badge
                    variant="outline"
                    className={cn("font-mono text-[10px] border", methodBadgeClass(row.method))}
                  >
                    {row.method}
                  </Badge>
                </td>
                <td className="py-2.5 px-2 font-mono text-xs ph-heading align-top">{row.path}</td>
                <td className="py-2.5 px-4 text-xs ph-muted align-top">
                  <div>{row.description}</div>
                  {row.implementation && (
                    <div className="text-[10px] mt-1 opacity-80">→ {row.implementation}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
