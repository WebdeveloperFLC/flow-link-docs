import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import {
  countBackgroundItems,
  hasBackgroundData,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import { LeadBackgroundDetailsDialog } from "@/components/leads/LeadBackgroundDetailsDialog";
import { LeadBackgroundDetailPanel } from "@/components/leads/LeadBackgroundDetailPanel";
import { type BackgroundDetailTab } from "@/lib/languageTests";
import { useState } from "react";

interface Props {
  value: LeadBackgroundState;
  onChange: (patch: Partial<LeadBackgroundState>) => void;
  onCommit: () => void | Promise<void>;
}

export function LeadBackgroundSummaryCard({ value, onChange, onCommit }: Props) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<BackgroundDetailTab>("tests");
  const hasData = hasBackgroundData(value);
  const counts = countBackgroundItems(value);

  const openDialog = (tab: BackgroundDetailTab) => {
    setInitialTab(tab);
    setOpen(true);
  };

  const badges = [
    counts.english + counts.academic + counts.language > 0 && {
      label: "Tests",
      count: counts.english + counts.academic + counts.language,
      tab: "tests" as const,
    },
    counts.education > 0 && { label: "Education", count: counts.education, tab: "education" as const },
    counts.experience > 0 && { label: "Experience", count: counts.experience, tab: "experience" as const },
  ].filter(Boolean) as { label: string; count: number; tab: BackgroundDetailTab }[];

  return (
    <>
      <Card className="p-4 sm:p-5 space-y-4 border-dashed">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">3.5 Background details</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Optional — English, language, education, experience</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => openDialog("tests")}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit details
          </Button>
        </div>

        {hasData ? (
          <>
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <button key={b.label} type="button" onClick={() => openDialog(b.tab)}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 font-normal">
                      {b.label} · {b.count}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
            <LeadBackgroundDetailPanel background={value} />
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No background details yet — click Edit details to add tests, education, or experience.
          </p>
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
