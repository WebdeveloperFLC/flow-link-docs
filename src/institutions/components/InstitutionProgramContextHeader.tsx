import { Link } from "react-router-dom";
import { ExternalLink, Layers, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstitutionLogo } from "./InstitutionLogo";
import { InstitutionStatusBadge } from "./InstitutionStatusBadge";
import type { InstitutionStatus } from "../types/upi";

export type InstitutionProgramContext = {
  id: string;
  name: string;
  country_name: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  city?: string | null;
  institution_type?: string | null;
  institution_status?: InstitutionStatus | string | null;
};

export function InstitutionProgramContextHeader({
  institution,
  programGroupCount,
  offeringCount,
  pendingCount,
}: {
  institution: InstitutionProgramContext;
  programGroupCount: number;
  offeringCount: number;
  pendingCount: number;
}) {
  const location = [institution.city, institution.country_name].filter(Boolean).join(", ");

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <InstitutionLogo url={institution.logo_url} name={institution.name} size="lg" />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold truncate">{institution.name}</h2>
              <InstitutionStatusBadge status={institution.institution_status} />
            </div>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
              {location ? <span>{location}</span> : null}
              {institution.institution_type ? <span>{institution.institution_type}</span> : null}
            </div>
            {institution.website_url ? (
              <a
                href={institution.website_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
              >
                Website <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Layers className="size-3" />
            {programGroupCount} program{programGroupCount === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline">{offeringCount} offering{offeringCount === 1 ? "" : "s"}</Badge>
          {pendingCount > 0 ? (
            <Badge className="bg-amber-500/15 text-amber-800 border-0">{pendingCount} pending review</Badge>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link to={`/institutions/${institution.id}`}>
              <Receipt className="size-3.5 mr-1.5" />
              Fee Schedule &amp; profile
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/institutions/review?institutionId=${institution.id}`}>Refresh workspace</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
