import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useModulePermission } from "@/hooks/useModulePermission";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { currentPeriodKey } from "@/lib/performanceHubTheme";
import { offerStatusLabel, offerStatusClass } from "@/lib/offers/lifecycle";
import { Tag, Clock, RefreshCw, Plus, Megaphone, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface DashboardData {
  active_count: number;
  pending_review: number;
  draft_count: number;
  expiring_within_14d: number;
  redemptions_in_period: number;
  promotion_requests_open: number;
  recent_offers: Array<{
    id: string;
    title: string;
    status: string;
    funding_source: string;
    valid_to: string | null;
    updated_at: string;
  }>;
}

export default function PerformanceOffersStudio() {
  const { loading, hasRole } = useAuth();
  const { canView, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator"]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [busy, setBusy] = useState(true);
  const periodKey = currentPeriodKey();

  const load = useCallback(async () => {
    setBusy(true);
    const { data: row, error } = await supabase.rpc("fn_offer_studio_dashboard", { _period_key: periodKey });
    if (error) {
      toast.error(error.message);
      setData(null);
    } else {
      setData(row as DashboardData);
    }
    setBusy(false);
  }, [periodKey]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;

  const tiles = [
    { label: "Live offers", value: data?.active_count ?? 0, icon: Tag, to: "/performance/offers/library" },
    { label: "Pending review", value: data?.pending_review ?? 0, icon: Clock, to: "/performance/offers/library" },
    { label: "Expiring ≤14d", value: data?.expiring_within_14d ?? 0, icon: Clock, to: "/performance/offers/library" },
    { label: `Redemptions · ${periodKey}`, value: data?.redemptions_in_period ?? 0, icon: TrendingUp, to: "/performance/offers/analytics" },
    { label: "Promotion requests", value: data?.promotion_requests_open ?? 0, icon: Megaphone, to: "/performance/offers/requests" },
    { label: "Drafts", value: data?.draft_count ?? 0, icon: Tag, to: "/performance/offers/library" },
  ];

  return (
    <AppLayout>
      <PerformanceHubHeader
        title="Offers studio"
        subtitle="MarCom dashboard — lifecycle, library, promotion requests, analytics"
      />
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <OffersStudioNav />
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            <RefreshCw className={busy ? "size-4 mr-1 animate-spin" : "size-4 mr-1"} />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link to="/performance/offers/new">
              <Plus className="size-4 mr-1" />
              New offer wizard
            </Link>
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((t) => (
            <Link key={t.label} to={t.to}>
              <Card className="p-4 hover:shadow-md transition h-full">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">{t.label}</div>
                    <div className="text-2xl font-semibold mt-1">{t.value}</div>
                  </div>
                  <t.icon className="size-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Recent offers</h2>
          {!data?.recent_offers?.length && (
            <p className="text-sm text-muted-foreground">No offers yet — create one with the wizard.</p>
          )}
          <div className="divide-y">
            {(data?.recent_offers ?? []).map((o) => (
              <Link
                key={o.id}
                to="/performance/offers/library"
                className="flex items-center gap-3 py-2.5 hover:bg-muted/50 -mx-2 px-2 rounded"
              >
                <span className="flex-1 text-sm font-medium">{o.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${offerStatusClass(o.status)}`}>
                  {offerStatusLabel(o.status)}
                </span>
                {o.valid_to && (
                  <span className="text-xs text-muted-foreground">until {new Date(o.valid_to).toLocaleDateString()}</span>
                )}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
