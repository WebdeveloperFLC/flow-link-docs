import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Milestone } from "lucide-react";
import { toast } from "sonner";
import {
  recordApplicationSubmitted,
  updateApplicationMilestones,
} from "@/lib/application/applicationApi";
import type { ApplicationMilestones } from "@/lib/application/types";

type Props = {
  applicationId: string;
  milestones: ApplicationMilestones | null;
  canEdit: boolean;
  loading: boolean;
  onChanged: () => Promise<void>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function ApplicationMilestonesPanel({
  applicationId,
  milestones,
  canEdit,
  loading,
  onChanged,
}: Props) {
  const [offerReceivedAt, setOfferReceivedAt] = useState("");
  const [visaFiledAt, setVisaFiledAt] = useState("");
  const [visaApprovedAt, setVisaApprovedAt] = useState("");
  const [enrollmentAt, setEnrollmentAt] = useState("");
  const [submitDate, setSubmitDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!milestones) return;
    setOfferReceivedAt(milestones.offerReceivedAt ?? "");
    setVisaFiledAt(milestones.visaFiledAt ?? "");
    setVisaApprovedAt(milestones.visaApprovedAt ?? "");
    setEnrollmentAt(milestones.enrollmentAt ?? "");
    setSubmitDate(milestones.applicationSubmittedDate ?? "");
  }, [milestones]);

  const handleSaveMilestones = async () => {
    setSaving(true);
    try {
      await updateApplicationMilestones({
        applicationId,
        offerReceivedAt: offerReceivedAt || null,
        visaFiledAt: visaFiledAt || null,
        visaApprovedAt: visaApprovedAt || null,
        enrollmentAt: enrollmentAt || null,
      });
      toast.success("Milestone dates saved");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRecordSubmitted = async () => {
    setSubmitting(true);
    try {
      await recordApplicationSubmitted(applicationId, submitDate || undefined);
      toast.success("Application submission recorded");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record submission");
    } finally {
      setSubmitting(false);
    }
  };

  const alreadySubmitted = !!milestones?.applicationSubmittedDate;

  return (
    <Card className="p-5 space-y-4">
      <div>
        <div className="font-medium flex items-center gap-2">
          <Milestone className="size-4 text-muted-foreground" />
          Application Milestones
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Key pipeline dates. Submission is recorded once; offer-received may also be set from Offer
          Information.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading milestones…
        </div>
      ) : !milestones ? (
        <div className="text-sm text-muted-foreground">No milestone record.</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Application created</Label>
              <div className="text-sm">{formatDate(milestones.applicationCreatedAt)}</div>
            </div>

            <div className="space-y-2">
              <Label>Submitted to institution</Label>
              {alreadySubmitted ? (
                <div className="text-sm">{formatDate(milestones.applicationSubmittedDate)}</div>
              ) : canEdit ? (
                <div className="flex flex-wrap items-end gap-2">
                  <Input
                    type="date"
                    value={submitDate}
                    onChange={(e) => setSubmitDate(e.target.value)}
                    className="max-w-[180px]"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleRecordSubmitted()}
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="size-4 mr-1 animate-spin" />}
                    Record submission
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Not submitted</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ms-offer-received">Offer received</Label>
              <Input
                id="ms-offer-received"
                type="date"
                value={offerReceivedAt}
                onChange={(e) => setOfferReceivedAt(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ms-visa-filed">Visa filed</Label>
              <Input
                id="ms-visa-filed"
                type="date"
                value={visaFiledAt}
                onChange={(e) => setVisaFiledAt(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ms-visa-approved">Visa approved</Label>
              <Input
                id="ms-visa-approved"
                type="date"
                value={visaApprovedAt}
                onChange={(e) => setVisaApprovedAt(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ms-enrollment">Enrollment</Label>
              <Input
                id="ms-enrollment"
                type="date"
                value={enrollmentAt}
                onChange={(e) => setEnrollmentAt(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => void handleSaveMilestones()} disabled={saving}>
                {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
                Save milestones
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
