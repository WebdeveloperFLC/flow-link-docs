import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileDown, Mail, Printer } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  periodLabel: string;
  institutionName: string;
  templateLabel: string;
  submissionMethod: string;
  studentCount: number;
  expectedTotal: string;
  hasInvoice: boolean;
  invoiceNumber?: string | null;
  onExportCsv: () => void;
  onPrint: () => void;
  onDownloadInvoice?: () => void;
};

export function ClaimSubmissionPackageDialog({
  open,
  onClose,
  periodLabel,
  institutionName,
  templateLabel,
  submissionMethod,
  studentCount,
  expectedTotal,
  hasInvoice,
  invoiceNumber,
  onExportCsv,
  onPrint,
  onDownloadInvoice,
}: Props) {
  const emailPreview = `Subject: Commission claim — ${institutionName} — ${periodLabel}

Dear Partner,

Please find attached our commission claim for ${periodLabel}.
Students included: ${studentCount}
Total expected commission: ${expectedTotal}

Submission method: ${submissionMethod}

Regards,
Future Link Consultants Inc.`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Submission package — {periodLabel}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Institution-specific bundle generated from validated claim data. Database unchanged — artefacts export from existing rows.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{templateLabel}</Badge>
          <Badge variant="secondary">{submissionMethod}</Badge>
        </div>
        <div className="space-y-2 text-sm border rounded-md p-3">
          <PackageRow label="Student schedule (Excel/CSV)" included onExport={onExportCsv} icon={Download} />
          <PackageRow label="Printable claim summary (PDF via print)" included onExport={onPrint} icon={Printer} />
          {hasInvoice && (
            <PackageRow
              label={`Invoice ${invoiceNumber ?? ""}`}
              included={!!onDownloadInvoice}
              onExport={onDownloadInvoice}
              icon={FileDown}
            />
          )}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Mail className="size-3.5" /> Predefined email preview
            </div>
            <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded max-h-32 overflow-y-auto">{emailPreview}</pre>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onExportCsv(); onClose(); }}>
            <Download className="size-4 mr-1" /> Export package (CSV)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackageRow({
  label,
  included,
  onExport,
  icon: Icon,
}: {
  label: string;
  included?: boolean;
  onExport?: () => void;
  icon: typeof Download;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      {included && onExport ? (
        <Button size="sm" variant="ghost" onClick={onExport}>
          <Icon className="size-3.5 mr-1" /> Generate
        </Button>
      ) : (
        <Badge variant="outline" className="text-[10px]">Optional</Badge>
      )}
    </div>
  );
}
