import { LucideIcon, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type StatTone =
  | "clients"
  | "documents"
  | "binders"
  | "review"
  | "institutions"
  | "ai";

const toneStyles: Record<StatTone, { bar: string; chipBg: string; chipText: string }> = {
  clients: { bar: "bg-clients", chipBg: "bg-clients-soft", chipText: "text-clients" },
  documents: { bar: "bg-documents", chipBg: "bg-documents-soft", chipText: "text-documents" },
  binders: { bar: "bg-binders", chipBg: "bg-binders-soft", chipText: "text-binders" },
  review: { bar: "bg-review", chipBg: "bg-review-soft", chipText: "text-review" },
  institutions: { bar: "bg-institutions", chipBg: "bg-institutions-soft", chipText: "text-institutions" },
  ai: { bar: "bg-ai", chipBg: "bg-ai-soft", chipText: "text-ai" },
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: StatTone;
  to?: string;
  hint?: string;
  /** Migration / data-scope tooltip on the KPI label */
  info?: string;
}

export function StatCard({ label, value, icon: Icon, tone, to, hint, info }: StatCardProps) {
  const t = toneStyles[tone];
  const content = (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-elev-sm transition-shadow hover:shadow-elev-md">
      <span className={cn("absolute left-0 top-0 h-full w-1", t.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span>{label}</span>
            {info && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex rounded-sm text-muted-foreground/80 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`About ${label}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Info className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs font-normal normal-case tracking-normal">
                    {info}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="font-display mt-2 text-3xl font-bold tabular-nums text-foreground">
            {value}
          </div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", t.chipBg)}>
          <Icon className={cn("size-5", t.chipText)} />
        </div>
      </div>
    </div>
  );
  if (to) return <Link to={to} className="block">{content}</Link>;
  return content;
}