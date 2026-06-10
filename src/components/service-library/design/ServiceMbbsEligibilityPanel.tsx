import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";

type Props = {
  view: AcademyViewModel;
  onOpenFees?: () => void;
};

export function ServiceMbbsEligibilityPanel({ view, onOpenFees }: Props) {
  const metCount = view.eligibility.filter((e) => e.met).length;
  const total = view.eligibility.length;
  const institution = view.mbbsMeta?.institutionName ?? view.title;

  return (
    <div className="space-y-4">
      <Card className="p-5 shadow-elev-sm border-primary/20 bg-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardCheck className="size-5 text-primary" />
              Eligibility check — {institution}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Review each criterion with the client before taking fees. Indian applicants: verify NEET rules and NMC
              foreign medical institutions list for the current intake year.
            </p>
            {total > 0 && (
              <Badge variant="secondary" className="mt-2">
                {metCount} of {total} reference criteria typically met
              </Badge>
            )}
          </div>
          {view.mbbsMeta?.website && (
            <a
              href={view.mbbsMeta.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline shrink-0"
            >
              Official admissions →
            </a>
          )}
        </div>
      </Card>

      {view.eligibility.length > 0 ? (
        <Card className="p-5 shadow-elev-sm">
          <h3 className="font-semibold mb-3">Reference criteria</h3>
          <ul className="space-y-3">
            {view.eligibility.map((e) => (
              <li key={e.criterion} className="flex items-start gap-3 text-sm">
                {e.met ? (
                  <CheckCircle2 className="size-5 text-success shrink-0" />
                ) : (
                  <XCircle className="size-5 text-amber-600 shrink-0" />
                )}
                <div>
                  <div className="font-medium">{e.criterion}</div>
                  {e.note && <p className="text-xs text-muted-foreground mt-0.5">{e.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="p-5 shadow-elev-sm">
          <p className="text-sm text-muted-foreground">No eligibility criteria configured yet.</p>
        </Card>
      )}

      <Card className="p-4 shadow-elev-sm border-amber-500/25 bg-amber-500/5">
        <div className="flex gap-2 text-sm">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-100">Before you quote fees</p>
            <p className="text-xs text-muted-foreground mt-1">
              Confirm tuition on the official university fee page — never rely on agent brochures alone.
              {onOpenFees && (
                <>
                  {" "}
                  <button type="button" onClick={onOpenFees} className="text-primary hover:underline font-medium">
                    Open Fees tab
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
