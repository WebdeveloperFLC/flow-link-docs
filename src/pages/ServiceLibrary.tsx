import { useEffect, useMemo, useState } from "react";
import { fetchAcademyNavCatalog } from "@/lib/service-library/fetchAcademyNavCatalog";
import { ServiceAcademyNavSkeleton } from "@/components/service-library/design/ServiceAcademyNavSkeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ServiceAcademySidebar } from "@/components/service-library/design/ServiceAcademySidebar";
import { ServiceAcademyNavPanel } from "@/components/service-library/design/ServiceAcademyNavPanel";
import { ServiceAcademyHero } from "@/components/service-library/design/ServiceAcademyHero";
import { ServiceAcademyKpiRow } from "@/components/service-library/design/ServiceAcademyKpiRow";
import { ServiceLibraryTabs } from "@/components/service-library/design/ServiceLibraryTabs";
import { ServiceLibraryRightRail } from "@/components/service-library/design/ServiceLibraryRightRail";
import { useServiceAcademyDetail } from "@/hooks/useServiceAcademyDetail";
import {
  buildAcademyNav,
  flattenNavItemIds,
  resolveAcademyDeepLinkContext,
  type AcademyCategoryFilter,
} from "@/lib/service-library/academyNav";
import {
  resolveDefaultMbbsInstitutionId,
  resolveMbbsInstitutionOptions,
} from "@/lib/service-library/mbbs/resolveMbbsInstitutions";
import { MbbsInstitutionSwitcher } from "@/components/service-library/design/MbbsInstitutionSwitcher";
import type { CoachingVariant } from "@/lib/service-library/serviceNavClassification";
import { toast } from "sonner";
import { ServiceLibraryClientDialog } from "@/components/service-library/ServiceLibraryClientDialog";
import { ServiceEligibilityStartDialog } from "@/components/service-library/ServiceEligibilityStartDialog";
import {
  defaultAcademyTab,
  resolveAcademyTabs,
  ACADEMY_TAB_IDS,
  type AcademyTabId,
} from "@/lib/service-library/academyTabs";
import { buildPageSearchIndex } from "@/lib/service-library/buildPageSearchIndex";
import { openVisaFormLink } from "@/lib/service-library/openVisaFormLink";

export { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "@/lib/serviceLibrary";

function parseCategory(raw: string | null): AcademyCategoryFilter {
  if (raw === "coaching") return "coaching";
  if (raw === "mbbs") return "mbbs";
  return "visa";
}

function parseCoachingVariant(raw: string | null): CoachingVariant | null {
  return raw === "general" || raw === "academic" || raw === "other" ? raw : null;
}

function parseAcademyTab(raw: string | null): AcademyTabId | null {
  return raw && (ACADEMY_TAB_IDS as readonly string[]).includes(raw) ? (raw as AcademyTabId) : null;
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
  const [coachingFamily, setCoachingFamily] = useState<string | null>(params.get("family"));
  const [coachingVariant, setCoachingVariant] = useState<CoachingVariant | null>(
    parseCoachingVariant(params.get("variant")),
  );
  const [detailCountry, setDetailCountry] = useState<string>("");
  const [treeSearch, setTreeSearch] = useState("");
  const [debouncedTreeSearch, setDebouncedTreeSearch] = useState("");
  const [pageSearch, setPageSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "review">("all");
  const [activeTab, setActiveTab] = useState<AcademyTabId>(() => parseAcademyTab(params.get("tab")) ?? "redflags");
  const [policyDismissed] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientDialogMode, setClientDialogMode] = useState<"application" | "push">("application");
  const [eligibilityDialogOpen, setEligibilityDialogOpen] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedId) p.set("id", selectedId);
    if (categoryFilter !== "visa") p.set("cat", categoryFilter);
    if (categoryFilter === "visa" && countryFilter) p.set("country", countryFilter);
    if (coachingFamily) p.set("family", coachingFamily);
    if (coachingVariant) p.set("variant", coachingVariant);
    if (activeTab !== defaultAcademyTab({ isCoaching: categoryFilter === "coaching", isMbbs: categoryFilter === "mbbs" })) {
      p.set("tab", activeTab);
    }
    setParams(p, { replace: true });
  }, [selectedId, categoryFilter, countryFilter, coachingFamily, coachingVariant, activeTab, setParams]);

  useEffect(() => {
    const tab = parseAcademyTab(params.get("tab"));
    if (tab) setActiveTab(tab);
  }, [params.get("tab")]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedTreeSearch(treeSearch), 200);
    return () => window.clearTimeout(handle);
  }, [treeSearch]);

  const masters = useQuery({
    queryKey: ["sl-library-masters"],
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: fetchAcademyNavCatalog,
  });

  const mbbsInstitutionOptions = useMemo(
    () => resolveMbbsInstitutionOptions(masters.data ?? []),
    [masters.data],
  );

  const { group, activeCount, reviewCount } = useMemo(
    () =>
      buildAcademyNav(masters.data ?? [], {
        categoryFilter,
        countryFilter: categoryFilter === "visa" ? countryFilter : "ALL",
        coachingFamily,
        coachingVariant,
        search: debouncedTreeSearch,
        statusFilter,
      }),
    [masters.data, categoryFilter, countryFilter, coachingFamily, coachingVariant, debouncedTreeSearch, statusFilter],
  );

  /** Nav without sidebar search/status — used only to validate selectedId (search must not close detail). */
  const selectionGroup = useMemo(
    () =>
      buildAcademyNav(masters.data ?? [], {
        categoryFilter,
        countryFilter: categoryFilter === "visa" ? countryFilter : "ALL",
        coachingFamily,
        coachingVariant,
        search: "",
        statusFilter: "all",
      }).group,
    [masters.data, categoryFilter, countryFilter, coachingFamily, coachingVariant],
  );

  const navReadyForSelection = group?.step === "services";

  useEffect(() => {
    if (!masters.data || !selectedId) return;
    const ctx = resolveAcademyDeepLinkContext(masters.data, selectedId);
    if (!ctx) return;

    if (ctx.category === "mbbs") {
      if (categoryFilter !== "mbbs") setCategoryFilter("mbbs");
      return;
    }

    if (ctx.category === "coaching") {
      if (categoryFilter !== "coaching") setCategoryFilter("coaching");
      if (ctx.coachingFamily && coachingFamily !== ctx.coachingFamily) {
        setCoachingFamily(ctx.coachingFamily);
      }
      if (ctx.coachingVariant && coachingVariant !== ctx.coachingVariant) {
        setCoachingVariant(ctx.coachingVariant);
      }
      return;
    }

    if (ctx.category === "visa") {
      if (categoryFilter !== "visa") setCategoryFilter("visa");
      if (ctx.country && countryFilter === "ALL") {
        setCountryFilter(ctx.country);
        setDetailCountry(ctx.country);
      }
    }
  }, [
    masters.data,
    selectedId,
    categoryFilter,
    coachingFamily,
    coachingVariant,
    countryFilter,
  ]);

  useEffect(() => {
    if (selectionGroup?.step !== "services" || !selectionGroup.items) return;
    const ids = flattenNavItemIds(selectionGroup);
    if (selectedId && !ids.includes(selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, selectionGroup]);

  const handleCategoryChange = (cat: AcademyCategoryFilter) => {
    setCategoryFilter(cat);
    setTreeSearch("");
    setCoachingFamily(null);
    setCoachingVariant(null);
    if (cat === "visa") {
      setCountryFilter("ALL");
      setSelectedId(null);
      setDetailCountry("");
    } else if (cat === "mbbs") {
      setCountryFilter("ALL");
      setDetailCountry("");
      const defaultId = resolveDefaultMbbsInstitutionId(masters.data ?? []);
      setSelectedId(defaultId);
    } else {
      setSelectedId(null);
      setDetailCountry("");
    }
  };

  const handleCountryChange = (c: string) => {
    setCountryFilter(c);
    setSelectedId(null);
    if (c !== "ALL") setDetailCountry(c);
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

  useEffect(() => {
    if (categoryFilter !== "mbbs" || selectedId || !masters.data?.length) return;
    const defaultId = resolveDefaultMbbsInstitutionId(masters.data);
    if (defaultId) setSelectedId(defaultId);
  }, [categoryFilter, selectedId, masters.data]);

  const mbbsCountryForDetail = useMemo(() => {
    if (categoryFilter !== "mbbs" || !selectedId || !masters.data) return null;
    const row = masters.data.find((m) => m.id === selectedId);
    if (!row?.academy_metadata || typeof row.academy_metadata !== "object") return "Saba";
    const meta = row.academy_metadata as { mbbs?: { country?: string } };
    return meta.mbbs?.country ?? "Saba";
  }, [categoryFilter, selectedId, masters.data]);

  const detailCountryParam =
    categoryFilter === "visa"
      ? detailCountry || (countryFilter !== "ALL" ? countryFilter : null)
      : categoryFilter === "mbbs"
        ? mbbsCountryForDetail
        : null;

  const detail = useServiceAcademyDetail(selectedId, detailCountryParam);

  const detailView = detail.data?.view;
  const detailStale =
    !!selectedId && !!detail.data && detail.data.master.id !== selectedId;

  const resolvedActiveTab = useMemo((): AcademyTabId => {
    if (!detailView) return activeTab;
    const allowed = resolveAcademyTabs(detailView);
    return allowed.includes(activeTab) ? activeTab : defaultAcademyTab(detailView);
  }, [detailView, activeTab]);

  useEffect(() => {
    if (resolvedActiveTab !== activeTab) setActiveTab(resolvedActiveTab);
  }, [resolvedActiveTab, activeTab]);

  useEffect(() => {
    if (!detail.data || categoryFilter !== "visa") return;
    const { countries, detailCountry: dc } = detail.data;
    const next = dc ?? countries[0] ?? "";
    if (next && next !== detailCountry) setDetailCountry(next);
  }, [detail.data?.master.id, detail.data?.detailCountry, detailCountry, categoryFilter]);

  const pageSearchEntries = useMemo(
    () => (detailView ? buildPageSearchIndex(detailView) : []),
    [detailView],
  );

  useEffect(() => {
    setPageSearch("");
  }, [selectedId]);

  const showNavPanel =
    categoryFilter === "mbbs"
      ? !selectedId
      : !selectedId || !navReadyForSelection;

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
      .select("file_path,mime_type")
      .eq("id", fileId)
      .maybeSingle();
    if (!row?.file_path) {
      toast.error("File not found");
      return;
    }
    if (row.file_path.startsWith("/specimens/")) {
      const url = `${window.location.origin}${row.file_path}`;
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (row.mime_type === "text/html" || row.file_path.endsWith(".html")) {
        link.textContent = fileName;
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    const { data } = await supabase.storage.from("service-library-files").createSignedUrl(row.file_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error(`Could not download ${fileName}`);
  };

  const openVisaForm = async (formId: string, title: string) => {
    const { data: row, error } = await supabase
      .from("service_library_visa_form_files")
      .select("file_path,mime_type")
      .eq("id", formId)
      .maybeSingle();
    if (error || !row?.file_path) {
      toast.error("Form not found");
      return;
    }
    await openVisaFormLink({
      filePath: row.file_path,
      title,
      mimeType: row.mime_type,
      storageBucket: "service-library-files",
    });
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

  const openEligibilityDialog = () => setEligibilityDialogOpen(true);
  const openMbbsEligibility = () => setActiveTab("eligibility");
  const isVisaService = detail.data?.master.service_category === "visa_immigration";
  const isMbbsService = detail.data?.master.service_category === "mbbs_services";
  const onStartEligibility = isVisaService
    ? openEligibilityDialog
    : isMbbsService
      ? openMbbsEligibility
      : undefined;

  const userName = user?.email?.split("@")[0] ?? "Counselor";
  const userInitials = userName.slice(0, 2).toUpperCase();

  const showDetailLoading =
    !!selectedId &&
    navReadyForSelection &&
    (detail.isLoading || detail.isFetching || detailStale) &&
    !detail.data;

  const showDetailError =
    !!selectedId && navReadyForSelection && detail.isError && !detail.data;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <ServiceAcademySidebar
        group={group}
        categoryFilter={categoryFilter}
        onCategoryChange={handleCategoryChange}
        country={countryFilter}
        onCountry={handleCountryChange}
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
        catalogLoading={masters.isLoading && !masters.data}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen w-full bg-muted/20">
        {masters.isError && (
          <div className="mx-4 mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Could not load service catalogue. {(masters.error as Error)?.message ?? "Refresh the page."}
          </div>
        )}
        {masters.isLoading && !masters.data ? (
          <ServiceAcademyNavSkeleton
            variant={categoryFilter === "visa" && countryFilter === "ALL" ? "countries" : "services"}
          />
        ) : showNavPanel ? (
          <ServiceAcademyNavPanel
            group={group}
            categoryFilter={categoryFilter}
            country={countryFilter}
            coachingFamily={coachingFamily}
            coachingVariant={coachingVariant}
            onCountry={handleCountryChange}
            onCoachingFamily={handleCoachingFamilyChange}
            onCoachingVariant={handleCoachingVariantChange}
            onSelectService={setSelectedId}
          />
        ) : showDetailLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : showDetailError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground px-6 text-center">
            <p className="font-medium text-foreground">Could not load this service</p>
            <p className="text-sm">{(detail.error as Error)?.message ?? "Try again or pick another service."}</p>
          </div>
        ) : detailStale ? (
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
                  mbbsInstitutionOptions={categoryFilter === "mbbs" ? mbbsInstitutionOptions : undefined}
                  selectedInstitutionId={selectedId}
                  onInstitutionChange={setSelectedId}
                  onOpenTab={setActiveTab as (tab: string) => void}
                  onOpenResources={() => setActiveTab("downloads")}
                  onNewApplication={() => openClientDialog("application")}
                  onStartEligibility={onStartEligibility}
                  policyDismissed={policyDismissed}
                  canManage={canManage}
                  pageSearch={pageSearch}
                  onPageSearchChange={setPageSearch}
                  pageSearchEntries={pageSearchEntries}
                />
              </div>
              <div className="px-4 md:px-6 pb-8 space-y-4">
                <ServiceAcademyKpiRow kpis={detail.data.view.kpis} />
                <ServiceLibraryTabs
                  view={detail.data.view}
                  libraryId={detail.data.master.id}
                  country={detail.data.view.country}
                  canManage={canManage}
                  activeTab={resolvedActiveTab}
                  onTabChange={setActiveTab}
                  resolvedFullCostBreakdown={detail.data.resolvedFullCostBreakdown ?? undefined}
                  onToggleChecklistItem={toggleSub}
                  onPushChecklist={() => openClientDialog("push")}
                  onDownloadFile={downloadFile}
                  onOpenVisaForm={openVisaForm}
                  onOpenSampleDoc={openSampleDoc}
                  onStartEligibility={onStartEligibility}
                />
              </div>
            </div>

            <div className="xl:border-l bg-muted/10 px-4 md:px-6 py-6 overflow-y-auto shrink-0 xl:w-[320px]">
              <ServiceLibraryRightRail
                view={detail.data.view}
                onSelectRelated={(id) => setSelectedId(id)}
                onDownloadChecklist={downloadFirstChecklist}
                onNewApplication={() => openClientDialog("application")}
                onStartEligibility={onStartEligibility}
              />
            </div>
          </div>
        )}
      </div>

      {detail.data && (
        <>
          <ServiceLibraryClientDialog
            open={clientDialogOpen}
            onOpenChange={setClientDialogOpen}
            mode={clientDialogMode}
            libraryId={detail.data.master.id}
            serviceTitle={detail.data.view.title}
            subService={detail.data.master.sub_service}
            serviceCategory={detail.data.master.service_category}
            country={detail.data.view.country}
            shareLink={detail.data.view.shareLink}
          />
          {isVisaService && (
            <ServiceEligibilityStartDialog
              open={eligibilityDialogOpen}
              onOpenChange={setEligibilityDialogOpen}
              libraryId={detail.data.master.id}
              serviceTitle={detail.data.view.title}
              country={detail.data.view.country}
            />
          )}
        </>
      )}
    </div>
  );
}
