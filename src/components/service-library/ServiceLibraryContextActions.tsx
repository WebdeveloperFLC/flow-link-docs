import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildServiceLibraryUrl } from "@/lib/service-library/serviceCodes";
import { createStaffEligibilitySession } from "@/lib/service-eligibility/sessions";
import { fetchEligibilityQuestions, prefillEligibilityFromClient } from "@/lib/service-eligibility/questions";
import { toast } from "sonner";

type Props = {
  libraryId: string;
  country?: string | null;
  clientId?: string;
  /** Show Eligibility Assessment action (default true when clientId set). */
  showEligibility?: boolean;
  size?: "sm" | "default";
};

export function ServiceLibraryContextActions({
  libraryId,
  country,
  clientId,
  showEligibility,
  size = "sm",
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const showAssessment = showEligibility ?? !!clientId;

  const startEligibility = async () => {
    if (!clientId) {
      navigate(buildServiceLibraryUrl({ libraryId, country, tab: "eligibility" }));
      return;
    }
    setBusy(true);
    try {
      const qs = await fetchEligibilityQuestions(libraryId);
      const prefillAnswers = await prefillEligibilityFromClient(clientId, qs);
      const { sessionId } = await createStaffEligibilitySession({
        libraryId,
        clientId,
        prefillAnswers,
      });
      navigate(`/eligibility/run/${sessionId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not start assessment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size={size} asChild>
        <Link to={buildServiceLibraryUrl({ libraryId, country })}>
          <ChevronLeft className="size-4 mr-1" />
          Service Library
        </Link>
      </Button>
      {showAssessment && (
        <Button variant="outline" size={size} onClick={startEligibility} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <ClipboardCheck className="size-4 mr-1" />
          )}
          Eligibility Assessment
        </Button>
      )}
    </div>
  );
}
