import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MbbsInstitutionMeta } from "@/lib/service-library/mbbs/types";

type Props = {
  meta: MbbsInstitutionMeta;
};

export function ServiceMbbsInstitutionPanel({ meta }: Props) {
  return (
    <div className="space-y-4">
      <Card className="p-5 shadow-elev-sm border-rose-500/15">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-base">{meta.institutionName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {meta.city}, {meta.regionLabel}
            </p>
          </div>
          {meta.established && <Badge variant="outline">Est. {meta.established}</Badge>}
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground font-medium">Medium of instruction</dt>
            <dd className="mt-0.5">{meta.mediumOfInstruction}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">Program duration</dt>
            <dd className="mt-0.5">{meta.programDuration}</dd>
          </div>
          {meta.intakes?.length ? (
            <div>
              <dt className="text-muted-foreground font-medium">Intakes</dt>
              <dd className="mt-0.5">{meta.intakes.join(" · ")}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground font-medium">Accreditation & approvals</dt>
            <dd className="mt-0.5">
              <ul className="list-disc pl-4 space-y-1">
                {meta.accreditation.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </dd>
          </div>
          {meta.campusNotes ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground font-medium">Campus & training</dt>
              <dd className="mt-0.5">{meta.campusNotes}</dd>
            </div>
          ) : null}
          {meta.clinicalTrainingNotes ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground font-medium">Clinical training</dt>
              <dd className="mt-0.5">{meta.clinicalTrainingNotes}</dd>
            </div>
          ) : null}
        </dl>
        <a
          href={meta.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
        >
          Official university website <ExternalLink className="size-3.5" />
        </a>
      </Card>
    </div>
  );
}
