import {
  buildBackgroundDetailSections,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import { cn } from "@/lib/utils";

interface Props {
  background: LeadBackgroundState;
  className?: string;
}

function DetailBlock({ title, lines }: { title: string; lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <ul className="space-y-1">
        {lines.map((line, i) => (
          <li key={i} className="text-sm text-foreground leading-snug break-words">
            {lines.length > 1 ? (
              <>
                <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                {line}
              </>
            ) : (
              line
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LeadBackgroundDetailPanel({ background, className }: Props) {
  const sections = buildBackgroundDetailSections(background);
  const hasAny =
    sections.english.length > 0 ||
    sections.academic.length > 0 ||
    sections.language.length > 0 ||
    sections.education.length > 0 ||
    sections.experience.length > 0;

  if (!hasAny) return null;

  return (
    <div className={cn("border rounded-md p-3 sm:p-4 bg-muted/20 space-y-4", className)}>
      <DetailBlock title="English tests" lines={sections.english} />
      <DetailBlock title="Academic tests" lines={sections.academic} />
      <DetailBlock title="Language tests" lines={sections.language} />
      <DetailBlock title="Education" lines={sections.education} />
      <DetailBlock title="Experience" lines={sections.experience} />
    </div>
  );
}
