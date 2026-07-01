import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClaimSummary } from "../../lib/claimBusinessView";

const fmt = (n: number, ccy = "CAD") =>
  `${ccy} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

type Props = {
  institutionName: string;
  periodLabel: string;
  cycleStatus?: string | null;
  submissionMethod: string;
  submissionTemplate: string;
  billingProfileName?: string | null;
  claimDueDate?: string | null;
  validated: boolean;
  validatedAt?: string | null;
  summary: ClaimSummary;
};

export function ClaimSummaryDashboard({
  institutionName,
  periodLabel,
  cycleStatus,
  submissionMethod,
  submissionTemplate,
  billingProfileName,
  claimDueDate,
  validated,
  validatedAt,
  summary,
}: Props) {
  return (
    <Card className="p-4 space-y-4 bg-muted/30 border-primary/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Claim summary — can I submit today?
          </div>
          <div className="text-lg font-semibold mt-0.5">
            {institutionName} · {periodLabel}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {cycleStatus && <Badge variant="secondary">{cycleStatus}</Badge>}
            {validated ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">Validated</Badge>
            ) : (
              <Badge variant="outline" className="border-amber-400 text-amber-800">Not validated</Badge>
            )}
            {summary.canSubmitToday ? (
              <Badge className="bg-green-600">Ready to submit</Badge>
            ) : (
              <Badge variant="destructive">Submission blocked</Badge>
            )}
          </div>
        </div>
        {claimDueDate && (
          <div className="text-right text-sm">
            <div className="text-muted-foreground text-xs">Submission due</div>
            <div className="font-medium">{new Date(claimDueDate).toLocaleDateString()}</div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Metric label="Students" value={String(summary.studentsIncluded)} sub={`${summary.studentsReady} ready · ${summary.studentsPending} pending`} />
        <Metric label="Blocked / hold" value={`${summary.studentsBlocked} / ${summary.studentsOnHold}`} />
        <Metric label="Expected" value={fmt(summary.expectedCommission)} />
        <Metric label="Inst. approved" value={fmt(summary.institutionApproved)} />
        <Metric label="Received" value={fmt(summary.received)} valueClass="text-green-700" />
        <Metric label="Outstanding" value={fmt(summary.outstanding)} valueClass="text-amber-700" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs text-muted-foreground">
        <div><span className="font-medium text-foreground">Submission:</span> {submissionMethod}</div>
        <div><span className="font-medium text-foreground">Template:</span> {submissionTemplate}</div>
        <div><span className="font-medium text-foreground">Billing:</span> {billingProfileName ?? "Default profile"}</div>
        <div><span className="font-medium text-foreground">Last validation:</span> {validatedAt ? new Date(validatedAt).toLocaleString() : "—"}</div>
      </div>

      {summary.blockers.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <div className="font-medium mb-1">What is preventing submission?</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {summary.blockers.slice(0, 6).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Metric({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${valueClass ?? ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
