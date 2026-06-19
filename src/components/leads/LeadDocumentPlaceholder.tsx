import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

/** Phase D — Option A: no document upload/link on leads until client registration. */
export function LeadDocumentPlaceholder({ className }: Props) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground",
        className,
      )}
      data-testid="lead-document-placeholder"
    >
      <FileText className="size-3.5 shrink-0 mt-0.5" />
      <span>Document linking will be available after client registration.</span>
    </div>
  );
}
