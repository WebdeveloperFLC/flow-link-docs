import { ExternalLink, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MbbsPracticePathways } from "@/lib/service-library/mbbs/types";

type Props = {
  pathways: MbbsPracticePathways;
  institutionName: string;
};

export function ServiceMbbsPracticePanel({ pathways, institutionName }: Props) {
  return (
    <div className="space-y-4">
      <Card className="p-5 shadow-elev-sm border-rose-500/15">
        <h3 className="font-semibold text-base mb-2">Where graduates can practice</h3>
        <p className="text-sm text-muted-foreground mb-4">{pathways.summary}</p>
        {pathways.lastVerified && (
          <Badge variant="outline" className="mb-4">
            Verified {pathways.lastVerified}
          </Badge>
        )}

        <div className="space-y-5">
          <section>
            <h4 className="text-sm font-semibold mb-2">India — FMGE / NExT</h4>
            <p className="text-sm mb-2">{pathways.india.fmgeNext}</p>
            <ul className="text-sm space-y-1.5 list-disc pl-4">
              {pathways.india.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            {pathways.india.sourceUrl && (
              <a
                href={pathways.india.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
              >
                NMC / NBE guidance <ExternalLink className="size-3" />
              </a>
            )}
          </section>

          {pathways.hostCountry?.summary ? (
            <section>
              <h4 className="text-sm font-semibold mb-2">Host country practice</h4>
              <p className="text-sm mb-2">{pathways.hostCountry.summary}</p>
              <ul className="text-sm space-y-1.5 list-disc pl-4">
                {pathways.hostCountry.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              {pathways.hostCountry.sourceUrl && (
                <a
                  href={pathways.hostCountry.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                >
                  Official university source <ExternalLink className="size-3" />
                </a>
              )}
            </section>
          ) : null}

          {pathways.usCanada?.summary ? (
            <section>
              <h4 className="text-sm font-semibold mb-2">United States & Canada</h4>
              <p className="text-sm mb-2">{pathways.usCanada.summary}</p>
              <ul className="text-sm space-y-1.5 list-disc pl-4">
                {pathways.usCanada.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              {pathways.usCanada.sourceUrl && (
                <a
                  href={pathways.usCanada.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                >
                  Graduate / licensing pathway <ExternalLink className="size-3" />
                </a>
              )}
            </section>
          ) : null}

          <section>
            <h4 className="text-sm font-semibold mb-2">Degree recognition</h4>
            {pathways.recognition.who && (
              <p className="text-sm mb-1">
                <span className="font-medium">WHO / WFME: </span>
                {pathways.recognition.who}
              </p>
            )}
            {pathways.recognition.nmc && (
              <p className="text-sm mb-2">
                <span className="font-medium">NMC India: </span>
                {pathways.recognition.nmc}
              </p>
            )}
            <ul className="text-xs space-y-1">
              {pathways.recognition.sourceUrls.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    {u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]} <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {pathways.restrictions?.length ? (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mt-4">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Counselor restrictions</p>
            <ul className="text-xs space-y-1">
              {pathways.restrictions.map((r) => (
                <li key={r}>— {r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 mt-4">
          <Info className="size-4 shrink-0 mt-0.5" />
          <p>
            Licensing rules change. Always verify {institutionName} accreditation and NMC eligibility on
            official sources before promising practice pathways to Indian clients.
          </p>
        </div>
      </Card>
    </div>
  );
}
