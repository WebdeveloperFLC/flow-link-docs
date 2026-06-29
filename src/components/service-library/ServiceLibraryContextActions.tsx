import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildServiceLibraryUrl } from "@/lib/service-library/serviceCodes";
import { EligibilityAssessmentDialog } from "@/components/clients/EligibilityAssessmentDialog";

type Props = {
  libraryId: string;
  country?: string | null;
  clientId?: string;
  /** Show Eligibility Assessment action (default true when clientId set). */
  showEligibility?: boolean;
  /** Show Service Library link (default true). */
  showServiceLibraryBack?: boolean;
  size?: "sm" | "default";
};

export function ServiceLibraryContextActions({
  libraryId,
  country,
  clientId,
  showEligibility,
  showServiceLibraryBack = true,
  size = "sm",
}: Props) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const showAssessment = showEligibility ?? !!clientId;

  const openAssessment = () => {
    if (!clientId) {
      navigate(buildServiceLibraryUrl({ libraryId, country, tab: "eligibility" }));
      return;
    }
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showServiceLibraryBack && (
          <Button variant="outline" size={size} asChild>
            <Link to={buildServiceLibraryUrl({ libraryId, country })}>
              <ChevronLeft className="size-4 mr-1" />
              Knowledge Centre
            </Link>
          </Button>
        )}
        {showAssessment && (
          <Button variant="outline" size={size} onClick={openAssessment}>
            <ClipboardCheck className="size-4 mr-1" />
            Eligibility Assessment
          </Button>
        )}
      </div>
      {clientId && (
        <EligibilityAssessmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clientId={clientId}
          libraryId={libraryId}
          country={country}
        />
      )}
    </>
  );
}
