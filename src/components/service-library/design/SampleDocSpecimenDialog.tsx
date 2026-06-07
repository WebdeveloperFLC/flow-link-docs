import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SampleDocSpecimenContent, type SpecimenDoc } from "@/components/service-library/design/sampleDocSpecimens";

type Props = {
  doc: SpecimenDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SampleDocSpecimenDialog({ doc, open, onOpenChange }: Props) {
  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base pr-8">
            {doc.title}
            <Badge variant="outline" className="text-[10px] font-normal">
              Mock specimen
            </Badge>
            {doc.docKind && (
              <Badge variant="secondary" className="text-[10px] capitalize font-normal">
                {doc.docKind.replace(/_/g, " ")}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <SampleDocSpecimenContent doc={doc} />
        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Training specimen only — not a real client document. Upload redacted PDFs in Service Library Admin for production use.
        </p>
      </DialogContent>
    </Dialog>
  );
}
