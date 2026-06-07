import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ServiceAcademySidebar } from "@/components/service-library/design/ServiceAcademySidebar";
import { ServiceAcademyHero } from "@/components/service-library/design/ServiceAcademyHero";
import { ServiceAcademyKpiRow } from "@/components/service-library/design/ServiceAcademyKpiRow";
import { ServiceLibraryTabs } from "@/components/service-library/design/ServiceLibraryTabs";
import { ServiceLibraryRightRail } from "@/components/service-library/design/ServiceLibraryRightRail";
import { useServiceAcademyDetail } from "@/hooks/useServiceAcademyDetail";
import {
  buildAcademyNav,
  flattenNavItemIds,
  type AcademyCategoryFilter,
} from "@/lib/service-library/academyNav";
import type { CoachingVariant, VisaImmigrationBucket } from "@/lib/service-library/serviceNavClassification";
import { ALLOWED_COUNTRY_SET, type Master } from "@/lib/serviceLibrary";
import { toast } from "sonner";
import { ServiceLibraryClientDialog } from "@/components/service-library/ServiceLibraryClientDialog";

export { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "@/lib/serviceLibrary";

function parseCategory(raw: string | null): AcademyCategoryFilter {
  return raw === "coaching" ? "coaching" : "visa";
}

function parseVisaBucket(raw: string | null): VisaImmigrationBucket | null {
  return raw === "visa" || raw === "immigration" ? raw : null;
}

function parseCoachingVariant(raw: string | null): CoachingVariant | null {
  return raw === "general" || raw === "academic" || raw === "other" ? raw : null;
}

export default function ServiceLibrary() {
  const { user, hasRole, isAdmin } = useAuth();
  const canManage = isAdmin || hasRole(["administrator", "documentation"]);
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [categoryFilter, setCategoryFilter] = useState<AcademyCategoryFilter>(
    parseCategory(params.get("cat")),
  );
  const [countryFilter, setCountryFilter] = useState(params.get("country") || "ALL");
  const [visaBucket, setVisaBucket] = useState<VisaImmigrationBucket | null>(
    parseVisaBucket(params.get("bucket")),
  );
  const [coachingFamily, setCoachingFamily] = useState<string | null>(params.get("family"));
  const [coachingVariant, setCoachingVariant] = useState<CoachingVariant | null>(
    parseCoachingVariant(params.get("variant")),
  );
  const [detailCountry, setDetailCountry] = useState<string>("");
  const [treeSearch, setTreeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "review">("all");
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "eligibility"
    | "checklist"
    | "process"
    | "dos"
    | "redflags"
    | "faqs"
    | "compliance"
    | "downloads"
    | "sampledocs"
    | "quiz"
    | "notes"
    | "changelog"
  >("redflags");
  const [policyDismissed] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientDialogMode, setClientDialogMode] = useState<"application" | "push">("application");

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedId) p.set("id", selectedId);
    if (categoryFilter !== "visa") p.set("cat", categoryFilter);
    if (categoryFilter === "visa" && countryFilter) p.set("country", countryFilter);
    if (visaBucket) p.set("bucket", visaBucket);
    if (coachingFamily) p.set("family", coachingFamily);
    if (coachingVariant) p.set("variant", coachingVariant);
    setParams(p, { replace: true });
  }, [selectedId, categoryFilter, countryFilter, visaBucket, coachingFamily, coachingVariant, setParams]);

  const masters = useQuery({
    queryKey: ["sl-library-masters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_library")
        .select("*, service_library_countries(country)")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as (Master & { service_library_countries: { country: string }[] })[];
    },
  });

  const { group, activeCount, reviewCount } = useMemo(
    () =>
      buildAcademyNav(masters.data ?? [], {
        categoryFilter,
        countryFilter: categoryFilter === "visa" ? countryFilter : "ALL",
        visaBucket,
        coachingFamily,
        coachingVariant,
        search: treeSearch,
        statusFilter,
      }),
    [masters.data, categoryFilter, countryFilter, visaBucket, coachingFamily, coachingVariant, treeSearch, statusFilter],
  );

  const navReadyForSelection = group?.step === "services";

  useEffect(() => {
    if (!navReadyForSelection) {
      setSelectedId(null);
      return;
    }
    const ids = flattenNavItemIds(group);
    if (selectedId && ids.includes(selectedId)) return;
  }, [selectedId, group, navReadyForSelection]);

  const handleCategoryChange = (cat: AcademyCategoryFilter) => {
    setCategoryFilter(cat);
    setSelectedId(null);
    setTreeSearch("");
    setVisaBucket(null);
    setCoachingFamily(null);
    setCoachingVariant(null);
    if (cat === "visa") setCountryFilter("ALL");
  };

  const handleCountryChange = (c: string) => {
    setCountryFilter(c);
    setSelectedId(null);
    setVisaBucket(null);
    if (c !== "ALL") setDetailCountry(c);
  };

  const handleVisaBucketChange = (b: VisaImmigrationBucket | null) => {
    setVisaBucket(b);
    setSelectedId(null);
  };

  const handleCoachingFamilyChange = (f: string | null) => {
    setCoachingFamily(f);
    setCoachingVariant(null);
    setSelectedId(null);
  };

  const handleCoachingVariantChange = (v: CoachingVariant | null) => {
    setCoachingVariant(v);
    setSelectedId(null);
  };

  const detailCountryParam =
    categoryFilter === "visa"
      ? detailCountry || (countryFilter !== "ALL" ? countryFilter : null)
      : null;

  const detail = useServiceAcademyDetail(selectedId, detailCountryParam);

  useEffect(() => {
    if (!detail.data) return;
    const { countries, detailCountry: dc } = detail.data;
    if (dc) setDetailCountry(dc);
    else if (countries[0]) setDetailCountry(countries[0]);
  }, [detail.data?.master.id, detail.data?.detailCountry]);

  const showPlaceholder = !selectedId || !navReadyForSelection;

  const placeholderMessage = useMemo(() => {
    if (categoryFilter === "visa" && countryFilter === "ALL") {
      return {
        title: "Select a country",
        hint: "Step 1 — pick a country under All countries, then choose Visa or Immigration.",
      };
    }
    if (categoryFilter === "visa" && !visaBucket) {
      return {
        title: "Select Visa or Immigration",
        hint: `Step 3 — for ${countryFilter}, choose whether the client needs a temporary visa or an immigration pathway.`,
      };
    }
    if (categoryFilter === "visa" && visaBucket && !selectedId) {
      return {
        title: "Select a service",
        hint: `Step 4 — choose a ${visaBucket === "visa" ? "visa" : "immigration"} service for ${countryFilter}. Details appear here and in the right panel.`,
      };
    }
    if (categoryFilter === "coaching" && !coachingFamily) {
      return {
        title: "Select a coaching program",
        hint: "Step 2 — e.g. IELTS, PTE, GRE. For IELTS you will then pick General or Academic.",
      };
    }
    if (categoryFilter === "coaching" && coachingFamily && !coachingVariant && group?.step === "coaching_variants") {
      return {
        title: "Select General or Academic",
        hint: `Step 3 — choose the ${coachingFamily} format before opening training content.`,
      };
    }
    return {
      title: "Select a service",
      hint: "Choose a service from the sidebar to view counselor training content.",
    };
  }, [categoryFilter, countryFilter, visaBucket, coachingFamily, coachingVariant, selectedId, group?.step]);

  const toggleSub = async (itemId: string) => {
    if (!user?.id) {
      toast.error("Sign in to track checklist progress");
      return;
    }
    const done = detail.data?.view.checklist.submission.find((i) => i.id === itemId)?.done;
    if (done) {
      await supabase
        .from("service_library_submission_completions")
        .delete()
        .eq("item_id", itemId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("service_library_submission_completions").insert({ item_id: itemId, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["sl-library-detail", selectedId] });
  };

  const downloadFile = async (fileId: string, fileName: string) => {
    const { data: row } = await supabase
      .from("service_library_checklist_files")
      .select("file_path")
      .eq("id", fileId)
      .maybeSingle();
    if (!row?.file_path) {
      toast.error("File not found");
      return;
    }
    const { data } = await supabase.storage.from("service-library-files").createSignedUrl(row.file_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error(`Could not download ${fileName}`);
  };

  const openSampleDoc = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from("service-library-files").createSignedUrl(filePath, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error(`Could not open ${fileName}`);
  };

  const downloadFirstChecklist = async () => {
    const first = detail.data?.view.downloads[0];
    if (first) await downloadFile(first.fileId, first.name);
    else toast.message("Upload checklist files in admin");
  };

  const openClientDialog = (mode: "application" | "push") => {
    setClientDialogMode(mode);
    setClientDialogOpen(true);
  };

  const userName = user?.email?.split("@")[0] ?? "Counselor";
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <ServiceAcademySidebar
        group={group}
        categoryFilter={categoryFilter}
        onCategoryChange={handleCategoryChange}
        country={countryFilter}
        onCountry={handleCountryChange}
        visaBucket={visaBucket}
        onVisaBucket={handleVisaBucketChange}
        coachingFamily={coachingFamily}
        onCoachingFamily={handleCoachingFamilyChange}
        coachingVariant={coachingVariant}
        onCoachingVariant={handleCoachingVariantChange}
        activeCount={activeCount}
        reviewCount={reviewCount}
        selectedId={selectedId}
        onSelect={setSelectedId}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        search={treeSearch}
        onSearch={setTreeSearch}
        userName={userName}
        userRole="Counselor"
        userInitials={userInitials}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {showPlaceholder ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-6 text-center gap-2">
            <p className="text-sm font-medium text-foreground">{placeholderMessage.title}</p>
            <p className="text-xs max-w-sm">{placeholderMessage.hint}</p>
          </div>
        ) : detail.isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : !detail.data ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Service not found</div>
        ) : (
          <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
              <div className="px-4 md:px-6 pt-4 md:pt-6">
                <ServiceAcademyHero
                  view={detail.data.view}
                  onOpenTab={setActiveTab as (tab: string) => void}
                  onOpenResources={() => setActiveTab("downloads")}
                  onNewApplication={() => openClientDialog("application")}
                  policyDismissed={policyDismissed}
                  canManage={canManage}
                />
              </div>
              <div className="px-4 md:px-6 pb-8 space-y-4">
                <ServiceAcademyKpiRow kpis={detail.data.view.kpis} />
                {detail.data.countries.length > 1 && detail.data.master.service_category === "visa_immigration" && (
                  <div className="flex flex-wrap gap-2">
                    {detail.data.countries
                      .filter((c) => ALLOWED_COUNTRY_SET.has(c))
                      .map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setDetailCountry(c)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            detailCountry === c ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                  </div>
                )}
                <ServiceLibraryTabs
                  view={detail.data.view}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onToggleChecklistItem={toggleSub}
                  onPushChecklist={() => openClientDialog("push")}
                  onDownloadFile={downloadFile}
                  onOpenSampleDoc={openSampleDoc}
                />
              </div>
            </div>

            <div className="xl:border-l bg-muted/10 px-4 md:px-6 py-6 overflow-y-auto shrink-0 xl:w-[320px]">
              <ServiceLibraryRightRail
                view={detail.data.view}
                onSelectRelated={(id) => setSelectedId(id)}
                onDownloadChecklist={downloadFirstChecklist}
                onNewApplication={() => openClientDialog("application")}
              />
            </div>
          </div>
        )}
      </div>

      {detail.data && (
        <ServiceLibraryClientDialog
          open={clientDialogOpen}
          onOpenChange={setClientDialogOpen}
          mode={clientDialogMode}
          libraryId={detail.data.master.id}
          serviceTitle={detail.data.view.title}
          subService={detail.data.master.sub_service}
          country={detail.data.view.country}
          shareLink={detail.data.view.shareLink}
        />
      )}
    </div>
  );
}
