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
import { buildAcademyNav } from "@/lib/service-library/academyNav";
import { ALLOWED_COUNTRY_SET, type Master } from "@/lib/serviceLibrary";
import { toast } from "sonner";
import { ServiceLibraryClientDialog } from "@/components/service-library/ServiceLibraryClientDialog";

export { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "@/lib/serviceLibrary";

export default function ServiceLibrary() {
  const { user, hasRole, isAdmin } = useAuth();
  const canManage = isAdmin || hasRole(["administrator", "documentation"]);
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [countryFilter, setCountryFilter] = useState(params.get("country") || "ALL");
  const [detailCountry, setDetailCountry] = useState<string>("");
  const [treeSearch, setTreeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "review">("all");
  const [activeTab, setActiveTab] = useState<
    "overview" | "eligibility" | "checklist" | "process" | "dos" | "redflags" | "faqs" | "compliance" | "downloads" | "quiz" | "notes" | "changelog"
  >("redflags");
  const [policyDismissed] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientDialogMode, setClientDialogMode] = useState<"application" | "push">("application");

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedId) p.set("id", selectedId);
    if (countryFilter && countryFilter !== "ALL") p.set("country", countryFilter);
    setParams(p, { replace: true });
  }, [selectedId, countryFilter, setParams]);

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

  const { groups, activeCount, reviewCount } = useMemo(
    () =>
      buildAcademyNav(masters.data ?? [], {
        countryFilter,
        search: treeSearch,
        statusFilter,
      }),
    [masters.data, countryFilter, treeSearch, statusFilter],
  );

  useEffect(() => {
    if (!selectedId && groups.length) {
      const first = groups[0]?.items[0]?.id;
      if (first) setSelectedId(first);
    }
  }, [selectedId, groups]);

  const detail = useServiceAcademyDetail(
    selectedId,
    detailCountry || (countryFilter !== "ALL" ? countryFilter : null),
  );

  useEffect(() => {
    if (!detail.data) return;
    const { countries, detailCountry: dc } = detail.data;
    if (dc) setDetailCountry(dc);
    else if (countries[0]) setDetailCountry(countries[0]);
  }, [detail.data?.master.id, detail.data?.detailCountry]);

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
        groups={groups}
        activeCount={activeCount}
        reviewCount={reviewCount}
        selectedId={selectedId}
        onSelect={setSelectedId}
        country={countryFilter}
        onCountry={setCountryFilter}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        search={treeSearch}
        onSearch={setTreeSearch}
        userName={userName}
        userRole="Counselor"
        userInitials={userInitials}
        showCountryFilter
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a service from the sidebar
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
                  onOpenTab={setActiveTab}
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
                />
              </div>
            </div>

            <div className="xl:border-l bg-muted/10 px-4 md:px-6 py-6 overflow-y-auto shrink-0">
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
