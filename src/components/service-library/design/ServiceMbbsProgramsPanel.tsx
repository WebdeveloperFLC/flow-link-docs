import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MbbsProgram } from "@/lib/service-library/mbbs/types";

type Props = {
  programs: MbbsProgram[];
  institutionName: string;
};

export function ServiceMbbsProgramsPanel({ programs, institutionName }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Medical and pre-medical programs offered through or affiliated with {institutionName}. Verify
        current availability on the official website before quoting clients.
      </p>
      {programs.map((p) => (
        <Card key={p.name} className="p-5 shadow-elev-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold">{p.name}</h3>
            <Badge variant="outline">{p.degree}</Badge>
          </div>
          <p className="text-sm mb-3">{p.summary}</p>
          <dl className="grid sm:grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd>{p.duration}</dd>
            </div>
            {p.medium && (
              <div>
                <dt className="text-muted-foreground">Medium</dt>
                <dd>{p.medium}</dd>
              </div>
            )}
            {p.intakes?.length ? (
              <div>
                <dt className="text-muted-foreground">Intakes</dt>
                <dd>{p.intakes.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
          {p.notes && <p className="text-xs text-muted-foreground mt-3">{p.notes}</p>}
          {p.sourceUrl && (
            <a
              href={p.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
            >
              Official program page <ExternalLink className="size-3" />
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}
