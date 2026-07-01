import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import type { InstitutionSubmissionTemplate } from "../../lib/claimBusinessView";

export function InstitutionTemplatePanel({ template }: { template: InstitutionSubmissionTemplate }) {
  return (
    <div className="rounded-md border p-3 space-y-3 text-sm">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-medium">{template.label}</span>
        <Badge variant="secondary">{template.method}</Badge>
        <Badge variant="outline">{template.tax}</Badge>
        <Badge variant="outline">{template.academicTerminology}</Badge>
        {template.portal && <Badge>Portal</Badge>}
        {template.directPaymentOnly && <Badge variant="outline">Direct payment</Badge>}
        {!template.requiresInvoice && <Badge variant="outline">No invoice</Badge>}
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <div>
          <div className="font-medium text-muted-foreground mb-1">Required columns</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {template.requiredColumns.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
        <div>
          <div className="font-medium text-muted-foreground mb-1">Column order (export)</div>
          <div className="text-muted-foreground">{template.columnOrder.join(" → ")}</div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground mb-1">Attachments</div>
          <div>{template.attachments.join(", ")}</div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground mb-1">Invoice numbering</div>
          <code className="text-[10px] bg-muted px-1 rounded">{template.invoiceNumbering}</code>
        </div>
      </div>
      <div>
        <div className="font-medium text-muted-foreground mb-1 text-xs">Submission checklist</div>
        <ul className="space-y-1">
          {template.checklist.map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      {template.portalUrl && (
        <div className="text-xs">
          <span className="font-medium">Portal:</span> {template.portalUrl}
        </div>
      )}
    </div>
  );
}
