import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { buildRecruitmentChannelSummary, channelLabel } from "../lib/partnershipRoutes";
import type { UpiPartnershipRoute } from "../types/partnership";
import { CheckCircle2, MinusCircle, Star } from "lucide-react";

type RouteBadgeInput = {
  id: string;
  channel_type: UpiPartnershipRoute["channel_type"];
  status: string;
  display_name: string;
  is_default_route: boolean;
  aggregator?: UpiPartnershipRoute["aggregator"];
};

function mapRouteRow(row: Record<string, unknown>): UpiPartnershipRoute {
  const agg = row.upi_aggregators as UpiPartnershipRoute["aggregator"] | null;
  const { upi_aggregators: _, ...rest } = row;
  return { ...rest, aggregator: agg ?? null } as UpiPartnershipRoute;
}

function ChannelTile({
  title,
  subtitle,
  active,
  isDefault,
  className,
}: {
  title: string;
  subtitle?: string;
  active: boolean;
  isDefault?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 min-w-[140px] flex-1",
        active ? "border-primary/30 bg-primary/5" : "border-dashed bg-muted/20 opacity-80",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</div>
          )}
        </div>
        {isDefault && (
          <Badge variant="outline" className="text-[9px] shrink-0 gap-0.5 px-1.5 py-0">
            <Star className="size-2.5 fill-current" />
            Default
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[11px]">
        {active ? (
          <>
            <CheckCircle2 className="size-3 text-success shrink-0" />
            <span className="text-success font-medium">Active</span>
          </>
        ) : (
          <>
            <MinusCircle className="size-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Not available</span>
          </>
        )}
      </div>
    </div>
  );
}

export function RecruitmentChannelsSummary({
  institutionId,
  routes: routesProp,
  loading: loadingProp,
  legacyDirectPartner = false,
  embedded = false,
}: {
  institutionId: string;
  routes?: UpiPartnershipRoute[] | RouteBadgeInput[];
  loading?: boolean;
  /** Pre-routes `is_partner` flag when no active direct route row exists yet. */
  legacyDirectPartner?: boolean;
  /** Omit outer Card wrapper when nested inside Catalog & partnerships. */
  embedded?: boolean;
}) {
  const [fetchedRoutes, setFetchedRoutes] = useState<UpiPartnershipRoute[]>([]);
  const [fetchLoading, setFetchLoading] = useState(routesProp == null);

  useEffect(() => {
    if (routesProp != null) return;
    let alive = true;
    setFetchLoading(true);
    void supabase
      .from("upi_partnership_routes")
      .select("*, upi_aggregators(id, name, short_code)")
      .eq("institution_id", institutionId)
      .order("priority_rank")
      .order("display_name")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setFetchedRoutes([]);
        } else {
          setFetchedRoutes((data ?? []).map((row) => mapRouteRow(row as Record<string, unknown>)));
        }
        setFetchLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [institutionId, routesProp]);

  const routes = (routesProp ?? fetchedRoutes) as UpiPartnershipRoute[];
  const loading = loadingProp ?? fetchLoading;

  const summary = useMemo(
    () => buildRecruitmentChannelSummary(routes, legacyDirectPartner),
    [routes, legacyDirectPartner],
  );

  const body = (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium">Recruitment channels</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Active application pathways — an institution may have direct, aggregator, and student-direct routes at the same time.
        </p>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground py-2">Loading channels…</div>
      ) : !summary.hasAnyActiveChannel ? (
        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          No active recruitment channels — promotion only. Add routes in Catalog &amp; partnerships below.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <ChannelTile
              title="Direct tie-up"
              subtitle={
                summary.directTieUp.route?.display_name !== "Direct tie-up"
                  ? summary.directTieUp.route?.display_name
                  : undefined
              }
              active={summary.directTieUp.active}
              isDefault={summary.directTieUp.route?.is_default_route}
            />
            {summary.aggregators.map((agg) => (
              <ChannelTile
                key={agg.routeId}
                title={agg.name}
                subtitle={agg.displayName !== agg.name ? agg.displayName : "Indirect aggregator"}
                active
                isDefault={agg.isDefault}
              />
            ))}
            <ChannelTile
              title="Student direct"
              subtitle={
                summary.studentDirect.route?.display_name !== "Student applies directly (no agency)"
                  ? summary.studentDirect.route?.display_name
                  : "Student applies without agency"
              }
              active={summary.studentDirect.active}
              isDefault={summary.studentDirect.route?.is_default_route}
            />
          </div>

          {summary.defaultRoute ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground border-t pt-3">
              <span className="font-medium text-foreground">Default route:</span>
              <Badge variant="secondary" className="gap-1 font-normal">
                <Star className="size-3" />
                {summary.defaultRoute.display_name}
              </Badge>
              <span>({channelLabel(summary.defaultRoute.channel_type)})</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground border-t pt-3">
              No default route set — mark one route as default for counselor recommendations.
            </p>
          )}
        </>
      )}
    </div>
  );

  if (embedded) {
    return <div className="border rounded-lg p-4 bg-muted/10">{body}</div>;
  }

  return <Card className="p-6 max-w-3xl">{body}</Card>;
}
