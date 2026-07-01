import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileDown, Mail, Printer, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ClaimStudentRow, InstitutionSubmissionTemplate, ValidationIssue } from "../../lib/claimBusinessView";
import { buildEmailPreview, buildExcelPreviewRows } from "../../lib/claimBusinessView";
import { InstitutionTemplatePanel } from "./InstitutionTemplatePanel";

type Props = {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  approved: boolean;
  periodLabel: string;
  institutionName: string;
  template: InstitutionSubmissionTemplate;
  students: ClaimStudentRow[];
  expectedTotal: string;
  hasInvoice: boolean;
  invoiceNumber?: string | null;
  validatedAt?: string | null;
  validationIssues: ValidationIssue[];
  snapshotCount: number;
  onExportCsv: () => void;
  onPrint: () => void;
  onDownloadInvoice?: () => void;
};

export function ClaimSubmissionPackageDialog({
  open,
  onClose,
  onApprove,
  approved,
  periodLabel,
  institutionName,
  template,
  students,
  expectedTotal,
  hasInvoice,
  invoiceNumber,
  validatedAt,
  validationIssues,
  snapshotCount,
  onExportCsv,
  onPrint,
  onDownloadInvoice,
}: Props) {
  const [tab, setTab] = useState("overview");
  const emailPreview = buildEmailPreview(institutionName, periodLabel, template, students.length, expectedTotal);
  const excelRows = buildExcelPreviewRows(students, template);
  const errors = validationIssues.filter((i) => i.severity === "error");
  const warnings = validationIssues.filter((i) => i.severity === "warning");
  const submissionTimestamp = validatedAt ? new Date(validatedAt).toLocaleString() : "Not validated";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission package preview — {periodLabel}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Review exactly what will be submitted to the institution. Approve the package before submitting the claim.
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="template">Institution template</TabsTrigger>
            {template.excel && <TabsTrigger value="excel">Excel preview</TabsTrigger>}
            {template.word && <TabsTrigger value="word">Word preview</TabsTrigger>}
            {hasInvoice && template.requiresInvoice && <TabsTrigger value="invoice">Invoice</TabsTrigger>}
            <TabsTrigger value="email">Email</TabsTrigger>
            {template.portal && <TabsTrigger value="portal">Portal</TabsTrigger>}
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{template.label}</Badge>
              <Badge variant="secondary">{template.method}</Badge>
              {approved ? (
                <Badge className="bg-green-100 text-green-800">Package approved</Badge>
              ) : (
                <Badge variant="outline" className="border-amber-400">Awaiting approval</Badge>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm border rounded-md p-3">
              <div><span className="text-muted-foreground">Students:</span> {students.length}</div>
              <div><span className="text-muted-foreground">Expected total:</span> {expectedTotal}</div>
              <div><span className="text-muted-foreground">Snapshots:</span> {snapshotCount} frozen</div>
              <div><span className="text-muted-foreground">Submission timestamp:</span> {submissionTimestamp}</div>
            </div>
            <PackageRow label="Student schedule (Excel/CSV)" included onAction={onExportCsv} icon={Download} />
            <PackageRow label="Printable claim summary" included onAction={onPrint} icon={Printer} />
            {hasInvoice && template.requiresInvoice && (
              <PackageRow
                label={`Invoice ${invoiceNumber ?? ""}`}
                included={!!onDownloadInvoice}
                onAction={onDownloadInvoice}
                icon={FileDown}
              />
            )}
            {template.directPaymentOnly && (
              <div className="text-xs text-muted-foreground border rounded px-2 py-1.5">
                This institution uses direct commission payment — no invoice required.
              </div>
            )}
          </TabsContent>

          <TabsContent value="template" className="mt-3">
            <InstitutionTemplatePanel template={template} />
          </TabsContent>

          <TabsContent value="excel" className="mt-3">
            <div className="text-xs text-muted-foreground mb-2">
              Preview of institution Excel layout ({template.columnOrder.join(", ")})
            </div>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {excelRows.map((row, ri) => (
                    <tr key={ri} className={ri === 0 ? "bg-muted font-medium" : "border-t"}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-2 py-1 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="word" className="mt-3">
            <div className="border rounded-md p-4 text-sm space-y-2 bg-muted/20">
              <div className="font-semibold">Commission Claim Cover Letter</div>
              <div>{institutionName}</div>
              <div>Re: {periodLabel} — Agent Commission Claim</div>
              <p className="text-muted-foreground">
                Please find enclosed our commission claim for {students.length} student(s) for {template.academicTerminology} {periodLabel}.
                Total commission: {expectedTotal}. Tax treatment: {template.tax}.
              </p>
              <p className="text-muted-foreground">Supporting schedules attached per {template.label}.</p>
            </div>
          </TabsContent>

          <TabsContent value="invoice" className="mt-3">
            <div className="border rounded-md p-4 text-sm space-y-1">
              <div className="font-semibold">Invoice preview — {invoiceNumber ?? "Draft"}</div>
              <div>Bill to: {institutionName}</div>
              <div>Amount: {expectedTotal}</div>
              <div>Tax: {template.tax}</div>
              <div className="text-muted-foreground text-xs mt-2">Numbering pattern: {template.invoiceNumbering}</div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="mt-3">
            <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded max-h-64 overflow-y-auto border">{emailPreview}</pre>
          </TabsContent>

          <TabsContent value="portal" className="mt-3">
            <div className="border rounded-md p-4 text-sm space-y-2">
              <div className="font-medium">Portal submission summary</div>
              <div>Portal URL: {template.portalUrl ?? "Configured in institution metadata"}</div>
              <div>Students to enter: {students.length}</div>
              <div>Total commission: {expectedTotal}</div>
              <div className="text-xs text-muted-foreground">
                After portal submission, record the portal reference in business notes.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="validation" className="mt-3 space-y-2">
            {errors.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
                <CheckCircle2 className="size-5 shrink-0" />
                <div>Validation passed — {snapshotCount} snapshot(s) on file.</div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                <AlertTriangle className="size-5 shrink-0" />
                <div>{errors.length} issue(s) must be resolved before submission.</div>
              </div>
            )}
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {errors.map((i, idx) => (
                <li key={`e-${idx}`} className="text-red-800">Error: {i.message}</li>
              ))}
              {warnings.map((i, idx) => (
                <li key={`w-${idx}`} className="text-amber-800">Warning: {i.message}</li>
              ))}
            </ul>
            <div className="text-xs text-muted-foreground">
              Snapshot reference: {snapshotCount} student row(s) with frozen commission snapshot.
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!approved && errors.length === 0 && (
            <Button onClick={() => { onApprove(); }}>
              <CheckCircle2 className="size-4 mr-1" /> Approve submission package
            </Button>
          )}
          <Button variant="secondary" onClick={() => { onExportCsv(); }}>
            <Download className="size-4 mr-1" /> Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackageRow({
  label,
  included,
  onAction,
  icon: Icon,
}: {
  label: string;
  included?: boolean;
  onAction?: () => void;
  icon: typeof Download;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      {included && onAction ? (
        <Button size="sm" variant="ghost" onClick={onAction}>
          <Icon className="size-3.5 mr-1" /> Preview / generate
        </Button>
      ) : (
        <Badge variant="outline" className="text-[10px]">N/A</Badge>
      )}
    </div>
  );
}
