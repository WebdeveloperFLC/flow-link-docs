import { useEffect, useMemo, useState } from "react";
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
  type AcademyCategoryFilter,
} from "@/lib/service-library/academyNav";
import type { CoachingVariant } from "@/lib/service-library/serviceNavClassification";
import { type Master } from "@/lib/serviceLibrary";
import { toast } from "sonner";
import { ServiceLibraryClientDialog } from "@/components/service-library/ServiceLibraryClientDialog";
import {
  defaultAcademyTab,
  resolveAcademyTabs,
  type AcademyTabId,
} from "@/lib/service-library/academyTabs";

export { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "@/lib/serviceLibrary";

function parseCategory(raw: string | null): AcademyCategoryFilter {
  return raw === "coaching" ? "coaching" : "visa";
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
  const [coachingFamily, setCoachingFamily] = useState<string | null>(params.get("family"));
  const [coachingVariant, setCoachingVariant] = useState<CoachingVariant | null>(
    parseCoachingVariant(params.get("variant")),
  );
  const [detailCountry, setDetailCountry] = useState<string>("");
  const [treeSearch, setTreeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "review">("all");
  const [activeTab, setActiveTab] = useState<AcademyTabId>("redflags");
  const [policyDismissed] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientDialogMode, setClientDialogMode] = useState<"application" | "push">("application");

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedId) p.set("id", selectedId);
    if (categoryFilter !== "visa") p.set("cat", categoryFilter);
    if (categoryFilter === "visa" && countryFilter) p.set("country", countryFilter);
    if (coachingFamily) p.set("family", coachingFamily);
    if (coachingVariant) p.set("variant", coachingVariant);
    setParams(p, { replace: true });
  }, [selectedId, categoryFilter, countryFilter, coachingFamily, coachingVariant, setParams]);

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
        coachingFamily,
        coachingVariant,
        search: treeSearch,
        statusFilter,
      }),
    [masters.data, categoryFilter, countryFilter, coachingFamily, coachingVariant, treeSearch, statusFilter],
  );

  const navReadyForSelection = group?.step === "services";

  useEffect(() => {
    if (!navReadyForSelection || !group?.items) return;
    const ids = flattenNavItemIds(group);
    if (selectedId && !ids.includes(selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, group, navReadyForSelection]);

  const handleCategoryChange = (cat: AcademyCategoryFilter) => {
    setCategoryFilter(cat);
    setSelectedId(null);
    setTreeSearch("");
    setCoachingFamily(null);
    setCoachingVariant(null);
    if (cat === "visa") {
      setCountryFilter("ALL");
    } else {
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

  const detailCountryParam =
    categoryFilter === "visa"
      ? detailCountry || (countryFilter !== "ALL" ? countryFilter : null)
      : null;

  const detail = useServiceAcademyDetail(selectedId, detailCountryParam);

  useEffect(() => {
    if (!detail.data?.view) return;
    const allowed = resolveAcademyTabs(detail.data.view);
    if (!allowed.includes(activeTab)) {
      setActiveTab(defaultAcademyTab(detail.data.view));
    }
  }, [detail.data?.view.masterId, detail.data?.view.isCoaching, detail.data?.view.coachingProfile, activeTab]);

  useEffect(() => {
    if (!detail.data || categoryFilter !== "visa") return;
    const { countries, detailCountry: dc } = detail.data;
    const next = dc ?? countries[0] ?? "";
    if (next && next !== detailCountry) setDetailCountry(next);
  }, [detail.data?.master.id, detail.data?.detailCountry, detailCountry, categoryFilter]);

  const showNavPanel = !selectedId || !navReadyForSelection;

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

      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-muted/20">
        {showNavPanel ? (
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
        ) : detail.isLoading && !detail.data ? (
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
                <ServiceLibraryTabs
                  view={detail.data.view}
                  libraryId={detail.data.master.id}
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
          serviceCategory={detail.data.master.service_category}
          country={detail.data.view.country}
          shareLink={detail.data.view.shareLink}
        />
      )}
    </div>
  );
}
