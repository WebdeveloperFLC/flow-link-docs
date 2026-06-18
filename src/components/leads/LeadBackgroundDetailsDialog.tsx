import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  EducationExperienceFields,
} from "@/components/clients/registration/EducationExperienceFields";
import { LanguageTestsFields } from "@/components/clients/registration/LanguageTestsFields";
import type { LeadBackgroundState } from "@/lib/leadBackground";
import { EMPTY_LANGUAGE_TESTS, type BackgroundDetailTab } from "@/lib/languageTests";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: LeadBackgroundState;
  onChange: (patch: Partial<LeadBackgroundState>) => void;
  onCommit: () => void;
  initialTab?: BackgroundDetailTab;
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

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Background details</DialogTitle>
          <DialogDescription>
            Optional tests, education, and experience. Nothing here is required to save the lead.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as BackgroundDetailTab)}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="english">English</TabsTrigger>
            <TabsTrigger value="language">Language</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
          </TabsList>
          <TabsContent value="english" className="mt-4">
            <EducationExperienceFields
              value={value}
              onChange={onChange}
              onCommit={onCommit}
              compact
              visibleSections={["english", "academic"]}
            />
          </TabsContent>
          <TabsContent value="language" className="mt-4">
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
              onCommit={onCommit}
            />
          </TabsContent>
          <TabsContent value="education" className="mt-4">
            <EducationExperienceFields
              value={value}
              onChange={onChange}
              onCommit={onCommit}
              compact
              visibleSections={["education"]}
            />
          </TabsContent>
          <TabsContent value="experience" className="mt-4">
            <EducationExperienceFields
              value={value}
              onChange={onChange}
              onCommit={onCommit}
              compact
              visibleSections={["experience"]}
            />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={() => {
              onCommit();
              onOpenChange(false);
            }}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
