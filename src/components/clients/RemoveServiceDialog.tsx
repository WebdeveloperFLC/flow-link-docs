import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import type { ServiceCatalogueItem } from "@/lib/leads";
import {
  assessClientServiceRemoval,
  executeClientServiceRemoval,
  recordFinancialTransferRequest,
  type DocumentDisposition,
  type ServiceRemovalAssessment,
} from "@/lib/clientServiceRemoval";
import { FinancialTransferWizard } from "@/components/clients/FinancialTransferWizard";
import {
  financialDependencySummary,
  nonFinancialDependencySummary,
  type FinancialTransferReason,
} from "@/lib/serviceFinancialDependencies";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  serviceCode: string;
  currentSelection: ServiceSelection;
  catalogue: ServiceCatalogueItem[];
  onCompleted: () => void;
}

export function RemoveServiceDialog({
  open,
  onOpenChange,
  clientId,
  serviceCode,
  currentSelection,
  catalogue,
  onCompleted,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [assessment, setAssessment] = useState<ServiceRemovalAssessment | null>(null);
  const [step, setStep] = useState<"warning" | "documents">("warning");
  const [documentDisposition, setDocumentDisposition] = useState<DocumentDisposition>("unassign");
  const [targetCaseId, setTargetCaseId] = useState<string>("");
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setStep("warning");
    setDocumentDisposition("unassign");
    setTargetCaseId("");
    setTransferOpen(false);
    void assessClientServiceRemoval({
      clientId,
      serviceCode,
      currentSelection,
      catalogue,
    })
      .then(setAssessment)
      .finally(() => setLoading(false));
  }, [open, clientId, serviceCode, currentSelection, catalogue]);

  const hasOtherServices = (assessment?.otherActiveServices.length ?? 0) > 0;
  const hasDocuments = (assessment?.linkedRecords.documents ?? 0) > 0;
  const isFinancialBlock = assessment?.blockReason === "financial";

  const handleContinue = () => {
    if (!assessment?.canRemove) return;
    if (hasDocuments && hasOtherServices) {
      setStep("documents");
      const first = assessment.otherActiveServices.find((s) => s.caseId);
      if (first?.caseId) {
        setTargetCaseId(first.caseId);
        setDocumentDisposition("move");
      }
      return;
    }
    void handleConfirm();
  };

  const handleConfirm = async () => {
    if (!assessment) return;
    setBusy(true);
    const result = await executeClientServiceRemoval({
      clientId,
      serviceCode,
      documentDisposition: hasDocuments ? documentDisposition : "unassign",
      targetCaseId: documentDisposition === "move" ? targetCaseId : null,
      catalogue,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Service archived");
    onCompleted();
    onOpenChange(false);
  };

  const handleTransferSubmitted = async (payload: {
    sourceServiceCode: string;
    targetServiceCode: string;
    targetCaseId: string | null;
    reason: FinancialTransferReason;
    reasonNotes: string;
  }) => {
    setBusy(true);
    const result = await recordFinancialTransferRequest({
      clientId,
      sourceServiceCode: payload.sourceServiceCode,
      targetServiceCode: payload.targetServiceCode,
      targetCaseId: payload.targetCaseId,
      reason: payload.reason,
      reasonNotes: payload.reasonNotes,
      caseId: assessment?.openCaseIds[0] ?? null,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTransferOpen(false);
  };

  const financialLines = assessment ? financialDependencySummary(assessment.dependencies) : [];
  const nonFinancialLines = assessment ? nonFinancialDependencySummary(assessment.dependencies) : [];

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Archive service
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Checking linked records…
            </div>
          ) : !assessment ? null : isFinancialBlock ? (
            <div className="space-y-4 text-sm">
              <p className="font-medium">{assessment.serviceLabel}</p>
              <p className="text-destructive">{assessment.blockMessage}</p>

              {financialLines.length > 0 ? (
                <div className="rounded-md border p-3 space-y-1">
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    Financial records
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {financialLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {nonFinancialLines.length > 0 ? (
                <div className="rounded-md border p-3 space-y-1">
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    Other linked records
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {nonFinancialLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || !hasOtherServices}
                  onClick={() => setTransferOpen(true)}
                >
                  Transfer financials
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    toast.info("Refund processing will be available in Phase A4 after policy configuration.")
                  }
                >
                  Process refund
                </Button>
              </DialogFooter>
              {!hasOtherServices ? (
                <p className="text-xs text-muted-foreground">
                  Add another active service on this client before transferring financial records.
                </p>
              ) : null}
            </div>
          ) : !assessment.canRemove ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{assessment.serviceLabel}</p>
              <p className="text-destructive">{assessment.blockMessage}</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : step === "warning" ? (
            <div className="space-y-4 text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400">WARNING</p>
              <p>
                <span className="font-medium">{assessment.serviceLabel}</span> will be archived and
                hidden from the active workflow.
              </p>
              <p>Archiving will <strong>NOT</strong> delete:</p>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                <li>Documents ({assessment.linkedRecords.documents})</li>
                <li>Payments and invoices</li>
                <li>Forms</li>
                <li>Notes</li>
                <li>Tasks</li>
                <li>Communication history</li>
                <li>Audit history</li>
                <li>Application history</li>
                <li>Commissions</li>
              </ul>
              <p>Do you want to continue?</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={handleContinue} disabled={busy}>
                  Continue
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <p>
                This service has <strong>{assessment.linkedRecords.documents}</strong> linked document
                {assessment.linkedRecords.documents === 1 ? "" : "s"}. Choose what to do:
              </p>
              <RadioGroup
                value={documentDisposition}
                onValueChange={(v) => setDocumentDisposition(v as DocumentDisposition)}
              >
                {hasOtherServices ? (
                  <div className="flex items-start space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="move" id="move" className="mt-1" />
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="move" className="font-medium cursor-pointer">
                        Move documents to another active service
                      </Label>
                      {documentDisposition === "move" ? (
                        <Select value={targetCaseId} onValueChange={setTargetCaseId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target service" />
                          </SelectTrigger>
                          <SelectContent>
                            {assessment.otherActiveServices
                              .filter((s) => s.caseId)
                              .map((s) => (
                                <SelectItem key={s.code} value={s.caseId!}>
                                  {s.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="flex items-start space-x-2 rounded-md border p-3">
                  <RadioGroupItem value="unassign" id="unassign" className="mt-1" />
                  <Label htmlFor="unassign" className="cursor-pointer">
                    {hasOtherServices
                      ? "Keep documents unassigned"
                      : "Keep as Unassigned Documents on client profile"}
                  </Label>
                </div>
              </RadioGroup>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("warning")} disabled={busy}>
                  Back
                </Button>
                <Button
                  onClick={() => void handleConfirm()}
                  disabled={busy || (documentDisposition === "move" && !targetCaseId)}
                >
                  {busy && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                  Archive service
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {assessment && isFinancialBlock ? (
        <FinancialTransferWizard
          open={transferOpen}
          onOpenChange={setTransferOpen}
          clientId={clientId}
          sourceServiceCode={serviceCode}
          sourceServiceLabel={assessment.serviceLabel}
          targetServices={assessment.otherActiveServices}
          onSubmitted={(payload) => void handleTransferSubmitted(payload)}
        />
      ) : null}
    </>
  );
}
