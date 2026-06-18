import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EducationExperienceFields } from "@/components/clients/registration/EducationExperienceFields";
import { LanguageTestsFields } from "@/components/clients/registration/LanguageTestsFields";
import { fetchClient, upsertClientRegistration } from "@/lib/clientRegistration";
import {
  backgroundStateToLeadDraft,
  countBackgroundItems,
  EMPTY_LEAD_BACKGROUND,
  leadToBackgroundState,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import { syncEducationHistoryToClientEducation } from "@/lib/clientBackgroundSync";
import { loadGeoModule } from "@/lib/geoLocations";
import { EMPTY_LANGUAGE_TESTS, type BackgroundDetailTab } from "@/lib/languageTests";
import { appendClientActivityLog } from "@/lib/clientActivityLog";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
  canEdit: boolean;
  refreshKey?: number;
  onSaved?: () => void;
}

export function ClientBackgroundProfileSection({
  clientId,
  canEdit,
  refreshKey = 0,
  onSaved,
}: Props) {
  const [tab, setTab] = useState<BackgroundDetailTab>("english");
  const [bg, setBg] = useState<LeadBackgroundState>(EMPTY_LEAD_BACKGROUND);
  const bgRef = useRef(bg);
  bgRef.current = bg;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const client = await fetchClient(clientId);
      if (client) {
        setBg(leadToBackgroundState(client));
      }
    } catch (e) {
      console.error("[ClientBackgroundProfileSection] load failed", e);
      toast.error("Failed to load tests and background details");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadGeoModule().catch(() => {});
    load();
  }, [load, refreshKey]);

  const handleChange = (patch: Partial<LeadBackgroundState>) => {
    setBg((prev) => ({ ...prev, ...patch }));
  };

  const saveBackground = useCallback(async () => {
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      const patch = backgroundStateToLeadDraft(bgRef.current);
      await upsertClientRegistration(clientId, patch);
      await syncEducationHistoryToClientEducation(clientId, patch.education_history);
      await appendClientActivityLog({
        clientId,
        action: "profile_updated",
        summary: "Background details updated (tests, education, experience)",
      });
      toast.success("Background details saved");
      onSaved?.();
    } catch (e) {
      console.error("[ClientBackgroundProfileSection] save failed", e);
      toast.error(e instanceof Error ? e.message : "Failed to save background details");
    } finally {
      setSaving(false);
    }
  }, [canEdit, clientId, onSaved, saving]);

  const counts = countBackgroundItems(bg);

  const tabBadge = (count: number) =>
    count > 0 ? (
      <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px] font-normal tabular-nums">
        {count}
      </Badge>
    ) : null;

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="gradient-brand px-4 sm:px-6 py-3 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold flex items-center gap-1.5 text-sm sm:text-base">
              <GraduationCap className="size-4" /> Tests, education & experience
            </div>
            <div className="text-[11px] text-primary-foreground/80 mt-0.5">
              Same fields as the lead form — fill in or update English, language, education, and work history
            </div>
          </div>
          {canEdit && saving && (
            <span className="inline-flex items-center gap-1.5 text-xs text-primary-foreground/90">
              <Loader2 className="size-3.5 animate-spin" /> Saving…
            </span>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading background details…</div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as BackgroundDetailTab)}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="english" className="text-xs sm:text-sm">
                English test
                {tabBadge(counts.english + counts.academic)}
              </TabsTrigger>
              <TabsTrigger value="language" className="text-xs sm:text-sm">
                Language test
                {tabBadge(counts.language)}
              </TabsTrigger>
              <TabsTrigger value="education" className="text-xs sm:text-sm">
                Education
                {tabBadge(counts.education)}
              </TabsTrigger>
              <TabsTrigger value="experience" className="text-xs sm:text-sm">
                Experience
                {tabBadge(counts.experience)}
              </TabsTrigger>
            </TabsList>

            <div className={cn(!canEdit && "pointer-events-none opacity-75")}>
              <TabsContent value="english" className="mt-4 focus-visible:outline-none">
                <EducationExperienceFields
                  value={bg}
                  onChange={handleChange}
                  onCommit={saveBackground}
                  compact
                  visibleSections={["english", "academic"]}
                />
              </TabsContent>
              <TabsContent value="language" className="mt-4 focus-visible:outline-none">
                <LanguageTestsFields
                  value={bg.language_tests ?? EMPTY_LANGUAGE_TESTS}
                  onChange={(patch) =>
                    handleChange({
                      language_tests: {
                        ...(bg.language_tests ?? EMPTY_LANGUAGE_TESTS),
                        ...patch,
                      },
                    })
                  }
                  onCommit={saveBackground}
                />
              </TabsContent>
              <TabsContent value="education" className="mt-4 focus-visible:outline-none">
                <EducationExperienceFields
                  value={bg}
                  onChange={handleChange}
                  onCommit={saveBackground}
                  compact
                  visibleSections={["education"]}
                />
              </TabsContent>
              <TabsContent value="experience" className="mt-4 focus-visible:outline-none">
                <EducationExperienceFields
                  value={bg}
                  onChange={handleChange}
                  onCommit={saveBackground}
                  compact
                  visibleSections={["experience"]}
                />
              </TabsContent>
            </div>
          </Tabs>
        )}

        {canEdit && !loading && (
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button type="button" onClick={saveBackground} disabled={saving}>
              {saving ? "Saving…" : "Save background details"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
