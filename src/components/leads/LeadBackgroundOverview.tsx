import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ENGLISH_TEST_STATUS_LABELS,
  summarizeEducation,
  summarizeEnglishTests,
  summarizeExperience,
  summarizeLanguageTests,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import { CEFR_LEVELS, EMPTY_LANGUAGE_TESTS, LANGUAGE_STATUS_LABELS } from "@/lib/languageTests";
import { useMasterItems } from "@/lib/masters";

interface Props {
  background: LeadBackgroundState;
}

export function LeadBackgroundOverview({ background }: Props) {
  const qualificationLevels = useMasterItems("qualification_levels");
  const educationRows = (background.education_history ?? []).filter((e) => e.level || e.institution);
  const jobs = (background.work_experience ?? []).filter((e) => e.company || e.role);
  const lang = background.language_tests ?? EMPTY_LANGUAGE_TESTS;
  const hasAny =
    summarizeEnglishTests(background) !== "Not added" ||
    summarizeLanguageTests(lang) !== "Not added" ||
    educationRows.length > 0 ||
    jobs.length > 0;

  if (!hasAny) return null;

  const levelLabel = (code?: string) =>
    qualificationLevels.find((q) => q.code === code)?.label ?? code;

  const renderLang = (label: string, block: typeof lang.french) => {
    if (!block?.status && !block?.cefr_level && !block?.exam_type) return null;
    return (
      <div className="text-sm border rounded-md p-3 bg-muted/10">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          {block.status && (
            <div>Status: {LANGUAGE_STATUS_LABELS[block.status as keyof typeof LANGUAGE_STATUS_LABELS] ?? block.status}</div>
          )}
          {block.cefr_level && CEFR_LEVELS.includes(block.cefr_level as never) && (
            <div>CEFR: {block.cefr_level}</div>
          )}
          {block.exam_type && <div>Exam: {block.exam_type}</div>}
          {block.overall_score && <div>Score: {block.overall_score}</div>}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-semibold">Background details</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">English</div>
          <div>{summarizeEnglishTests(background)}</div>
          {background.english_test_status && (
            <div className="text-xs text-muted-foreground mt-1">
              Status: {ENGLISH_TEST_STATUS_LABELS[background.english_test_status as keyof typeof ENGLISH_TEST_STATUS_LABELS] ?? background.english_test_status}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Language</div>
          <div>{summarizeLanguageTests(lang)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Education</div>
          <div>{summarizeEducation(background)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Experience</div>
          <div>{summarizeExperience(background)}</div>
        </div>
      </div>

      {(lang.french || lang.german) && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Language tests</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {renderLang("French", lang.french)}
            {renderLang("German", lang.german)}
          </div>
        </div>
      )}

      {educationRows.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Education history</div>
          {educationRows.map((e, i) => (
            <div key={i} className="text-sm border rounded-md p-3 bg-muted/10 flex flex-wrap gap-2 items-center">
              {e.level && <Badge variant="secondary">{levelLabel(e.level)}</Badge>}
              <span>{[e.institution, e.specialization, e.country].filter(Boolean).join(" · ")}</span>
              {e.year && <span className="text-muted-foreground text-xs">{e.year}</span>}
              {e.percentage_cgpa && <span className="text-muted-foreground text-xs">{e.percentage_cgpa}</span>}
            </div>
          ))}
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Work experience</div>
          {jobs.map((e, i) => (
            <div key={i} className="text-sm border rounded-md p-3 bg-muted/10">
              <div className="font-medium">{[e.role, e.company].filter(Boolean).join(" · ")}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {[e.start_date, e.currently_working ? "Present" : e.end_date, e.country].filter(Boolean).join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
