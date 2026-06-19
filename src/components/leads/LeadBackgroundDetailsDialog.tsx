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
import { Badge } from "@/components/ui/badge";
import { LeadProfileDetailsEditor } from "@/components/leads/LeadProfileDetailsEditor";
import { countBackgroundItems, type LeadBackgroundState } from "@/lib/leadBackground";
import { loadGeoModule } from "@/lib/geoLocations";
import { preventDialogDismissOnNestedOverlay } from "@/lib/dialogOverlayGuard";
import type { BackgroundDetailTab } from "@/lib/languageTests";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: LeadBackgroundState;
  onChange: (patch: Partial<LeadBackgroundState>) => void;
  onCommit: () => void | Promise<void>;
  initialTab?: BackgroundDetailTab;
}

function normalizeTab(tab: BackgroundDetailTab): BackgroundDetailTab {
  if (tab === "english" || tab === "language") return "tests";
  return tab;
}

export function LeadBackgroundDetailsDialog({
  open,
  onOpenChange,
  value,
  onChange,
  onCommit,
  initialTab = "tests",
}: Props) {
  const [tab, setTab] = useState<BackgroundDetailTab>(normalizeTab(initialTab));
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(normalizeTab(initialTab));
      setEditorResetKey((k) => k + 1);
      loadGeoModule().catch(() => {});
    }
  }, [open, initialTab]);

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
  const testsCount = counts.english + counts.academic + counts.language;

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
            Same fields as client profile — document linking unlocks after registration.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as BackgroundDetailTab)}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="tests">
              Tests
              {tabBadge(testsCount)}
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
          <TabsContent value="tests" className="mt-4 focus-visible:outline-none">
            <LeadProfileDetailsEditor
              key={`tests-${editorResetKey}`}
              value={value}
              onChange={onChange}
              activeTab="tests"
              resetKey={editorResetKey}
            />
          </TabsContent>
          <TabsContent value="education" className="mt-4 focus-visible:outline-none">
            <LeadProfileDetailsEditor
              key={`education-${editorResetKey}`}
              value={value}
              onChange={onChange}
              activeTab="education"
              resetKey={editorResetKey}
            />
          </TabsContent>
          <TabsContent value="experience" className="mt-4 focus-visible:outline-none">
            <LeadProfileDetailsEditor
              key={`experience-${editorResetKey}`}
              value={value}
              onChange={onChange}
              activeTab="experience"
              resetKey={editorResetKey}
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
