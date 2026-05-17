import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  posted?: boolean;
}

/**
 * Shared destructive-confirmation dialog for accounting list/detail pages.
 * Pass `posted` for stronger wording (posted journals etc.).
 */
export default function DeleteRecordDialog({ open, onOpenChange, onConfirm, posted = false }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {posted ? "Delete posted journal entry?" : "Delete this record?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {posted
              ? "Warning: This journal has been posted. Deleting it will affect your trial balance and general ledger. During testing this is allowed."
              : "This action cannot be undone. The record will be permanently removed."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {posted ? "Delete anyway" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}