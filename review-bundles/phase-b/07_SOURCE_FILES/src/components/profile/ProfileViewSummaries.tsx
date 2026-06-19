import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProfileSectionSummary } from "@/lib/profile/types";
import type { ProfileSectionId } from "@/lib/profile/types";

interface Props {
  summaries: ProfileSectionSummary[];
  activeSection?: ProfileSectionId;
  canEdit?: boolean;
  onNavigate?: (section: ProfileSectionId) => void;
  onEdit?: (section: ProfileSectionId) => void;
  className?: string;
}

export function ProfileViewSummaries({
  summaries,
  activeSection,
  canEdit,
  onNavigate,
  onEdit,
  className,
}: Props) {
  const visible = activeSection
    ? summaries.filter((s) => s.section === activeSection)
    : summaries;

  return (
    <div className={cn("space-y-3", className)}>
      {visible.map((summary) => {
        const interactive = canEdit && (onNavigate || onEdit);
        const Wrapper = interactive ? "button" : "div";
        return (
          <Wrapper
            key={summary.section}
            type={interactive ? "button" : undefined}
            onClick={() => {
              onNavigate?.(summary.section);
              onEdit?.(summary.section);
            }}
            className={cn(
              "w-full rounded-lg border bg-background p-3 text-left",
              interactive && "hover:bg-accent/40 transition-colors cursor-pointer",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{summary.headline}</span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {summary.section}
              </Badge>
            </div>
            {summary.lines.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {summary.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No details captured yet</p>
            )}
          </Wrapper>
        );
      })}
    </div>
  );
}
