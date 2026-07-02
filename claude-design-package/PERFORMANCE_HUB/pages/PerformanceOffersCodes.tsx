import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceOfferCodesTable } from "@/components/performance/PerformanceOfferCodesTable";
import { PerformanceOfferCodeConstraintsPanel } from "@/components/performance/PerformanceOfferCodeConstraintsPanel";
import { PerformanceOfferCodeRedemptionPanel } from "@/components/performance/PerformanceOfferCodeRedemptionPanel";
import { PerformanceOfferCodesGeneratePanel } from "@/components/performance/PerformanceOfferCodesGeneratePanel";
import { PerformanceNewOfferCodeDialog } from "@/components/performance/PerformanceNewOfferCodeDialog";
import {
  buildOfferCodeRows,
  filterOfferCodeRows,
  offerCodeKpis,
  type OfferCodeFilter,
} from "@/incentives/lib/offerCodesLogic";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

const FILTERS: { id: OfferCodeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "one_time", label: "One-time" },
  { id: "bulk", label: "Bulk" },
  { id: "counselor", label: "Counselor" },
];

export default function PerformanceOffersCodes() {
  const { loading, hasRole } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator"]);
  const canEditOffers = canEdit || hasRole(["manager", "administrator"]);

  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [tracking, setTracking] = useState<
    { id: string; offer_id: string; counselor_id: string; code: string; created_at: string }[]
  >([]);
  const [counselorNames, setCounselorNames] = useState<Map<string, string>>(new Map());
  const [counselorBranch, setCounselorBranch] = useState<Map<string, string>>(new Map());
  const [branchNames, setBranchNames] = useState<Map<string, string>>(new Map());
  const [trackingUsage, setTrackingUsage] = useState<Map<string, number>>(new Map());
  const [counselors, setCounselors] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<OfferCodeFilter>("all");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [selectedCounselorId, setSelectedCounselorId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [offersRes, trackingRes, branchesRes, rolesRes, eventsRes] = await Promise.all([
      supabase.from("offers").select("*").order("created_at", { ascending: false }),
      supabase.from("offer_tracking_codes").select("id,offer_id,counselor_id,code,created_at").order("created_at", { ascending: false }),
      supabase.from("branches").select("id,name"),
      supabase.from("user_roles").select("user_id,role").in("role", ["counselor", "admin"]),
      supabase.from("offer_events").select("tracking_code").not("tracking_code", "is", null),
    ]);

    const offerRows = (offersRes.data ?? []) as OfferRow[];
    setOffers(offerRows);
    setTracking((trackingRes.data ?? []) as typeof tracking);

    const branchMap = new Map(((branchesRes.data ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name]));
    setBranchNames(branchMap);

    const ids = Array.from(new Set(((rolesRes.data ?? []) as { user_id: string }[]).map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,email,branch_id")
        .in("id", ids);
      const profRows = (profs ?? []) as { id: string; full_name: string | null; email: string | null; branch_id: string | null }[];
      setCounselors(profRows);
      setCounselorNames(new Map(profRows.map((p) => [p.id, p.full_name || p.email || p.id.slice(0, 8)])));
      setCounselorBranch(
        new Map(profRows.map((p) => [p.id, p.branch_id ? branchMap.get(p.branch_id) ?? "—" : "—"])),
      );
    } else {
      setCounselors([]);
      setCounselorNames(new Map());
      setCounselorBranch(new Map());
    }

    const usage = new Map<string, number>();
    for (const e of (eventsRes.data ?? []) as { tracking_code: string | null }[]) {
      if (!e.tracking_code) continue;
      usage.set(e.tracking_code, (usage.get(e.tracking_code) ?? 0) + 1);
    }
    setTrackingUsage(usage);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const allRows = useMemo(
    () =>
      buildOfferCodeRows({
        offers,
        tracking,
        counselorNames,
        branchNames,
        counselorBranch,
        trackingUsage,
      }),
    [offers, tracking, counselorNames, branchNames, counselorBranch, trackingUsage],
  );

  const filteredRows = useMemo(() => filterOfferCodeRows(allRows, filter), [allRows, filter]);
  const kpis = useMemo(() => offerCodeKpis(allRows), [allRows]);

  const generate = async () => {
    if (!selectedOfferId || !selectedCounselorId) {
      toast.error("Pick an offer and a counselor");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc("generate_offer_tracking_code", {
        _offer_id: selectedOfferId,
        _counselor_id: selectedCounselorId,
      });
      if (error) throw error;
      toast.success(`Code ready: ${String(data)}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate code");
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Offer code management"
          subtitle="Promo codes on offers plus counselor tracking codes — redemptions from existing tables"
          showModuleLegend={false}
        />
        <OffersStudioNav />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canEditOffers && (
            <>
              <Button variant="outline" onClick={() => setCodeDialogOpen(true)}>
                <Plus className="size-4 mr-1" />
                New code
              </Button>
              <Button asChild>
                <Link to="/performance/offers/library">
                  <Plus className="size-4 mr-1" />
                  Edit offer promo codes
                </Link>
              </Button>
            </>
          )}
        </div>

        <PerformanceExecutiveKpiStrip
          loading={busy}
          items={[
            { module: "offers", label: "Active codes", value: String(kpis.activeCodes), hint: `${allRows.length} total rows` },
            { module: "cash", label: "Total redemptions", value: String(kpis.totalRedemptions), hint: "Promo + tracking events" },
            { module: "wallet", label: "One-time codes", value: String(kpis.oneTimeCodes), hint: "Single-use promos" },
            { module: "offers", label: "Bulk pool cap", value: String(kpis.bulkPoolCap), hint: "Sum of bulk max redemptions" },
          ]}
        />

        <PerformanceOfferCodesGeneratePanel
          offers={offers.map((o) => ({ id: o.id, title: o.title, promo_code: o.promo_code }))}
          counselors={counselors}
          selectedOfferId={selectedOfferId}
          selectedCounselorId={selectedCounselorId}
          generating={generating}
          canEdit={canEditOffers}
          onOfferChange={setSelectedOfferId}
          onCounselorChange={setSelectedCounselorId}
          onGenerate={generate}
        />

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.id ? "bg-[var(--blueBg)] text-[var(--blue)] border-[var(--blue)]" : "ph-muted hover:bg-muted/40",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <PerformanceOfferCodesTable rows={filteredRows} loading={busy} onCopy={copy} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceOfferCodeConstraintsPanel />
          <PerformanceOfferCodeRedemptionPanel rows={allRows} loading={busy} />
        </div>

        <PerformanceNewOfferCodeDialog
          open={codeDialogOpen}
          onOpenChange={setCodeDialogOpen}
          offers={offers.map((o) => ({ id: o.id, title: o.title, promo_code: o.promo_code }))}
          counselors={counselors}
          selectedOfferId={selectedOfferId}
          selectedCounselorId={selectedCounselorId}
          generating={generating}
          onOfferChange={setSelectedOfferId}
          onCounselorChange={setSelectedCounselorId}
          onGenerate={generate}
        />
      </div>
    </AppLayout>
  );
}
