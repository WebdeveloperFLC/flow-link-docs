import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvoiceClientContext } from "@/lib/arInvoiceWorkflow";

const FIELDS: { key: keyof InvoiceClientContext; label: string }[] = [
  { key: "institution", label: "Institution" },
  { key: "program", label: "Program" },
  { key: "intake", label: "Intake" },
  { key: "country", label: "Country" },
  { key: "counselorName", label: "Counselor" },
  { key: "visaStatus", label: "Visa status" },
];

interface Props {
  context: InvoiceClientContext;
  editable?: boolean;
  onChange?: (patch: Partial<InvoiceClientContext>) => void;
}

export default function InvoiceClientContextHeader({ context, editable, onChange }: Props) {
  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Client context {editable ? "(override enabled)" : "(CRM-sourced)"}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <Label className="text-[10px] text-muted-foreground">{label}</Label>
            {editable && onChange ? (
              <Input
                className="h-8 mt-0.5 text-xs"
                value={(context[key] as string | null) ?? ""}
                onChange={(e) => onChange({ [key]: e.target.value || null })}
              />
            ) : (
              <div className="font-medium truncate">{(context[key] as string | null) ?? "—"}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
