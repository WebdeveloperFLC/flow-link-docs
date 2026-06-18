import { useState } from "react";
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
  type EducationExperienceSection,
} from "@/components/clients/registration/EducationExperienceFields";
import type { LeadBackgroundState } from "@/lib/leadBackground";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: LeadBackgroundState;
  onChange: (patch: Partial<LeadBackgroundState>) => void;
  onCommit: () => void;
  initialTab?: EducationExperienceSection;
}

export function LeadBackgroundDetailsDialog({
  open,
  onOpenChange,
  value,
  onChange,
  onCommit,
  initialTab = "tests",
}: Props) {
  const [tab, setTab] = useState<EducationExperienceSection>(initialTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Background details</DialogTitle>
          <DialogDescription>
            Optional tests, education, and experience. Nothing here is required to save the lead.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as EducationExperienceSection)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
          </TabsList>
          <TabsContent value="tests" className="mt-4">
            <EducationExperienceFields
              value={value}
              onChange={onChange}
              onCommit={onCommit}
              compact
              visibleSections={["tests"]}
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
