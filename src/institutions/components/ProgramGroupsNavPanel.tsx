import { Layers, ListTree } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProgramGroupSummary } from "../lib/programGroups";

export function ProgramGroupsNavPanel({
  groups,
  selectedKey,
  onSelect,
  totalOfferings,
  className,
}: {
  groups: ProgramGroupSummary[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  totalOfferings: number;
  className?: string;
}) {
  const activeKey = selectedKey ?? "all";

  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <div className="px-3 py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ListTree className="size-3.5" />
          Program groups
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
          Grouped by program identity (dedup hash). Select a program to focus its offerings.
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[min(70vh,720px)]">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
            activeKey === "all"
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-accent/60 text-foreground",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <Layers className="size-3.5 shrink-0 opacity-70" />
              <span className="truncate">All programs</span>
            </span>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {totalOfferings}
            </Badge>
          </div>
        </button>

        {groups.length === 0 ? (
          <div className="px-3 py-6 text-xs text-muted-foreground text-center">
            No program groups match the current filters.
          </div>
        ) : (
          groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => onSelect(g.key)}
              className={cn(
                "w-full text-left rounded-md px-3 py-2.5 text-sm transition-colors border border-transparent",
                activeKey === g.key
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "hover:bg-accent/60",
              )}
            >
              <div className="font-medium leading-snug line-clamp-2">{g.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>{g.levelLabel}</span>
                <span>·</span>
                <span>
                  {g.offeringCount} offering{g.offeringCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {g.publishedCount > 0 ? (
                  <Badge className="text-[9px] h-5 bg-success/15 text-success border-0">
                    {g.publishedCount} live
                  </Badge>
                ) : null}
                {g.pendingCount > 0 ? (
                  <Badge variant="outline" className="text-[9px] h-5 border-amber-500/40 text-amber-700">
                    {g.pendingCount} pending
                  </Badge>
                ) : null}
              </div>
            </button>
          ))
        )}
      </nav>
    </Card>
  );
}
