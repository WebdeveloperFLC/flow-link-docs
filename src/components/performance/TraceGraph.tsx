import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ChevronRight, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export type TraceGraphNode = {
  id: string;
  label: string;
  sublabel?: string;
  rule?: string;
  to?: string;
};

interface TraceGraphProps {
  entryLabel: string;
  direction?: "downstream" | "upstream";
  nodes: TraceGraphNode[];
  className?: string;
}

/**
 * Read-only lineage spine (Bible §3.4, §6.8).
 * Displays governing rules; never recalculates amounts.
 */
export function TraceGraph({ entryLabel, direction = "downstream", nodes, className }: TraceGraphProps) {
  if (nodes.length === 0) {
    return (
      <Card className={cn("p-4 ph-surface-card text-sm ph-muted", className)}>
        No trace nodes for {entryLabel}.
      </Card>
    );
  }

  return (
    <Card className={cn("p-5 ph-surface-card", className)}>
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="size-4 ph-muted" />
        <div>
          <p className="text-[11px] uppercase tracking-wide ph-muted font-medium">Trace · {direction}</p>
          <p className="text-sm font-medium ph-heading">{entryLabel}</p>
        </div>
      </div>
      <ol className="space-y-0 border-l border-border/80 ml-2 pl-4">
        {nodes.map((node, i) => (
          <li key={node.id} className="relative pb-4 last:pb-0">
            <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary/80 ring-2 ring-background" />
            {node.to ? (
              <Link to={node.to} className="block rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors">
                <NodeBody node={node} />
              </Link>
            ) : (
              <div className="rounded-md border px-3 py-2 bg-muted/20">
                <NodeBody node={node} />
              </div>
            )}
            {i < nodes.length - 1 && <span className="sr-only">then</span>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function NodeBody({ node }: { node: TraceGraphNode }) {
  return (
    <>
      <p className="text-sm font-medium ph-heading">{node.label}</p>
      {node.sublabel && <p className="text-xs ph-muted mt-0.5">{node.sublabel}</p>}
      {node.rule && (
        <p className="text-[11px] ph-muted mt-1.5 italic">Rule: {node.rule}</p>
      )}
    </>
  );
}
