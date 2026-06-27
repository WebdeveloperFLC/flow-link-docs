import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OfficialResourcesPanel } from "./OfficialResourcesPanel";
import type { ProgramSummary, AvailabilityOffering } from "@/institutions/lib/programSummary";

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 text-sm">
      <span className="text-muted-foreground sm:w-36 shrink-0">{label}</span>
      <span className="font-medium min-w-0">{value}</span>
    </div>
  );
}

function boolLabel(v: boolean | null) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "Unknown";
}

export function ProgramSummaryPanel({
  summary,
  availability,
}: {
  summary: ProgramSummary;
  availability: AvailabilityOffering[];
}) {
  return (
    <div className="space-y-3 mb-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Program summary
            </div>
            <h3 className="text-lg font-semibold mt-1">{summary.programName}</h3>
          </div>
          <Badge variant="secondary">{summary.offeringCount} offering{summary.offeringCount === 1 ? "" : "s"}</Badge>
        </div>

        <div className="grid gap-2">
          <SummaryRow label="Qualification" value={summary.qualification} />
          <SummaryRow label="Study area" value={summary.studyArea} />
          <SummaryRow label="Duration" value={summary.durationLabel} />
          <SummaryRow label="PGWP" value={boolLabel(summary.pgwp)} />
          <SummaryRow label="Co-op" value={boolLabel(summary.coop)} />
          <SummaryRow label="Tuition summary" value={summary.tuitionSummary} />
          <SummaryRow label="Admission summary" value={summary.admissionSummary} />
          <SummaryRow label="Intake summary" value={summary.intakeSummary} />
          {summary.aiSummary ? <SummaryRow label="AI summary" value={summary.aiSummary} /> : null}
          {summary.futureLinkNotes ? (
            <SummaryRow label="Future Link notes" value={summary.futureLinkNotes} />
          ) : null}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Availability</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Campus and intake differences live here — one program, multiple offerings.
          </p>
        </div>
        {availability.length === 0 ? (
          <p className="text-sm text-muted-foreground">No offerings in this group.</p>
        ) : (
          <div className="space-y-2">
            {availability.map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm space-y-1">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {a.reviewStatus.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{a.deliveryMode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Campuses: </span>
                  {a.campuses.length ? a.campuses.join(", ") : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Intakes: </span>
                  {a.intakes.length ? a.intakes.join(", ") : "—"}
                </div>
                {a.notes ? <p className="text-xs text-muted-foreground">{a.notes}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <OfficialResourcesPanel resources={summary.officialResources} />
    </div>
  );
}
