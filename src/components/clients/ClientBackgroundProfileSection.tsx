import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EducationExperienceFields } from "@/components/clients/registration/EducationExperienceFields";
import { LanguageTestsFields } from "@/components/clients/registration/LanguageTestsFields";
import { LeadBackgroundDetailPanel } from "@/components/leads/LeadBackgroundDetailPanel";
import { fetchClient, upsertClientRegistration } from "@/lib/clientRegistration";
import type { Lead } from "@/lib/leads";
import {
  backgroundStateToLeadDraft,
  countBackgroundItems,
  EMPTY_LEAD_BACKGROUND,
  hasBackgroundData,
  leadToBackgroundState,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import { syncEducationHistoryToClientEducation } from "@/lib/clientBackgroundSync";
import { loadGeoModule } from "@/lib/geoLocations";
import { EMPTY_LANGUAGE_TESTS, type BackgroundDetailTab } from "@/lib/languageTests";
import { appendClientActivityLog } from "@/lib/clientActivityLog";
import { toast } from "sonner";
import { GraduationCap, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionMode = "view" | "edit";

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
  const [mode, setMode] = useState<SectionMode>("view");
  const bgRef = useRef(bg);
  bgRef.current = bg;
  const savingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const client = await fetchClient(clientId);
      if (client) {
        const next = leadToBackgroundState(client as Partial<Lead>);
        setBg(next);
        setMode(hasBackgroundData(next) ? "view" : canEdit ? "edit" : "view");
      }
    } catch (e) {
      console.error("[ClientBackgroundProfileSection] load failed", e);
      toast.error("Failed to load tests and background details");
    } finally {
      setLoading(false);
    }
  }, [clientId, canEdit]);

  useEffect(() => {
    loadGeoModule().catch(() => {});
    load();
  }, [load, refreshKey]);

  const handleChange = (patch: Partial<LeadBackgroundState>) => {
    setBg((prev) => ({ ...prev, ...patch }));
  };

  const saveBackground = useCallback(async () => {
    if (!canEdit || savingRef.current) return;
    savingRef.current = true;
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
      await load();
      setMode("view");
      onSaved?.();
    } catch (e) {
      console.error("[ClientBackgroundProfileSection] save failed", e);
      toast.error(e instanceof Error ? e.message : "Failed to save background details");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [canEdit, clientId, load, onSaved]);

  const counts = countBackgroundItems(bg);
  const showView = mode === "view";

  const tabBadge = (count: number) =>
    count > 0 ? (
      <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px] font-normal tabular-nums">
        {count}
      </Badge>
    ) : null;

  const summaryBadges = [
    counts.english + counts.academic > 0 && { label: "Tests", count: counts.english + counts.academic },
    counts.language > 0 && { label: "Language", count: counts.language },
    counts.education > 0 && { label: "Education", count: counts.education },
    counts.experience > 0 && { label: "Experience", count: counts.experience },
  ].filter(Boolean) as { label: string; count: number }[];

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="gradient-brand px-4 sm:px-6 py-3 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold flex items-center gap-1.5 text-sm sm:text-base">
              <GraduationCap className="size-4" /> Tests, education & experience
            </div>
            <div className="text-[11px] text-primary-foreground/80 mt-0.5">
              {showView
                ? "Saved tests, qualifications, and work history"
                : "Same fields as the lead form — English, language, education, and experience"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && saving && (
              <span className="inline-flex items-center gap-1.5 text-xs text-primary-foreground/90">
                <Loader2 className="size-3.5 animate-spin" /> Saving…
              </span>
            )}
            {canEdit && !loading && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 text-xs bg-white/15 text-primary-foreground border-0 hover:bg-white/25"
                onClick={() => {
                  if (showView) {
                    setMode("edit");
                  } else {
                    void load();
                  }
                }}
              >
                {showView ? (
                  <>
                    <Pencil className="size-3.5 mr-1" /> Edit details
                  </>
                ) : (
                  "Done editing"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading background details…</div>
        ) : showView ? (
          hasBackgroundData(bg) ? (
            <div className="space-y-3">
              {summaryBadges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {summaryBadges.map((b) => (
                    <Badge key={b.label} variant="secondary" className="font-normal">
                      {b.label} · {b.count}
                    </Badge>
                  ))}
                </div>
              )}
              <LeadBackgroundDetailPanel background={bg} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-4">
              No background details yet
              {canEdit ? " — click Edit details to add tests, education, or experience." : "."}
            </p>
          )
        ) : (
          <>
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
                  />
                </TabsContent>
                <TabsContent value="education" className="mt-4 focus-visible:outline-none">
                  <EducationExperienceFields
                    value={bg}
                    onChange={handleChange}
                    compact
                    visibleSections={["education"]}
                  />
                </TabsContent>
                <TabsContent value="experience" className="mt-4 focus-visible:outline-none">
                  <EducationExperienceFields
                    value={bg}
                    onChange={handleChange}
                    compact
                    visibleSections={["experience"]}
                  />
                </TabsContent>
              </div>
            </Tabs>

            {canEdit && (
              <div className="flex justify-end pt-4 border-t mt-4">
                <Button type="button" onClick={saveBackground} disabled={saving}>
                  {saving ? "Saving…" : "Save background details"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
