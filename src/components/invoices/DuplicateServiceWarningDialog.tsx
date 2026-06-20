import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BillingStageBadge from "@/components/invoices/BillingStageBadge";
import type { DuplicateServiceCheck } from "@/lib/arInvoiceWorkflow";

interface Props {
  check: DuplicateServiceCheck | null;
  onClose: () => void;
  onUseExisting: () => void;
  onOpenDraft?: (invoiceId: string) => void;
  onForceContinue?: () => void;
  onCreateDeposit?: () => void;
  onCreateInstallment?: () => void;
  canForce?: boolean;
}

function titleFor(kind: DuplicateServiceCheck["kind"]): string {
  switch (kind) {
    case "deposit_invoice":
      return "Deposit invoice";
    case "additional_installment":
      return "Installment invoice";
    case "balance_invoice":
      return "Balance invoice";
    case "top_up":
      return "Exceeds billing cap";
    case "duplicate_draft":
      return "Draft invoice exists";
    case "duplicate_service":
    case "enrolled":
      return "Service already exists";
    case "outstanding_collect_first":
    case "outstanding":
      return "Outstanding AR on prior invoice";
    default:
      return "Billing notice";
  }
}

/** Billing intent dialog (deposit / installment / balance / top-up). */
export default function BillingIntentDialog({
  check,
  onClose,
  onUseExisting,
  onOpenDraft,
  onForceContinue,
  onCreateDeposit,
  onCreateInstallment,
  canForce,
}: Props) {
  if (!check || check.kind === "none") return null;

  const kind = check.kind;

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 flex-wrap">
            {titleFor(kind)}
            {check.billingStage && <BillingStageBadge stage={check.billingStage} />}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{check.message}</p>
            <p className="text-xs text-muted-foreground">
              Service: <b>{check.serviceName}</b>
              {check.requestedAmount != null && (
                <> · Requested {check.requestedAmount.toFixed(2)}</>
              )}
              {check.remainingBillable != null && (
                <> · Remaining billable {check.remainingBillable.toFixed(2)}</>
              )}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>

          {kind === "duplicate_draft" && check.draftInvoiceId && onOpenDraft && (
            <AlertDialogAction onClick={() => onOpenDraft(check.draftInvoiceId!)}>
              Open draft invoice
            </AlertDialogAction>
          )}

          {kind === "deposit_invoice" && onCreateDeposit && (
            <AlertDialogAction onClick={onCreateDeposit}>Create deposit invoice</AlertDialogAction>
          )}

          {(kind === "additional_installment" || kind === "balance_invoice") && onCreateInstallment && (
            <AlertDialogAction onClick={onCreateInstallment}>Create installment invoice</AlertDialogAction>
          )}

          {(kind === "duplicate_service" || kind === "enrolled") && (
            <AlertDialogAction onClick={onUseExisting}>Use existing request</AlertDialogAction>
          )}

          {(kind === "outstanding_collect_first" || kind === "outstanding") && (
            <>
              <AlertDialogAction onClick={onUseExisting}>Use existing request</AlertDialogAction>
              {onCreateInstallment && (
                <AlertDialogAction onClick={onCreateInstallment}>Proceed with installment</AlertDialogAction>
              )}
            </>
          )}

          {canForce && onForceContinue && kind === "top_up" && (
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700" onClick={onForceContinue}>
              Finance override (one-time)
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
