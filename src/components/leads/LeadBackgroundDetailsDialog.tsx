import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  EducationExperienceFields,
} from "@/components/clients/registration/EducationExperienceFields";
import { LanguageTestsFields } from "@/components/clients/registration/LanguageTestsFields";
import {
  LeadBackgroundDetailPanel,
  type BackgroundSummaryNavigateTarget,
} from "@/components/leads/LeadBackgroundDetailPanel";
import { countBackgroundItems, hasBackgroundData, type LeadBackgroundState } from "@/lib/leadBackground";
import { buildEnglishTestSwitchPatch } from "@/lib/englishTestScores";
import { loadGeoModule } from "@/lib/geoLocations";
import { preventDialogDismissOnNestedOverlay } from "@/lib/dialogOverlayGuard";
import { EMPTY_LANGUAGE_TESTS, type BackgroundDetailTab } from "@/lib/languageTests";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: LeadBackgroundState;
  onChange: (patch: Partial<LeadBackgroundState>) => void;
  onCommit: () => void | Promise<void>;
  initialTab?: BackgroundDetailTab;
}

function navigateTargetToTab(target: BackgroundSummaryNavigateTarget): BackgroundDetailTab {
  if (target.section === "language") return "language";
  if (target.section === "education") return "education";
  if (target.section === "experience") return "experience";
  return "english";
}

export function LeadBackgroundDetailsDialog({
  open,
  onOpenChange,
  value,
  onChange,
  onCommit,
  initialTab = "english",
}: Props) {
  const [tab, setTab] = useState<BackgroundDetailTab>(initialTab);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      loadGeoModule().catch(() => {});
    }
  }, [open, initialTab]);

  const handleSummaryNavigate = useCallback(
    (target: BackgroundSummaryNavigateTarget) => {
      setTab(navigateTargetToTab(target));
      if (target.section === "english" && target.test) {
        const patch = buildEnglishTestSwitchPatch(value, target.test);
        onChange({
          english_test: patch.english_test ?? null,
          english_test_status: patch.english_test_status ?? null,
          english_overall: patch.english_overall ?? null,
          english_test_date: patch.english_test_date ?? null,
          english_test_expiry: patch.english_test_expiry ?? null,
          english_sections: patch.english_sections ?? {},
        });
      }
    },
    [onChange, value],
  );

  const handleDone = async () => {
    setSaving(true);
    try {
      await onCommit();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const counts = countBackgroundItems(value);
  const showSummary = hasBackgroundData(value);

  const tabBadge = (count: number) =>
    count > 0 ? (
      <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px] font-normal tabular-nums">
        {count}
      </Badge>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={preventDialogDismissOnNestedOverlay}
        onFocusOutside={preventDialogDismissOnNestedOverlay}
        onInteractOutside={preventDialogDismissOnNestedOverlay}
      >
        <DialogHeader>
          <DialogTitle>Background details</DialogTitle>
          <DialogDescription>
            Saved summary below — edit in tabs. Changes apply when you click Done.
          </DialogDescription>
        </DialogHeader>

        {showSummary && (
          <LeadBackgroundDetailPanel
            background={value}
            compact
            onNavigate={handleSummaryNavigate}
          />
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as BackgroundDetailTab)}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="english">
              English
              {tabBadge(counts.english + counts.academic)}
            </TabsTrigger>
            <TabsTrigger value="language">
              Language
              {tabBadge(counts.language)}
            </TabsTrigger>
            <TabsTrigger value="education">
              Education
              {tabBadge(counts.education)}
            </TabsTrigger>
            <TabsTrigger value="experience">
              Experience
              {tabBadge(counts.experience)}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="english" className="mt-4 focus-visible:outline-none">
            <EducationExperienceFields
              value={value}
              onChange={onChange}
              compact
              visibleSections={["english", "academic"]}
            />
          </TabsContent>
          <TabsContent value="language" className="mt-4 focus-visible:outline-none">
            <LanguageTestsFields
              value={value.language_tests ?? EMPTY_LANGUAGE_TESTS}
              onChange={(patch) =>
                onChange({
                  language_tests: {
                    ...(value.language_tests ?? EMPTY_LANGUAGE_TESTS),
                    ...patch,
                  },
                })
              }
            />
          </TabsContent>
          <TabsContent value="education" className="mt-4 focus-visible:outline-none">
            <EducationExperienceFields
              value={value}
              onChange={onChange}
              compact
              visibleSections={["education"]}
            />
          </TabsContent>
          <TabsContent value="experience" className="mt-4 focus-visible:outline-none">
            <EducationExperienceFields
              value={value}
              onChange={onChange}
              compact
              visibleSections={["experience"]}
            />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end pt-2">
          <Button type="button" onClick={handleDone} disabled={saving}>
            {saving ? "Saving…" : "Done"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
