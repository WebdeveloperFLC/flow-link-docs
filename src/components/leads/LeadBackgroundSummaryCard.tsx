import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import {
  educationEntryHasData,
  experienceEntryHasData,
  formatEducationEntrySummary,
  formatExperienceEntrySummary,
  hasBackgroundData,
  summarizeEducation,
  summarizeEnglishTests,
  summarizeExperience,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import { LeadBackgroundDetailsDialog } from "@/components/leads/LeadBackgroundDetailsDialog";
import { EMPTY_LANGUAGE_TESTS, type BackgroundDetailTab } from "@/lib/languageTests";
import { summarizeLanguageTests } from "@/lib/languageTests";
import { cn } from "@/lib/utils";

interface Props {
  value: LeadBackgroundState;
  onChange: (patch: Partial<LeadBackgroundState>) => void;
  onCommit: () => void | Promise<void>;
}

const Column = ({ label, summary }: { label: string; summary: string }) => (
  <div className="space-y-1 min-w-0">
    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
    <div
      className={cn(
        "text-sm line-clamp-2",
        summary === "Not added" && "text-muted-foreground italic",
      )}
      title={summary}
    >
      {summary}
    </div>
  </div>
);

export function LeadBackgroundSummaryCard({ value, onChange, onCommit }: Props) {
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<BackgroundDetailTab>("english");
  const langSummary = summarizeLanguageTests(value.language_tests ?? EMPTY_LANGUAGE_TESTS);
  const hasData = hasBackgroundData(value);

  useEffect(() => {
    if (hasData) setPreviewOpen(true);
  }, [hasData]);

  const openDialog = (tab: BackgroundDetailTab) => {
    setInitialTab(tab);
    setOpen(true);
  };

  const educationRows = (value.education_history ?? []).filter(educationEntryHasData);
  const experienceRows = (value.work_experience ?? []).filter(experienceEntryHasData);

  return (
    <>
      <Card className="p-4 sm:p-5 space-y-4 border-dashed">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">3.5 Background details</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Optional — English, language, education, experience</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => openDialog("english")}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit details
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button type="button" className="text-left rounded-md hover:bg-muted/40 p-2 -m-2 transition-colors" onClick={() => openDialog("english")}>
            <Column label="English" summary={summarizeEnglishTests(value)} />
          </button>
          <button type="button" className="text-left rounded-md hover:bg-muted/40 p-2 -m-2 transition-colors" onClick={() => openDialog("language")}>
            <Column label="Language" summary={langSummary} />
          </button>
          <button type="button" className="text-left rounded-md hover:bg-muted/40 p-2 -m-2 transition-colors" onClick={() => openDialog("education")}>
            <Column label="Education" summary={summarizeEducation(value)} />
          </button>
          <button type="button" className="text-left rounded-md hover:bg-muted/40 p-2 -m-2 transition-colors" onClick={() => openDialog("experience")}>
            <Column label="Experience" summary={summarizeExperience(value)} />
          </button>
        </div>

        {hasData ? (
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setPreviewOpen((v) => !v)}
            >
              {previewOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {previewOpen ? "Hide saved details" : "Show saved details"}
            </button>
            {previewOpen && (
              <div className="mt-3 text-xs space-y-2 text-muted-foreground border rounded-md p-3 bg-muted/20">
                <div><span className="font-medium text-foreground">English:</span> {summarizeEnglishTests(value)}</div>
                <div><span className="font-medium text-foreground">Language:</span> {langSummary}</div>
                {educationRows.map((e, i) => (
                  <div key={i}>
                    <span className="font-medium text-foreground">Education {i + 1}:</span>{" "}
                    {formatEducationEntrySummary(e) || "—"}
                  </div>
                ))}
                {experienceRows.map((e, i) => (
                  <div key={i}>
                    <span className="font-medium text-foreground">Experience {i + 1}:</span>{" "}
                    {formatExperienceEntrySummary(e) || "—"}
                  </div>
                ))}
                {(value.other_tests ?? []).filter((t) => t.type).map((t, i) => (
                  <div key={`ac-${i}`}>
                    <span className="font-medium text-foreground">{t.type}:</span>{" "}
                    {[t.score, t.date].filter(Boolean).join(" · ") || "Added"}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No background details yet — click Edit details to add tests, education, or experience.</p>
        )}
      </Card>

      <LeadBackgroundDetailsDialog
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={onChange}
        onCommit={onCommit}
        initialTab={initialTab}
      />
    </>
  );
}
