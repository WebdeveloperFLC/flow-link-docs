import { Badge } from "@/components/ui/badge";
import type { PartnershipChannelType } from "../types/partnership";

export type InstitutionRouteBadge = {
  id: string;
  channel_type: PartnershipChannelType;
  status: string;
  aggregator?: { name: string; short_code?: string | null } | null;
};

const CHANNEL_LABEL: Record<PartnershipChannelType, string> = {
  direct: "Direct tie-up",
  indirect: "Indirect",
  student_direct: "Student direct",
};

export function PartnershipChannelBadges({
  routes,
  legacyDirectPartner,
}: {
  routes: InstitutionRouteBadge[];
  /** Pre-routes `is_partner` flag when no active direct route row exists yet. */
  legacyDirectPartner?: boolean;
}) {
  const active = routes.filter((r) => r.status === "active");
  const hasDirectRoute = active.some((r) => r.channel_type === "direct");
  const direct = hasDirectRoute || (legacyDirectPartner && active.length === 0);
  const indirect = active.filter((r) => r.channel_type === "indirect");
  const studentDirect = active.some((r) => r.channel_type === "student_direct");

  if (!direct && !indirect.length && !studentDirect) return null;

  return (
    <div className="flex gap-1 mt-2 flex-wrap items-center">
      {direct && (
        <Badge variant="default" className="text-[10px] font-medium">
          {CHANNEL_LABEL.direct}
        </Badge>
      )}
      {indirect.map((r) => (
        <Badge key={r.id} variant="secondary" className="text-[10px] font-normal gap-0.5 py-0.5">
          <span>{CHANNEL_LABEL.indirect}</span>
          {r.aggregator?.name && (
            <span className="text-[9px] opacity-75 font-normal">· {r.aggregator.name}</span>
          )}
        </Badge>
      ))}
      {studentDirect && (
        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
          {CHANNEL_LABEL.student_direct}
        </Badge>
      )}
    </div>
  );
}
