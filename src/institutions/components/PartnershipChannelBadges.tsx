import { Badge } from "@/components/ui/badge";
import { buildRecruitmentChannelSummary } from "../lib/partnershipRoutes";
import type { PartnershipChannelType } from "../types/partnership";

export type InstitutionRouteBadge = {
  id: string;
  channel_type: PartnershipChannelType;
  status: string;
  display_name?: string;
  is_default_route?: boolean;
  aggregator?: { name: string; short_code?: string | null } | null;
};

export function PartnershipChannelBadges({
  routes,
  legacyDirectPartner,
}: {
  routes: InstitutionRouteBadge[];
  /** Pre-routes `is_partner` flag when no active direct route row exists yet. */
  legacyDirectPartner?: boolean;
}) {
  const summary = buildRecruitmentChannelSummary(routes as Parameters<typeof buildRecruitmentChannelSummary>[0], legacyDirectPartner);

  if (!summary.hasAnyActiveChannel) return null;

  return (
    <div className="flex gap-1 mt-2 flex-wrap items-center">
      {summary.directTieUp.active && (
        <Badge variant="default" className="text-[10px] font-medium">
          Direct tie-up
        </Badge>
      )}
      {summary.aggregators.map((agg) => (
        <Badge key={agg.routeId} variant="secondary" className="text-[10px] font-normal">
          {agg.name}
        </Badge>
      ))}
      {summary.studentDirect.active && (
        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
          Student direct
        </Badge>
      )}
      {summary.defaultRoute && (
        <Badge variant="outline" className="text-[9px] font-normal opacity-75">
          ★ {summary.defaultRoute.display_name}
        </Badge>
      )}
    </div>
  );
}
