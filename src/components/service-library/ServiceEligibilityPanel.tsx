import { ClipboardCheck, Link2, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";
import { buildPublicEligibilityUrl } from "@/lib/service-eligibility/questions";
import { usesSettleAbroadAssessment } from "@/lib/service-eligibility/settleAbroadBridge";
import { copyToClipboard } from "@/lib/serviceLibrary";
import { toast } from "sonner";

type Props = {
  view: AcademyViewModel;
  libraryId: string;
  country?: string | null;
  onStartAssessment: () => void;
};

export function ServiceEligibilityPanel({ view, libraryId, country, onStartAssessment }: Props) {
  const fullAssessment = usesSettleAbroadAssessment(libraryId);
  const publicUrl = buildPublicEligibilityUrl(libraryId, country);

  const copyPublicLink = async () => {
    const ok = await copyToClipboard(publicUrl);
    toast[ok ? "success" : "error"](ok ? "Public link copied" : "Copy failed");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 shadow-elev-sm border-primary/20 bg-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardCheck className="size-5 text-primary" />
              {fullAssessment ? "Full eligibility assessment" : "Eligibility assessment"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {fullAssessment
                ? "Comprehensive Settle Abroad questionnaire — personal profile, education, language, work experience, CRS score (Canada) or Chancenkarte points (Germany), pathway matching, and PDF report on submit."
                : "Short operational checklist for this service. Prefill from client records, capture items in preparation, and share a public link for prospects."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="sm" onClick={onStartAssessment}>
              <PlayCircle className="size-4 mr-1.5" />
              Start assessment
            </Button>
            <Button size="sm" variant="outline" onClick={copyPublicLink}>
              <Link2 className="size-4 mr-1.5" />
              Copy public link
            </Button>
          </div>
        </div>
      </Card>

      {view.eligibility.length > 0 && (
        <Card className="p-5 shadow-elev-sm">
          <h3 className="font-semibold mb-3">Reference criteria</h3>
          <ul className="space-y-3">
            {view.eligibility.map((e) => (
              <li key={e.criterion} className="flex items-start gap-3 text-sm">
                {e.met ? (
                  <CheckCircle2 className="size-5 text-success shrink-0" />
                ) : (
                  <XCircle className="size-5 text-muted-foreground shrink-0" />
                )}
                <div>
                  <div className="font-medium">{e.criterion}</div>
                  {e.note && <p className="text-xs text-muted-foreground mt-0.5">{e.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
