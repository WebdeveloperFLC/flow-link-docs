import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import {
  hasBackgroundData,
  summarizeEducation,
  summarizeExperience,
  summarizeTests,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import {
  LeadBackgroundDetailsDialog,
} from "@/components/leads/LeadBackgroundDetailsDialog";
import type { EducationExperienceSection } from "@/components/clients/registration/EducationExperienceFields";
import { cn } from "@/lib/utils";

interface Props {
  value: LeadBackgroundState;
  onChange: (patch: Partial<LeadBackgroundState>) => void;
  onCommit: () => void;
}

const Column = ({ label, summary }: { label: string; summary: string }) => (
  <div className="space-y-1 min-w-0">
    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className={cn("text-sm truncate", summary === "Not added" && "text-muted-foreground")}>{summary}</div>
  </div>
);

export function LeadBackgroundSummaryCard({ value, onChange, onCommit }: Props) {
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<EducationExperienceSection>("tests");

  const openDialog = (tab: EducationExperienceSection) => {
    setInitialTab(tab);
    setOpen(true);
  };

  return (
    <>
      <Card className="p-4 sm:p-5 space-y-4 border-dashed">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">3.5 Background details</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Optional — tests, education history, work experience</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => openDialog("tests")}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit details
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button type="button" className="text-left rounded-md hover:bg-muted/40 p-2 -m-2 transition-colors" onClick={() => openDialog("tests")}>
            <Column label="Tests" summary={summarizeTests(value)} />
          </button>
          <button type="button" className="text-left rounded-md hover:bg-muted/40 p-2 -m-2 transition-colors" onClick={() => openDialog("education")}>
            <Column label="Education" summary={summarizeEducation(value)} />
          </button>
          <button type="button" className="text-left rounded-md hover:bg-muted/40 p-2 -m-2 transition-colors" onClick={() => openDialog("experience")}>
            <Column label="Experience" summary={summarizeExperience(value)} />
          </button>
        </div>

        {hasBackgroundData(value) && (
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setPreviewOpen((v) => !v)}
            >
              {previewOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {previewOpen ? "Hide preview" : "Show preview"}
            </button>
            {previewOpen && (
              <div className="mt-3 text-xs space-y-2 text-muted-foreground border rounded-md p-3 bg-muted/20">
                <div><span className="font-medium text-foreground">Tests:</span> {summarizeTests(value)}</div>
                {(value.education_history ?? []).filter((e) => e.level || e.institution).map((e, i) => (
                  <div key={i}>
                    <span className="font-medium text-foreground">Education {i + 1}:</span>{" "}
                    {[e.level, e.institution, e.year].filter(Boolean).join(" · ") || "—"}
                  </div>
                ))}
                {(value.work_experience ?? []).filter((e) => e.company || e.role).map((e, i) => (
                  <div key={i}>
                    <span className="font-medium text-foreground">Job {i + 1}:</span>{" "}
                    {[e.role, e.company].filter(Boolean).join(" at ") || "—"}
                  </div>
                ))}
              </div>
            )}
          </div>
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
