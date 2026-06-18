import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  hasBackgroundData,
  listLanguageTestDetails,
  summarizeEducation,
  summarizeEnglishTests,
  summarizeExperience,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import { LeadBackgroundDetailsDialog } from "@/components/leads/LeadBackgroundDetailsDialog";
import { LeadBackgroundDetailPanel } from "@/components/leads/LeadBackgroundDetailPanel";
import { type BackgroundDetailTab } from "@/lib/languageTests";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
        "text-sm leading-snug break-words whitespace-pre-wrap",
        summary === "Not added" && "text-muted-foreground italic",
      )}
    >
      {summary}
    </div>
  </div>
);

export function LeadBackgroundSummaryCard({ value, onChange, onCommit }: Props) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<BackgroundDetailTab>("english");
  const langLines = listLanguageTestDetails(value);
  const langSummary = langLines.length ? langLines.join("\n") : "Not added";
  const hasData = hasBackgroundData(value);

  const openDialog = (tab: BackgroundDetailTab) => {
    setInitialTab(tab);
    setOpen(true);
  };

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button type="button" className="text-left rounded-md hover:bg-muted/40 p-2 -m-2 transition-colors" onClick={() => openDialog("english")}>
            <Column label="English & academic" summary={summarizeEnglishTests(value)} />
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
          <LeadBackgroundDetailPanel background={value} />
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
