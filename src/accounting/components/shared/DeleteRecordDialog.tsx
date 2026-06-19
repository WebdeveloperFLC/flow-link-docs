import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  posted?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

/**
 * Shared destructive-confirmation dialog for accounting list/detail pages.
 * Pass `posted` for stronger wording (posted journals etc.).
 */
export default function DeleteRecordDialog({
  open,
  onOpenChange,
  onConfirm,
  posted = false,
  title,
  description,
  confirmLabel,
}: Props) {
  const dialogTitle = title ?? (posted ? "Delete posted journal entry?" : "Delete this record?");
  const dialogDescription =
    description ??
    (posted
      ? "Warning: This journal has been posted. Deleting it will affect your trial balance and general ledger. During testing this is allowed."
      : "This action cannot be undone. The record will be permanently removed.");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {confirmLabel ?? (posted ? "Delete anyway" : "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}