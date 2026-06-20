import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Wallet, RefreshCw, ArrowRightLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fetchStudentFinancialSummary } from "@/accounting/stores/collectionCategoriesStore";
import type { StudentFinancialSummary, ServiceCollectionStatus } from "@/accounting/types/collectionCategory";
import { TREATMENT_LABELS } from "@/accounting/lib/collectionCategories";
import { formatCurrency } from "@/accounting/lib/format";

function collectionStatusLabel(s: ServiceCollectionStatus): string {
  switch (s) {
    case "NOT_INVOICED": return "Not invoiced";
    case "DRAFT": return "Draft";
    case "OUTSTANDING": return "Outstanding";
    case "PARTIAL": return "Partial";
    case "COLLECTED": return "Collected";
    case "TRUST_HELD": return "Trust held";
    default: return s;
  }
}

function collectionStatusVariant(s: ServiceCollectionStatus): "outline" | "secondary" | "default" | "destructive" {
  if (s === "COLLECTED") return "default";
  if (s === "TRUST_HELD" || s === "PARTIAL") return "secondary";
  if (s === "OUTSTANDING") return "destructive";
  return "outline";
}
function money(amount: number, currency: string) {
  try {
    return formatCurrency(amount, currency as "INR" | "CAD" | "USD");
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

interface Props {
  clientId: string;
  clientName?: string;
  institution?: string | null;
  program?: string | null;
  intake?: string | null;
  visaStatus?: string | null;
  branch?: string | null;
  counselor?: string | null;
}

export default function StudentFinancialLedger({
  clientId,
  clientName,
  institution,
  program,
  intake,
  visaStatus,
  branch,
  counselor,
}: Props) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<StudentFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchStudentFinancialSummary(clientId);
    setSummary(data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [clientId]);

  if (loading && !summary) {
    return (
      <Card className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading student financial ledger…
      </Card>
    );
  }

  const s = summary;
  const currency = s?.categories[0]?.currency ?? "INR";

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{clientName ?? "Student"}</div>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {institution && <span>Institution: {institution}</span>}
              {program && <span>Program: {program}</span>}
              {intake && <span>Intake: {intake}</span>}
              {visaStatus && <span>Visa: {visaStatus}</span>}
              {branch && <span>Branch: {branch}</span>}
              {counselor && <span>Counselor: {counselor}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} className="gap-1">
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/accounting/trust/disburse?client=${clientId}`)} className="gap-1">
              <ArrowRightLeft className="size-3.5" /> Disburse
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
          {[
            { label: "Outstanding", value: s?.outstanding ?? 0 },
            { label: "Collected", value: s?.collected ?? 0 },
            { label: "Trust held", value: s?.trustHeld ?? 0 },
            { label: "Disbursed", value: s?.disbursed ?? 0 },
            { label: "Refunded", value: s?.refunded ?? 0 },
            { label: "Recoverable", value: s?.recoverable ?? 0, hint: "R2" },
            { label: "Reimbursable", value: s?.reimbursable ?? 0, hint: "R2" },
          ].map((k) => (
            <div key={k.label} className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {k.label}
                {"hint" in k && k.hint && <Badge variant="outline" className="text-[9px] px-1 py-0">{k.hint}</Badge>}
              </div>
              <div className="text-sm font-semibold tabular-nums mt-1">{money(k.value, currency)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-medium">Service balances</h3>
        </div>
        {!s?.services.length ? (
          <p className="text-sm text-muted-foreground">No invoiced services yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Collection status</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Trust held</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.services.map((svc) => (
                <TableRow key={svc.serviceId}>
                  <TableCell>
                    <div className="font-medium">{svc.serviceName}</div>
                    {svc.serviceCode && <div className="text-xs text-muted-foreground">{svc.serviceCode}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{svc.categoryName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={collectionStatusVariant(svc.collectionStatus)} className="text-[10px]">
                      {collectionStatusLabel(svc.collectionStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(svc.invoiced, svc.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(svc.collected, svc.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(svc.outstanding, svc.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(svc.trustHeld, svc.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="size-4" />
          <h3 className="font-medium">Category breakdown</h3>
        </div>
        {!s?.categories.length ? (
          <p className="text-sm text-muted-foreground">No category activity yet. Issue an invoice with mapped services.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead>Expected payee</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Trust held</TableHead>
                <TableHead className="text-right">Disbursed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.categories.map((c) => (
                <TableRow key={c.categoryId}>
                  <TableCell>
                    <div className="font-medium">{c.categoryName}</div>
                    {c.parentName && <div className="text-xs text-muted-foreground">{c.parentName}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{TREATMENT_LABELS[c.accountingTreatment] ?? c.accountingTreatment}</TableCell>
                  <TableCell className="text-xs">{c.expectedPayeeName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(c.invoiced, c.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(c.collected, c.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(c.trustHeld, c.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(c.disbursed, c.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4 border-dashed">
        <h3 className="font-medium mb-2">Recoverables</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Corporate card and employee-on-behalf amounts will appear here when R2 is enabled.
        </p>
        <div className="rounded-md border bg-muted/10 p-3 text-sm tabular-nums">
          Open recoverable balance: {money(s?.recoverable ?? 0, currency)}
        </div>
      </Card>
    </div>
  );
}
