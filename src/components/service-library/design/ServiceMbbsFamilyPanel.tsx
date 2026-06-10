import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MbbsFamilyOptions } from "@/lib/service-library/mbbs/types";

type Props = {
  family: MbbsFamilyOptions;
};

export function ServiceMbbsFamilyPanel({ family }: Props) {
  return (
    <Card className="p-5 shadow-elev-sm">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-base">Family & dependants</h3>
        {family.lastVerified && <Badge variant="outline">Verified {family.lastVerified}</Badge>}
      </div>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground font-medium">Spouse / partner</dt>
          <dd className="mt-0.5">{family.spouseCanAccompany}</dd>
          <dd className="text-muted-foreground mt-1">{family.spouseWorkRights}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground font-medium">Children</dt>
          <dd className="mt-0.5">{family.childrenCanAccompany}</dd>
          {family.childrenNotes && <dd className="text-muted-foreground mt-1">{family.childrenNotes}</dd>}
        </div>
        {family.additionalFundsRequired && (
          <div>
            <dt className="text-muted-foreground font-medium">Additional funds</dt>
            <dd className="mt-0.5">{family.additionalFundsRequired}</dd>
          </div>
        )}
        {family.visaRoute && (
          <div>
            <dt className="text-muted-foreground font-medium">Visa route</dt>
            <dd className="mt-0.5">{family.visaRoute}</dd>
          </div>
        )}
      </dl>
      {family.restrictions.length > 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mt-4">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Restrictions</p>
          <ul className="text-xs space-y-1">
            {family.restrictions.map((r) => (
              <li key={r}>— {r}</li>
            ))}
          </ul>
        </div>
      )}
      {family.sourceUrl && (
        <a
          href={family.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
        >
          Official guidance <ExternalLink className="size-3" />
        </a>
      )}
    </Card>
  );
}
