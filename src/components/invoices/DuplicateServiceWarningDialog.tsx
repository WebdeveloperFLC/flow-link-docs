import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DuplicateServiceCheck } from "@/lib/arInvoiceWorkflow";

interface Props {
  check: DuplicateServiceCheck | null;
  onClose: () => void;
  onUseExisting: () => void;
  onOpenDraft?: (invoiceId: string) => void;
  onForceContinue?: () => void;
  canForce?: boolean;
}

export default function DuplicateServiceWarningDialog({
  check,
  onClose,
  onUseExisting,
  onOpenDraft,
  onForceContinue,
  canForce,
}: Props) {
  if (!check || check.kind === "none") return null;

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Service already exists</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{check.message}</p>
            <p className="text-xs text-muted-foreground">
              Service: <b>{check.serviceName}</b>
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          {check.kind === "draft" && check.draftInvoiceId && onOpenDraft && (
            <AlertDialogAction onClick={() => onOpenDraft(check.draftInvoiceId!)}>
              Open draft invoice
            </AlertDialogAction>
          )}
          {(check.kind === "enrolled" || check.kind === "outstanding") && (
            <AlertDialogAction onClick={onUseExisting}>Use existing request</AlertDialogAction>
          )}
          {canForce && onForceContinue && check.kind === "outstanding" && (
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700" onClick={onForceContinue}>
              Continue anyway (top-up)
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
