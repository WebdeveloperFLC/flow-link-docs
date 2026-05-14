import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ReportRow from "./ReportRow";
import ReportDrilldownModal from "./ReportDrilldownModal";
import type { ReportNode } from "../../types/reports";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: string;
}

interface Props {
  nodes: ReportNode[];
  title?: string;
  toolbar?: ReactNode;
  showVariance?: boolean;
  currency?: "CAD" | "USD" | "INR";
  columns?: Column[];
}

function flatten(nodes: ReportNode[], expandedMap: Record<string, boolean>, depth = 0): { node: ReportNode; depth: number }[] {
  const out: { node: ReportNode; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children?.length && expandedMap[n.id] !== false) {
      out.push(...flatten(n.children, expandedMap, depth + 1));
    }
  }
  return out;
}

export default function ReportTable({ nodes, title, toolbar, showVariance = true, currency = "CAD", columns }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drill, setDrill] = useState<ReportNode | null>(null);

  const toggle = (id: string) => setExpanded((m) => ({ ...m, [id]: m[id] === false }));
  const expandAll = () => setExpanded({});
  const collapseAll = () => {
    const map: Record<string, boolean> = {};
    const walk = (ns: ReportNode[]) => {
      ns.forEach((n) => {
        if (n.children?.length) {
          map[n.id] = false;
          walk(n.children);
        }
      });
    };
    walk(nodes);
    setExpanded(map);
  };

  const rows = flatten(nodes, expanded);
  const cols: Column[] =
    columns ?? [
      { key: "account", label: "Account" },
      { key: "current", label: "Current period", align: "right" },
      { key: "prior", label: "Prior period", align: "right" },
      ...(showVariance ? [{ key: "change", label: "Change %", align: "right" as const }] : []),
    ];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="text-sm font-semibold">{title ?? ""}</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>Expand all</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={collapseAll}>Collapse all</Button>
          {toolbar}
        </div>
      </div>
      <div className="overflow-auto max-h-[calc(100vh-360px)]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-card border-b border-border">
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${c.align === "right" ? "text-right" : "text-left"}`}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ node, depth }) => (
              <ReportRow
                key={node.id}
                node={node}
                depth={depth}
                expanded={expanded[node.id] !== false}
                onToggle={() => toggle(node.id)}
                onDrill={setDrill}
                showVariance={showVariance}
                currency={currency}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ReportDrilldownModal node={drill} onClose={() => setDrill(null)} />
    </Card>
  );
}