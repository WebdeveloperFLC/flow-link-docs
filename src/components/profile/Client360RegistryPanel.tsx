import { Badge } from "@/components/ui/badge";
import type { Client360SectionDefinition } from "@/lib/profile/client360Sections";
import { cn } from "@/lib/utils";

interface Props {
  sections: readonly Client360SectionDefinition[];
  className?: string;
}

/**
 * Phase B scaffolding — lists Client 360 registry sections.
 * Full shell wiring is Phase C.
 */
export function Client360RegistryPanel({ sections, className }: Props) {
  return (
    <div className={cn("rounded-lg border border-dashed p-4 space-y-3", className)}>
      <div>
        <p className="text-sm font-semibold">Client 360 registry</p>
        <p className="text-xs text-muted-foreground mt-1">
          Read-only executive summary shell — sections registered for Phase C cutover.
        </p>
      </div>
      <ul className="space-y-2">
        {sections.map((section) => (
          <li
            key={section.id}
            className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
          >
            <span>{section.label}</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-normal">
                Phase {section.phase}
              </Badge>
              {section.detailTabId && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  tab:{section.detailTabId}
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
