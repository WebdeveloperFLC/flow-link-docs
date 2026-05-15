import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, UploadCloud, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { MOCK_FINANCIAL_ACCOUNTS, formatMaskedAccount } from "../../data/mockOwners";
import {
  MOCK_BANK_STATEMENT, MOCK_SYSTEM_ENTRIES, buildInitialMatches,
} from "../../data/mockReconciliation";
import type { BankStatementLine, MatchStatus, ReconMatch, SystemEntry } from "../../types/reconciliation";
import { formatCurrency } from "../../lib/format";

type Step = 1 | 2 | 3;

const STATUS_PILL: Record<MatchStatus, string> = {
  AUTO_MATCHED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  CONFIRMED:    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  REVIEW_NEEDED:"bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  UNMATCHED:    "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  EXCEPTION:    "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

const STATUS_LABEL: Record<MatchStatus, string> = {
  AUTO_MATCHED: "Auto-matched",
  CONFIRMED: "Confirmed",
  REVIEW_NEEDED: "Review needed",
  UNMATCHED: "Unmatched",
  EXCEPTION: "Exception",
};

function StepHeader({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Upload statement" },
    { n: 2, label: "Review matches" },
    { n: 3, label: "Summary" },
  ];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "size-7 rounded-full flex items-center justify-center text-xs font-semibold",
              s.n <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}>{s.n}</div>
            <div className={cn("text-sm font-medium", s.n === step ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>
    </Card>
  );
}

function UploadStep({ accountId, setAccountId, onStart }: {
  accountId: string; setAccountId: (id: string) => void; onStart: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const accounts = MOCK_FINANCIAL_ACCOUNTS.filter(a =>
    ["CORPORATE","CURRENT","PAYROLL","SAVINGS"].includes(a.accountType));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Step 1</div>
          <div className="text-lg font-semibold mt-1">Select account</div>
          <div className="text-sm text-muted-foreground">Choose the bank account to reconcile.</div>
        </div>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger>
          <SelectContent>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.nickname} · {a.currency} {formatMaskedAccount(a.accountNumber)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {file && (
          <Card className="p-3 bg-muted/40 border-dashed">
            <div className="text-xs text-muted-foreground">Detected period</div>
            <div className="text-sm font-medium">{MOCK_BANK_STATEMENT.startDate} → {MOCK_BANK_STATEMENT.endDate}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {MOCK_BANK_STATEMENT.lines.length} transactions · Closing {formatCurrency(MOCK_BANK_STATEMENT.closingBalance, "CAD")}
            </div>
          </Card>
        )}

        <Button disabled={!accountId || !file} onClick={onStart} className="w-full">
          Start reconciliation <ArrowRight className="size-4" />
        </Button>
      </Card>

      <Card
        className={cn(
          "p-8 border-2 border-dashed flex flex-col items-center justify-center text-center min-h-[280px] transition-colors",
          drag ? "border-primary bg-accent/40" : "border-border",
        )}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <UploadCloud className="size-10 text-muted-foreground" />
        <div className="font-medium mt-3">Drop bank statement here</div>
        <div className="text-sm text-muted-foreground mt-1">Supports CSV or PDF · max 20MB</div>
        <label className="mt-4 inline-flex">
          <input type="file" accept=".csv,.pdf" hidden onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
          <Button variant="outline" asChild><span>Choose file</span></Button>
        </label>
        {file && <div className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <FileText className="size-3.5" />{file.name}
        </div>}
      </Card>
    </div>
  );
}

function ReviewStep({
  accountId, matches, setMatches, onBack, onContinue,
}: {
  accountId: string;
  matches: ReconMatch[];
  setMatches: (m: ReconMatch[]) => void;
  onBack: () => void; onContinue: () => void;
}) {
  const account = MOCK_FINANCIAL_ACCOUNTS.find(a => a.id === accountId);
  const currency = (account?.currency ?? "CAD") as "CAD" | "USD" | "INR";

  const update = (id: string, patch: Partial<ReconMatch>) => {
    setMatches(matches.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const rowAction = (m: ReconMatch, action: string) => {
    switch (action) {
      case "confirm":
        update(m.id, { status: "CONFIRMED" });
        toast.success("Match confirmed");
        break;
      case "unmatch":
        update(m.id, { status: "UNMATCHED", systemEntryId: null, confidence: 0, reasons: [] });
        toast("Match removed");
        break;
      case "match": {
        // Auto-find next unused system entry roughly matching by amount
        const bank = MOCK_BANK_STATEMENT.lines.find(b => b.id === m.bankLineId)!;
        const used = new Set(matches.filter(x => x.id !== m.id).map(x => x.systemEntryId));
        const candidate = MOCK_SYSTEM_ENTRIES.find(s => !used.has(s.id) && Math.abs(s.amount - bank.amount) < 0.5)
          ?? MOCK_SYSTEM_ENTRIES.find(s => !used.has(s.id));
        if (candidate) {
          update(m.id, { status: "CONFIRMED", systemEntryId: candidate.id, confidence: 100, reasons: ["Manual match"] });
          toast.success(`Matched to ${candidate.entryNumber}`);
        }
        break;
      }
      case "create":
        update(m.id, { status: "CONFIRMED", systemEntryId: "new", confidence: 100, reasons: ["Created journal entry"] });
        toast.success("Journal entry created and matched");
        break;
      case "exception":
        update(m.id, { status: "EXCEPTION" });
        toast("Marked as exception");
        break;
      case "find":
        toast("Search panel — TODO");
        break;
    }
  };

  const counts = useMemo(() => {
    const c = { auto: 0, review: 0, unmatched: 0, exception: 0, confirmed: 0 };
    matches.forEach(m => {
      if (m.status === "AUTO_MATCHED") c.auto++;
      else if (m.status === "REVIEW_NEEDED") c.review++;
      else if (m.status === "UNMATCHED") c.unmatched++;
      else if (m.status === "EXCEPTION") c.exception++;
      else if (m.status === "CONFIRMED") c.confirmed++;
    });
    return c;
  }, [matches]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI label="Auto-matched" value={counts.auto} cls="text-green-600 dark:text-green-400" />
        <KPI label="Confirmed" value={counts.confirmed} cls="text-green-600 dark:text-green-400" />
        <KPI label="Review needed" value={counts.review} cls="text-amber-600 dark:text-amber-400" />
        <KPI label="Exceptions" value={counts.exception} cls="text-purple-600 dark:text-purple-400" />
        <KPI label="Unmatched" value={counts.unmatched} cls="text-red-500 dark:text-red-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SidePanel title="Bank statement" subtitle={`${MOCK_BANK_STATEMENT.startDate} → ${MOCK_BANK_STATEMENT.endDate}`}>
          {MOCK_BANK_STATEMENT.lines.map(l => (
            <BankRow key={l.id} line={l} currency={currency} />
          ))}
        </SidePanel>
        <SidePanel title="System journal entries" subtitle={`${MOCK_SYSTEM_ENTRIES.length} entries for selected account`}>
          {MOCK_SYSTEM_ENTRIES.map(s => (
            <SystemRow key={s.id} entry={s} currency={currency} />
          ))}
        </SidePanel>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold">Matching results</div>
          <div className="text-xs text-muted-foreground">{matches.length} bank lines</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Bank date</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className="px-3 py-2 font-semibold text-right">Bank amount</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Confidence</th>
                <th className="px-3 py-2 font-semibold">Matched journal</th>
                <th className="px-3 py-2 font-semibold">Reasons</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map(m => {
                const bank = MOCK_BANK_STATEMENT.lines.find(b => b.id === m.bankLineId)!;
                const sys = m.systemEntryId === "new"
                  ? { entryNumber: "(new entry)", description: "Created from bank line" }
                  : MOCK_SYSTEM_ENTRIES.find(s => s.id === m.systemEntryId);
                return (
                  <tr key={m.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-3 py-2 tabular-nums">{bank.date}</td>
                    <td className="px-3 py-2 max-w-[260px] truncate">{bank.description}</td>
                    <td className={cn("px-3 py-2 text-right tabular-nums font-medium",
                      bank.amount < 0 ? "text-red-500" : "text-green-600 dark:text-green-400")}>
                      {formatCurrency(bank.amount, currency)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", STATUS_PILL[m.status])}>
                        {STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-xs text-muted-foreground">
                      {m.confidence > 0 ? `${m.confidence}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {sys ? <span className="font-medium">{(sys as SystemEntry).entryNumber}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {m.reasons.map(r => (
                          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <RowActions match={m} onAction={(a) => rowAction(m, a)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="size-4" /> Back</Button>
        <Button onClick={onContinue}>Continue to summary <ArrowRight className="size-4" /></Button>
      </div>
    </div>
  );
}

function RowActions({ match, onAction }: { match: ReconMatch; onAction: (a: string) => void }) {
  if (match.status === "AUTO_MATCHED" || match.status === "CONFIRMED") {
    return (
      <div className="inline-flex gap-1">
        {match.status !== "CONFIRMED" && <Button size="sm" variant="outline" onClick={() => onAction("confirm")}>Confirm</Button>}
        <Button size="sm" variant="ghost" onClick={() => onAction("unmatch")}>Unmatch</Button>
      </div>
    );
  }
  if (match.status === "REVIEW_NEEDED") {
    return (
      <div className="inline-flex gap-1">
        <Button size="sm" variant="outline" onClick={() => onAction("match")}>Match</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction("create")}>Create</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction("exception")}>Exception</Button>
      </div>
    );
  }
  if (match.status === "EXCEPTION") {
    return <Button size="sm" variant="ghost" onClick={() => onAction("unmatch")}>Reset</Button>;
  }
  return (
    <div className="inline-flex gap-1">
      <Button size="sm" variant="outline" onClick={() => onAction("find")}>Find</Button>
      <Button size="sm" variant="ghost" onClick={() => onAction("create")}>Create</Button>
      <Button size="sm" variant="ghost" onClick={() => onAction("exception")}>Exception</Button>
    </div>
  );
}

function KPI({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={cn("text-2xl font-bold tabular-nums mt-1", cls)}>{value}</div>
    </Card>
  );
}

function SidePanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{subtitle}</div>
      </div>
      <div className="max-h-[280px] overflow-y-auto divide-y divide-border">{children}</div>
    </Card>
  );
}

function BankRow({ line, currency }: { line: BankStatementLine; currency: "CAD" | "USD" | "INR" }) {
  return (
    <div className="px-4 py-2 flex items-center justify-between hover:bg-accent/30">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground tabular-nums">{line.date}</div>
        <div className="text-sm truncate">{line.description}</div>
      </div>
      <div className={cn("text-sm font-medium tabular-nums tabular-nums",
        line.amount < 0 ? "text-red-500" : "text-green-600 dark:text-green-400")}>
        {formatCurrency(line.amount, currency)}
      </div>
    </div>
  );
}

function SystemRow({ entry, currency }: { entry: SystemEntry; currency: "CAD" | "USD" | "INR" }) {
  return (
    <div className="px-4 py-2 flex items-center justify-between hover:bg-accent/30">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground tabular-nums">{entry.date} · {entry.entryNumber}</div>
        <div className="text-sm truncate">{entry.description}</div>
      </div>
      <div className={cn("text-sm font-medium tabular-nums",
        entry.amount < 0 ? "text-red-500" : "text-green-600 dark:text-green-400")}>
        {formatCurrency(entry.amount, currency)}
      </div>
    </div>
  );
}

function SummaryStep({ accountId, matches, onBack, onComplete }: {
  accountId: string; matches: ReconMatch[]; onBack: () => void; onComplete: () => void;
}) {
  const account = MOCK_FINANCIAL_ACCOUNTS.find(a => a.id === accountId);
  const currency = (account?.currency ?? "CAD") as "CAD" | "USD" | "INR";

  const stmtTotal = MOCK_BANK_STATEMENT.lines.reduce((s, l) => s + l.amount, 0);
  const sysTotal = matches.reduce((s, m) => {
    if (m.systemEntryId && m.systemEntryId !== "new") {
      const e = MOCK_SYSTEM_ENTRIES.find(x => x.id === m.systemEntryId);
      return s + (e?.amount ?? 0);
    }
    return s;
  }, 0);

  const matched = matches.filter(m => m.status === "AUTO_MATCHED" || m.status === "CONFIRMED").length;
  const review = matches.filter(m => m.status === "REVIEW_NEEDED").length;
  const exception = matches.filter(m => m.status === "EXCEPTION").length;
  const unmatched = matches.filter(m => m.status === "UNMATCHED").length;

  const variance = stmtTotal - sysTotal;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Statement total</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{formatCurrency(stmtTotal, currency)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{MOCK_BANK_STATEMENT.lines.length} bank lines</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">System total</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{formatCurrency(sysTotal, currency)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">From matched journal entries</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Variance</div>
          <div className={cn("text-2xl font-bold tabular-nums mt-1",
            Math.abs(variance) < 0.01 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
            {formatCurrency(variance, currency)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Difference statement vs system</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryStat icon={CheckCircle2} label="Matched" value={matched} tone="green" />
        <SummaryStat icon={AlertTriangle} label="Review needed" value={review} tone="amber" />
        <SummaryStat icon={AlertTriangle} label="Exceptions" value={exception} tone="purple" />
        <SummaryStat icon={XCircle} label="Unmatched" value={unmatched} tone="red" />
      </div>

      <Card className="p-5">
        <div className="text-sm font-semibold mb-2">Reconciliation status</div>
        <p className="text-sm text-muted-foreground">
          {unmatched === 0
            ? "All bank lines have been matched, created, or marked as exceptions. You can complete this reconciliation."
            : `There are ${unmatched} unmatched line(s). Resolve them before completing the reconciliation.`}
        </p>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="size-4" /> Back</Button>
        <Button disabled={unmatched > 0} onClick={onComplete}>
          Complete reconciliation <CheckCircle2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, tone }: {
  icon: typeof CheckCircle2; label: string; value: number;
  tone: "green" | "amber" | "red" | "purple";
}) {
  const toneCls = {
    green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
    red: "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10",
  }[tone];
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={cn("size-10 rounded-lg flex items-center justify-center", toneCls)}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
      </div>
    </Card>
  );
}

export default function AccountingReconciliationPage() {
  const [step, setStep] = useState<Step>(1);
  const [accountId, setAccountId] = useState<string>("fa1");
  const [matches, setMatches] = useState<ReconMatch[]>(() => buildInitialMatches());

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingPageHeader
          title="Bank reconciliation"
          subtitle="Accounting · Match bank statements to system journal entries"
        />
        <StepHeader step={step} />
        {step === 1 && (
          <UploadStep
            accountId={accountId}
            setAccountId={setAccountId}
            onStart={() => { setMatches(buildInitialMatches()); setStep(2); }}
          />
        )}
        {step === 2 && (
          <ReviewStep
            accountId={accountId}
            matches={matches}
            setMatches={setMatches}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <SummaryStep
            accountId={accountId}
            matches={matches}
            onBack={() => setStep(2)}
            onComplete={() => { toast.success("Reconciliation completed"); setStep(1); }}
          />
        )}
      </div>
    </AppLayout>
  );
}