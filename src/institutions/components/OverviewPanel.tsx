import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useAgreements,
  useClaimCycles,
  useInvoices,
  useCommissions,
  useStudents,
  useCampaigns,
  useSuggestions,
  useRenewalCountdown,
} from "../hooks/useInstitutionData";
import { RENEWAL_THRESHOLDS_DAYS } from "../config";

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

export function OverviewPanel({ institutionId }: { institutionId: string }) {
  const { data: agreements } = useAgreements(institutionId);
  const { data: cycles } = useClaimCycles(institutionId);
  const { data: invoices } = useInvoices(institutionId);
  const { data: commissions } = useCommissions(institutionId);
  const { data: students } = useStudents(institutionId);
  const { data: campaigns } = useCampaigns(institutionId);
  const { data: suggestions } = useSuggestions(institutionId);

  const activePrograms = commissions.filter((c: any) => c.is_active).length;
  const claimsSubmitted = cycles.filter((c: any) => ["submitted", "partially_paid", "closed"].includes(c.status)).length;
  const approvedCommission = invoices.filter((i: any) => ["paid", "sent", "approved"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
  const paidCommission = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
  const renewalDue = agreements.filter((a: any) => {
    if (!a.valid_to) return false;
    const d = Math.ceil((new Date(a.valid_to).getTime() - Date.now()) / 86400000);
    return d >= 0 && d <= Math.max(...RENEWAL_THRESHOLDS_DAYS);
  }).length;
  const pendingReview = suggestions.filter((s: any) => s.status === "pending").length;
  const blockedStudents = students.filter((s: any) => ["pending_dues", "missing_consent", "withdrawn"].includes(s.status)).length;
  const activeCampaigns = campaigns.filter((c: any) => c.is_active).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Active commissions" value={activePrograms} />
        <Kpi label="Claims submitted" value={claimsSubmitted} />
        <Kpi label="Approved commission" value={`${approvedCommission.toLocaleString()} CAD`} />
        <Kpi label="Paid commission" value={`${paidCommission.toLocaleString()} CAD`} />
        <Kpi label="Renewals due" value={renewalDue} hint={`within ${Math.max(...RENEWAL_THRESHOLDS_DAYS)}d`} />
        <Kpi label="Pending review" value={pendingReview} />
        <Kpi label="Blocked students" value={blockedStudents} />
        <Kpi label="Active campaigns" value={activeCampaigns} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <RecentList title="Recent agreements" items={agreements.slice(0, 4).map((a: any) => ({ id: a.id, primary: a.title, secondary: `${a.status} · until ${a.valid_to ?? "—"}` }))} />
        <RecentList title="Recent claim cycles" items={cycles.slice(0, 4).map((c: any) => ({ id: c.id, primary: c.period_label, secondary: `${c.status} · ${Number(c.total_expected).toLocaleString()} ${c.currency}` }))} />
        <RecentList title="Recent invoices" items={invoices.slice(0, 4).map((i: any) => ({ id: i.id, primary: i.invoice_no ?? "(no #)", secondary: `${i.status} · ${Number(i.amount).toLocaleString()} ${i.currency}` }))} />
        <UpcomingDeadlines agreements={agreements} cycles={cycles} />
      </div>

      <AiHighlights suggestions={suggestions} />
    </div>
  );
}

function RecentList({ title, items }: { title: string; items: { id: string; primary: string; secondary: string }[] }) {
  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nothing yet.</div>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.id} className="text-sm flex items-center justify-between gap-2">
              <span className="truncate">{it.primary}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{it.secondary}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function UpcomingDeadlines({ agreements, cycles }: { agreements: any[]; cycles: any[] }) {
  const items = [
    ...agreements
      .filter((a) => a.valid_to)
      .map((a) => ({ id: `a-${a.id}`, when: a.valid_to as string, label: `Agreement expires — ${a.title}` })),
    ...cycles
      .filter((c) => c.claim_due_date)
      .map((c) => ({ id: `c-${c.id}`, when: c.claim_due_date as string, label: `Claim due — ${c.period_label}` })),
  ]
    .sort((a, b) => a.when.localeCompare(b.when))
    .slice(0, 5);
  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-2">Upcoming deadlines</div>
      {items.length === 0 ? <div className="text-xs text-muted-foreground">None.</div> : (
        <ul className="space-y-1 text-sm">
          {items.map((it) => <DeadlineRow key={it.id} when={it.when} label={it.label} />)}
        </ul>
      )}
    </Card>
  );
}

function DeadlineRow({ when, label }: { when: string; label: string }) {
  const days = useRenewalCountdown(when);
  const tone = days != null && days < 30 ? "destructive" : "secondary";
  return (
    <li className="flex items-center justify-between">
      <span className="truncate">{label}</span>
      <Badge variant={tone as any}>{days != null ? (days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`) : "—"}</Badge>
    </li>
  );
}

function AiHighlights({ suggestions }: { suggestions: any[] }) {
  const items = suggestions.filter((s) => s.status === "pending").slice(0, 3);
  if (items.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-2">AI highlights</div>
      <ul className="space-y-2">
        {items.map((s: any) => (
          <li key={s.id} className="flex items-start gap-2 text-sm">
            <Badge variant={s.severity === "critical" ? "destructive" : s.severity === "warning" ? "default" : "secondary"}>{s.severity ?? "info"}</Badge>
            <div className="flex-1">
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}