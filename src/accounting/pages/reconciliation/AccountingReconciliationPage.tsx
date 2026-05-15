import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, XCircle,
  Download, Search, RotateCcw, Inbox,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import { formatCurrency } from "../../lib/format";
import { SEED_BANK_ACCOUNTS } from "../../data/mockBankAccounts";
import { MOCK_JOURNALS } from "../../data/mockJournals";
import {
  MOCK_PAST_SESSIONS, type BankStatementLine, type ReconciliationMatch,
} from "../../data/mockReconciliation";
import {
  parseCSVStatement, matchStatementToJournals, calculateReconciliationSummary,
} from "../../lib/reconciliationEngine";

type View = "landing" | "active" | "complete";
type Tab = "all" | "auto" | "review" | "unmatched" | "confirmed";

const SAMPLE_CSV = `Date,Description,Reference,Debit,Credit,Balance
2024-10-01,WEWORK TORONTO OCT RENT,WW-OCT-2024,8500,0,236500
2024-10-03,CLIENT PAYMENT INV2024012,,0,18500,255000
2024-10-05,MICROSOFT AZURE,MSFT-INV-OCT24,1240,0,253760
`;

function downloadBlob(content: string, name: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function previousMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(first), to: fmt(last) };
}

export default function AccountingReconciliationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("landing");

  // Landing state
  const eligibleAccounts = useMemo(
    () => SEED_BANK_ACCOUNTS.filter(a => a.reconciliationEnabled),
    []
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const initRange = previousMonthRange();
  const [dateFrom, setDateFrom] = useState(initRange.from);
  const [dateTo, setDateTo] = useState(initRange.to);
  const [openingBal, setOpeningBal] = useState<string>("0");
  const [parsedLines, setParsedLines] = useState<BankStatementLine[]>([]);
  const [parsedFileName, setParsedFileName] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [matching, setMatching] = useState(false);

  // Active session state
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [tab, setTab] = useState<Tab>("review");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [exceptionTarget, setExceptionTarget] = useState<string | null>(null);
  const [exceptionNote, setExceptionNote] = useState("");
  const [manualTarget, setManualTarget] = useState<string | null>(null);
  const [manualSearch, setManualSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const selectedAccount = useMemo(
    () => eligibleAccounts.find(a => a.id === selectedAccountId),
    [eligibleAccounts, selectedAccountId]
  );
  const currency = (selectedAccount?.currency ?? "CAD") as "CAD" | "USD" | "INR";

  const linesByStatementId = useMemo(() => {
    const m = new Map<string, BankStatementLine>();
    parsedLines.forEach(l => m.set(l.id, l));
    return m;
  }, [parsedLines]);

  const summary = useMemo(() => calculateReconciliationSummary(matches), [matches]);

  const filteredMatches = useMemo(() => {
    if (tab === "all") return matches;
    if (tab === "auto") return matches.filter(m => m.status === "AUTO_MATCHED");
    if (tab === "review") return matches.filter(m => m.status === "NEEDS_REVIEW");
    if (tab === "unmatched") return matches.filter(m => m.status === "UNMATCHED" || m.status === "EXCEPTION");
    return matches.filter(m => m.status === "CONFIRMED");
  }, [matches, tab]);

  // ========= Handlers =========

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const text = String(e.target?.result ?? "");
      const lines = parseCSVStatement(text, currency);
      if (!lines.length) {
        toast.error("Could not parse the CSV — check the format.");
        return;
      }
      setParsedLines(lines);
      setParsedFileName(file.name);
      toast.success(`Parsed ${lines.length} transactions from ${file.name}`);
    };
    reader.readAsText(file);
  }

  function startReconciliation() {
    if (!selectedAccount || !parsedLines.length) return;
    setMatching(true);
    setTimeout(() => {
      const m = matchStatementToJournals(parsedLines, MOCK_JOURNALS);
      setMatches(m);
      setMatching(false);
      setView("active");
      setTab("review");
      setFocusedIdx(0);
      toast.success("Matching complete");
    }, 300);
  }

  function updateMatch(statementLineId: string, patch: Partial<ReconciliationMatch>) {
    setMatches(prev => prev.map(m => m.statementLineId === statementLineId ? { ...m, ...patch } : m));
  }

  function confirmMatch(id: string) {
    updateMatch(id, { status: "CONFIRMED" });
    toast.success("Match confirmed");
  }
  function unmatch(id: string) {
    updateMatch(id, {
      status: "UNMATCHED",
      matchType: "UNMATCHED",
      journalLineId: undefined,
      journalEntryNumber: undefined,
      confidence: 0,
      matchReasons: [],
    });
    toast("Unmatched");
  }
  function markException(id: string, note: string) {
    updateMatch(id, { status: "EXCEPTION", reviewNote: note });
    toast.success("Marked as exception");
  }
  function applyManualMatch(statementLineId: string, journal: typeof MOCK_JOURNALS[number]) {
    updateMatch(statementLineId, {
      journalLineId: journal.id,
      journalEntryNumber: journal.entryNumber,
      matchType: "MANUAL",
      confidence: 100,
      matchReasons: ["Manual match by user"],
      status: "NEEDS_REVIEW",
    });
    setManualTarget(null);
    setManualSearch("");
    toast.success(`Linked to ${journal.entryNumber}`);
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (view !== "active") return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const list = filteredMatches;
      if (!list.length) return;
      const m = list[Math.min(focusedIdx, list.length - 1)];
      if (!m) return;
      if (e.key === "c" || e.key === "C") {
        if (m.status === "AUTO_MATCHED" || m.status === "NEEDS_REVIEW") confirmMatch(m.statementLineId);
      } else if (e.key === "u" || e.key === "U") {
        if (m.journalEntryNumber) unmatch(m.statementLineId);
      } else if (e.key === "e" || e.key === "E") {
        setExceptionTarget(m.statementLineId);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filteredMatches, focusedIdx]);

  function completeReconciliation() {
    setView("complete");
  }

  function resetAll() {
    setView("landing");
    setSelectedAccountId("");
    setParsedLines([]);
    setParsedFileName("");
    setMatches([]);
    setOpeningBal("0");
    setTab("review");
  }

  function downloadReport() {
    const header = "StatementLineId,Date,Description,Debit,Credit,Status,JournalEntry,Confidence,Reasons,Note\n";
    const rows = matches.map(m => {
      const l = linesByStatementId.get(m.statementLineId);
      return [
        m.statementLineId,
        l?.date ?? "",
        `"${(l?.description ?? "").replace(/"/g, "'")}"`,
        l?.debit ?? 0,
        l?.credit ?? 0,
        m.status,
        m.journalEntryNumber ?? "",
        m.confidence,
        `"${m.matchReasons.join(" · ")}"`,
        `"${m.reviewNote ?? ""}"`,
      ].join(",");
    }).join("\n");
    downloadBlob(header + rows, `reconciliation-${selectedAccount?.nickname ?? "report"}.csv`);
    toast.success("Report downloaded");
  }

  // ========= Render =========

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <AccountingPageHeader
          title="Bank reconciliation"
          subtitle="Accounting · Future Link Flow"
        />

        {view === "landing" && (
          <LandingView
            eligibleAccounts={eligibleAccounts}
            selectedAccountId={selectedAccountId}
            setSelectedAccountId={setSelectedAccountId}
            dateFrom={dateFrom} setDateFrom={setDateFrom}
            dateTo={dateTo} setDateTo={setDateTo}
            openingBal={openingBal} setOpeningBal={setOpeningBal}
            currency={currency}
            parsedLines={parsedLines}
            parsedFileName={parsedFileName}
            fileRef={fileRef}
            handleFile={handleFile}
            startReconciliation={startReconciliation}
            matching={matching}
          />
        )}

        {view === "active" && selectedAccount && (
          <ActiveView
            bankName={selectedAccount.nickname}
            period={`${dateFrom} → ${dateTo}`}
            currency={currency}
            matches={matches}
            filteredMatches={filteredMatches}
            tab={tab} setTab={setTab}
            summary={summary}
            linesByStatementId={linesByStatementId}
            focusedIdx={focusedIdx} setFocusedIdx={setFocusedIdx}
            confirmMatch={confirmMatch}
            unmatch={unmatch}
            setExceptionTarget={setExceptionTarget}
            setManualTarget={setManualTarget}
            navigateNew={() => { toast.info("Opening journal form"); navigate("/accounting/journals/new"); }}
            onAbandon={resetAll}
            onComplete={completeReconciliation}
          />
        )}

        {view === "complete" && selectedAccount && (
          <CompleteView
            bankName={selectedAccount.nickname}
            period={`${dateFrom} → ${dateTo}`}
            currency={currency}
            opening={Number(openingBal) || 0}
            lines={parsedLines}
            matches={matches}
            linesByStatementId={linesByStatementId}
            summary={summary}
            onDownload={downloadReport}
            onRestart={resetAll}
            onViewJournals={() => navigate("/accounting/journals")}
          />
        )}

        {/* Exception dialog */}
        <AlertDialog open={!!exceptionTarget} onOpenChange={open => !open && setExceptionTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as exception</AlertDialogTitle>
              <AlertDialogDescription>
                Provide a reason. This line will be flagged for follow-up.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              value={exceptionNote}
              onChange={e => setExceptionNote(e.target.value)}
              placeholder="Reason for exception…"
              rows={3}
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setExceptionNote("")}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!exceptionNote.trim()}
                onClick={() => {
                  if (exceptionTarget) markException(exceptionTarget, exceptionNote.trim());
                  setExceptionTarget(null);
                  setExceptionNote("");
                }}
              >
                Mark exception
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Manual match sheet */}
        <Sheet open={!!manualTarget} onOpenChange={open => !open && setManualTarget(null)}>
          <SheetContent className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Find match manually</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search journal entries…"
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {MOCK_JOURNALS
                  .filter(j => {
                    const q = manualSearch.toLowerCase().trim();
                    if (!q) return true;
                    return j.entryNumber.toLowerCase().includes(q)
                      || j.narration.toLowerCase().includes(q)
                      || j.reference.toLowerCase().includes(q);
                  })
                  .map(j => {
                    const amt = j.lines.reduce((s, l) => s + l.debit, 0);
                    return (
                      <button
                        key={j.id}
                        onClick={() => manualTarget && applyManualMatch(manualTarget, j)}
                        className="w-full text-left border border-border rounded-lg p-3 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-primary">{j.entryNumber}</div>
                            <div className="text-xs text-muted-foreground truncate">{j.narration}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{j.entryDate} · {j.entity}</div>
                          </div>
                          <div className="text-sm font-semibold tabular-nums whitespace-nowrap">
                            {formatCurrency(amt, j.currency)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

/* ============== LANDING ============== */
function LandingView(props: {
  eligibleAccounts: typeof SEED_BANK_ACCOUNTS;
  selectedAccountId: string;
  setSelectedAccountId: (s: string) => void;
  dateFrom: string; setDateFrom: (s: string) => void;
  dateTo: string; setDateTo: (s: string) => void;
  openingBal: string; setOpeningBal: (s: string) => void;
  currency: "CAD" | "USD" | "INR";
  parsedLines: BankStatementLine[];
  parsedFileName: string;
  fileRef: React.MutableRefObject<HTMLInputElement | null>;
  handleFile: (f: File) => void;
  startReconciliation: () => void;
  matching: boolean;
}) {
  const {
    eligibleAccounts, selectedAccountId, setSelectedAccountId,
    dateFrom, setDateFrom, dateTo, setDateTo, openingBal, setOpeningBal,
    currency, parsedLines, parsedFileName, fileRef, handleFile,
    startReconciliation, matching,
  } = props;

  const canStart = !!selectedAccountId && parsedLines.length > 0 && !matching;

  return (
    <>
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Previous reconciliations</h2>
        </div>
        {MOCK_PAST_SESSIONS.length === 0 ? (
          <AccountingEmptyState icon={Inbox} title="No past sessions" description="Reconciled statements will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium">Bank account</th>
                  <th className="text-left py-2 px-2 font-medium">Entity</th>
                  <th className="text-left py-2 px-2 font-medium">Period</th>
                  <th className="text-right py-2 px-2 font-medium">Lines</th>
                  <th className="text-right py-2 px-2 font-medium">Matched</th>
                  <th className="text-right py-2 px-2 font-medium">Unrec.</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-left py-2 px-2 font-medium">Date</th>
                  <th className="text-right py-2 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PAST_SESSIONS.map(s => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="py-2 px-2 font-medium">{s.bankAccountName}</td>
                    <td className="py-2 px-2 text-muted-foreground">{s.entity}</td>
                    <td className="py-2 px-2 text-muted-foreground">{s.statementFrom} → {s.statementTo}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{s.totalLines}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-green-600">{s.matchedLines}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-amber-600">{s.unreconciledLines}</td>
                    <td className="py-2 px-2">
                      <span className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded-full",
                        s.status === "COMPLETED" && "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
                        s.status === "IN_PROGRESS" && "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
                        s.status === "ABANDONED" && "bg-muted text-muted-foreground",
                      )}>{s.status.replace("_", " ")}</span>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{(s.completedAt ?? s.createdAt).slice(0, 10)}</td>
                    <td className="py-2 px-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => toast.info(s.status === "IN_PROGRESS" ? "Resume coming soon" : "View coming soon")}>
                        {s.status === "IN_PROGRESS" ? "Resume" : "View"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold mb-4">Start new reconciliation</h2>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-xs">Bank account</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select an account…" />
              </SelectTrigger>
              <SelectContent>
                {eligibleAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nickname} — {a.holderName} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Opening balance ({currency})</Label>
            <Input
              type="number"
              className="mt-1.5"
              value={openingBal}
              onChange={e => setOpeningBal(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" className="mt-1.5" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" className="mt-1.5" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
            parsedLines.length ? "border-green-500/50 bg-green-50/30 dark:bg-green-500/5" : "border-border bg-muted/30",
          )}
          onDragOver={e => { e.preventDefault(); }}
          onDrop={e => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
          {parsedLines.length ? (
            <>
              <div className="text-sm font-medium text-foreground">{parsedFileName}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Found {parsedLines.length} transactions
                {parsedLines[0]?.date && ` from ${parsedLines[0].date} to ${parsedLines[parsedLines.length - 1].date}`}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium">Drop your bank statement CSV here</div>
              <div className="text-xs text-muted-foreground mt-1">or click to browse</div>
            </>
          )}
          <div className="text-[11px] text-muted-foreground mt-3">
            Expected columns: Date, Description, Reference, Debit, Credit, Balance
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.currentTarget.value = "";
            }}
          />
        </div>

        <div className="flex justify-between items-center mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); downloadBlob(SAMPLE_CSV, "sample-statement.csv"); }}
          >
            <Download className="size-3.5 mr-1.5" /> Download sample CSV
          </Button>
        </div>

        {parsedLines.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Preview</div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-left py-2 px-3 font-medium">Description</th>
                    <th className="text-right py-2 px-3 font-medium">Debit</th>
                    <th className="text-right py-2 px-3 font-medium">Credit</th>
                    <th className="text-right py-2 px-3 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedLines.slice(0, 3).map(l => (
                    <tr key={l.id} className="border-t border-border/50">
                      <td className="py-2 px-3 text-muted-foreground">{l.date}</td>
                      <td className="py-2 px-3 truncate max-w-md">{l.description}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-destructive">{l.debit ? formatCurrency(l.debit, currency) : "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-green-600">{l.credit ? formatCurrency(l.credit, currency) : "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(l.balance, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Button
          className="w-full mt-5"
          disabled={!canStart}
          onClick={startReconciliation}
        >
          {matching ? `Matching ${parsedLines.length} transactions…` : "Start reconciliation"}
        </Button>
      </Card>
    </>
  );
}

/* ============== ACTIVE ============== */
function ActiveView(props: {
  bankName: string; period: string; currency: "CAD" | "USD" | "INR";
  matches: ReconciliationMatch[];
  filteredMatches: ReconciliationMatch[];
  tab: Tab; setTab: (t: Tab) => void;
  summary: ReturnType<typeof calculateReconciliationSummary>;
  linesByStatementId: Map<string, BankStatementLine>;
  focusedIdx: number; setFocusedIdx: (n: number) => void;
  confirmMatch: (id: string) => void;
  unmatch: (id: string) => void;
  setExceptionTarget: (id: string | null) => void;
  setManualTarget: (id: string | null) => void;
  navigateNew: () => void;
  onAbandon: () => void;
  onComplete: () => void;
}) {
  const {
    bankName, period, currency, matches, filteredMatches, tab, setTab,
    summary, linesByStatementId, focusedIdx, setFocusedIdx,
    confirmMatch, unmatch, setExceptionTarget, setManualTarget,
    navigateNew, onAbandon, onComplete,
  } = props;

  const completable = summary.unmatched === 0 && summary.needsReview === 0;
  const progress = summary.total === 0 ? 0 : (summary.confirmedCount / summary.total) * 100;

  return (
    <>
      <Card className="sticky top-2 z-20 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{bankName}</div>
            <div className="text-xs text-muted-foreground">{period}</div>
          </div>
          <div className="min-w-[200px] flex-1">
            <div className="text-xs text-muted-foreground mb-1">
              {summary.confirmedCount} of {summary.total} confirmed
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">✓ {summary.autoMatched} auto</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">⚠ {summary.needsReview} review</span>
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">✗ {summary.unmatched} unmatched</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">Abandon</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Abandon this reconciliation?</AlertDialogTitle>
                  <AlertDialogDescription>All progress will be lost.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep working</AlertDialogCancel>
                  <AlertDialogAction onClick={onAbandon}>Abandon</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={!completable}>Complete reconciliation</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Complete reconciliation?</AlertDialogTitle>
                  <AlertDialogDescription>This will close the session and generate a summary.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onComplete}>Complete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={v => { setTab(v as Tab); setFocusedIdx(0); }}>
        <TabsList>
          <TabsTrigger value="all">All ({matches.length})</TabsTrigger>
          <TabsTrigger value="auto">Auto-matched ({summary.autoMatched})</TabsTrigger>
          <TabsTrigger value="review">Needs review ({summary.needsReview})</TabsTrigger>
          <TabsTrigger value="unmatched">Unmatched ({summary.unmatched})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({summary.confirmedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      <p className="text-[11px] text-muted-foreground mt-2 mb-4">
        Tip: Press <kbd className="px-1 py-0.5 border rounded">C</kbd> to confirm,{" "}
        <kbd className="px-1 py-0.5 border rounded">U</kbd> to unmatch,{" "}
        <kbd className="px-1 py-0.5 border rounded">E</kbd> to mark exception on the focused card.
      </p>

      {filteredMatches.length === 0 ? (
        <Card className="py-12">
          <AccountingEmptyState
            icon={CheckCircle2}
            title="Nothing here"
            description="No statement lines in this filter."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((m, idx) => {
            const line = linesByStatementId.get(m.statementLineId);
            if (!line) return null;
            const journal = m.journalEntryNumber
              ? MOCK_JOURNALS.find(j => j.entryNumber === m.journalEntryNumber)
              : undefined;
            const focused = idx === focusedIdx;
            return (
              <Card
                key={m.statementLineId}
                onClick={() => setFocusedIdx(idx)}
                className={cn(
                  "p-4 transition-shadow cursor-pointer",
                  focused && "ring-2 ring-primary/40",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{line.date}</div>
                    <div className="text-sm font-medium truncate">{line.description}</div>
                    {line.reference && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">Ref: {line.reference}</div>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className={cn(
                      "text-base font-semibold tabular-nums",
                      line.debit ? "text-destructive" : "text-green-600",
                    )}>
                      {line.debit ? `− ${formatCurrency(line.debit, currency)}` : `+ ${formatCurrency(line.credit, currency)}`}
                    </div>
                    <StatusPill status={m.status} />
                  </div>
                </div>

                {(m.status === "AUTO_MATCHED" || m.status === "NEEDS_REVIEW") && journal && (
                  <div className="mt-3 bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">
                          <span className="text-primary font-medium">{journal.entryNumber}</span>
                          <span className="text-muted-foreground ml-2">{journal.entryDate}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{journal.narration}</div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">
                        {formatCurrency(journal.lines.reduce((s, l) => s + l.debit, 0), journal.currency)}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded bg-muted flex-1 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded",
                              m.confidence >= 85 ? "bg-green-500" : m.confidence >= 60 ? "bg-amber-500" : "bg-red-500",
                            )}
                            style={{ width: `${m.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{m.confidence}%</span>
                      </div>
                      {m.matchReasons.length > 0 && (
                        <div className="text-[11px] text-muted-foreground mt-1.5">
                          {m.matchReasons.join(" · ")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => confirmMatch(m.statementLineId)}>
                        Confirm ✓
                      </Button>
                      {m.status === "NEEDS_REVIEW" && (
                        <Button size="sm" variant="outline" onClick={() => setManualTarget(m.statementLineId)}>
                          Find different match
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => unmatch(m.statementLineId)}>
                        Unmatch
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExceptionTarget(m.statementLineId)}>
                        Mark as exception
                      </Button>
                    </div>
                  </div>
                )}

                {m.status === "UNMATCHED" && (
                  <div className="mt-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg p-3">
                    <div className="text-sm">No matching journal entry found</div>
                    <div className="text-xs text-muted-foreground">This line needs manual action.</div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={navigateNew}>
                        Create journal entry
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setManualTarget(m.statementLineId)}>
                        Find match manually
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExceptionTarget(m.statementLineId)}>
                        Mark as exception
                      </Button>
                    </div>
                  </div>
                )}

                {m.status === "EXCEPTION" && (
                  <div className="mt-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="size-4 text-amber-600" />
                      <span className="font-medium">Exception</span>
                    </div>
                    {m.reviewNote && <div className="text-xs text-muted-foreground mt-1">{m.reviewNote}</div>}
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => unmatch(m.statementLineId)}>
                      <RotateCcw className="size-3.5 mr-1.5" /> Reset
                    </Button>
                  </div>
                )}

                {m.status === "CONFIRMED" && (
                  <div className="mt-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="size-4 text-green-600" />
                        <span className="font-medium">Confirmed</span>
                        {m.journalEntryNumber && (
                          <span className="text-muted-foreground ml-2">→ {m.journalEntryNumber}</span>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => unmatch(m.statementLineId)}>Undo</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function StatusPill({ status }: { status: ReconciliationMatch["status"] }) {
  const map: Record<ReconciliationMatch["status"], { cls: string; label: string }> = {
    AUTO_MATCHED: { cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400", label: "Auto-matched" },
    NEEDS_REVIEW: { cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", label: "Needs review" },
    CONFIRMED: { cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", label: "Confirmed" },
    UNMATCHED: { cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", label: "Unmatched" },
    EXCEPTION: { cls: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400", label: "Exception" },
  };
  const m = map[status];
  return <span className={cn("inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full", m.cls)}>{m.label}</span>;
}

/* ============== COMPLETE ============== */
function CompleteView(props: {
  bankName: string; period: string; currency: "CAD" | "USD" | "INR";
  opening: number;
  lines: BankStatementLine[];
  matches: ReconciliationMatch[];
  linesByStatementId: Map<string, BankStatementLine>;
  summary: ReturnType<typeof calculateReconciliationSummary>;
  onDownload: () => void;
  onRestart: () => void;
  onViewJournals: () => void;
}) {
  const { bankName, period, currency, opening, lines, matches, linesByStatementId, summary, onDownload, onRestart, onViewJournals } = props;

  const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
  const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
  const calculated = opening + totalCredits - totalDebits;
  const statementClosing = lines.length ? lines[lines.length - 1].balance : 0;
  const diff = calculated - statementClosing;

  const exceptions = matches.filter(m => m.status === "EXCEPTION");
  const exceptionsCount = exceptions.length;

  const rateColor =
    summary.reconciliationRate >= 95 ? "text-green-600"
    : summary.reconciliationRate >= 80 ? "text-amber-600"
    : "text-red-600";

  return (
    <>
      <div className="text-center py-8">
        <CheckCircle2 className="size-12 text-green-600 mx-auto mb-3" />
        <h2 className="text-xl font-semibold">Reconciliation complete!</h2>
        <p className="text-sm text-muted-foreground mt-1">{bankName} · {period}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AccountingKPICard label="Total lines" value={String(summary.total)} icon={FileText} />
        <AccountingKPICard label="Confirmed" value={String(summary.confirmedCount)} icon={CheckCircle2} />
        <AccountingKPICard label="Exceptions" value={String(exceptionsCount)} icon={AlertTriangle} />
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Reconciliation rate</div>
          <div className={cn("text-2xl font-bold mt-2 tabular-nums", rateColor)}>{summary.reconciliationRate}%</div>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="text-base font-semibold mb-4">Balance reconciliation</h3>
        <div className="space-y-2 text-sm">
          <Row label="Opening balance (from statement)" value={formatCurrency(opening, currency)} />
          <Row label="+ Total credits" value={formatCurrency(totalCredits, currency)} valueClass="text-green-600" />
          <Row label="− Total debits" value={formatCurrency(totalDebits, currency)} valueClass="text-destructive" />
          <div className="border-t border-border my-2" />
          <Row label="= Calculated closing balance" value={formatCurrency(calculated, currency)} bold />
          <Row label="Statement closing balance" value={formatCurrency(statementClosing, currency)} />
          <Row label="Difference" value={formatCurrency(diff, currency)} valueClass={Math.abs(diff) < 0.01 ? "text-green-600" : "text-amber-600"} bold />
        </div>
        <div className="mt-3">
          {Math.abs(diff) < 0.01
            ? <span className="text-sm text-green-600">✓ Balances match</span>
            : <span className="text-sm text-amber-600">⚠ Difference of {formatCurrency(Math.abs(diff), currency)}</span>}
        </div>
      </Card>

      {exceptionsCount > 0 && (
        <Card className="p-5 mb-6">
          <h3 className="text-base font-semibold mb-4">Exceptions requiring follow-up</h3>
          <div className="space-y-2">
            {exceptions.map(e => {
              const l = linesByStatementId.get(e.statementLineId);
              if (!l) return null;
              return (
                <div key={e.statementLineId} className="flex items-start justify-between gap-3 border-b border-border/50 pb-2">
                  <div className="text-sm min-w-0">
                    <div className="text-muted-foreground text-xs">{l.date}</div>
                    <div className="font-medium truncate">{l.description}</div>
                    {e.reviewNote && <div className="text-xs text-muted-foreground italic">{e.reviewNote}</div>}
                  </div>
                  <div className={cn("text-sm font-semibold tabular-nums", l.debit ? "text-destructive" : "text-green-600")}>
                    {formatCurrency(l.debit || l.credit, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={onDownload}>
          <Download className="size-4 mr-2" /> Download reconciliation report
        </Button>
        <Button onClick={onRestart}>Start new reconciliation</Button>
        <Button variant="ghost" onClick={onViewJournals}>View journal entries</Button>
      </div>
    </>
  );
}

function Row({ label, value, valueClass, bold }: { label: string; value: string; valueClass?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-muted-foreground", bold && "text-foreground font-medium")}>{label}</span>
      <span className={cn("tabular-nums", bold && "font-semibold", valueClass)}>{value}</span>
    </div>
  );
}
