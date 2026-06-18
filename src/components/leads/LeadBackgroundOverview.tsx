import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  educationEntryHasData,
  experienceEntryHasData,
  formatEducationEntrySummary,
  formatExperienceEntrySummary,
  hasBackgroundData,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import { LeadBackgroundDetailPanel } from "@/components/leads/LeadBackgroundDetailPanel";
import { useMasterItems } from "@/lib/masters";

interface Props {
  background: LeadBackgroundState;
}

export function LeadBackgroundOverview({ background }: Props) {
  const qualificationLevels = useMasterItems("qualification_levels");
  const educationRows = (background.education_history ?? []).filter(educationEntryHasData);
  const jobs = (background.work_experience ?? []).filter(experienceEntryHasData);

  if (!hasBackgroundData(background)) return null;

  const levelLabel = (code?: string) =>
    qualificationLevels.find((q) => q.code === code)?.label ?? code;

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-semibold">Background details</h3>

      <LeadBackgroundDetailPanel background={background} />

      {educationRows.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Education history</div>
          {educationRows.map((e, i) => (
            <div key={i} className="text-sm border rounded-md p-3 bg-muted/10 flex flex-wrap gap-2 items-center">
              {e.level && <Badge variant="secondary">{levelLabel(e.level)}</Badge>}
              <span>{formatEducationEntrySummary(e) || "—"}</span>
            </div>
          ))}
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Work experience</div>
          {jobs.map((e, i) => (
            <div key={i} className="text-sm border rounded-md p-3 bg-muted/10">
              <div className="font-medium">{formatExperienceEntrySummary(e) || "—"}</div>
              {e.description && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
