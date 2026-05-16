import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { Upload, ChevronRight, Check, FileText, Sparkles, Loader2, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AccountingPageHeader from "@/accounting/components/shared/AccountingPageHeader";
import DynamicSelect from "@/accounting/components/shared/DynamicSelect";
import { useEntities } from "@/accounting/stores/accountingEntitiesStore";
import { useAccounts } from "@/accounting/stores/coaStore";
import { addJournal } from "@/accounting/stores/journalsStore";
import { addCardReconciliation, nextReconciliationNumber } from "@/accounting/stores/cardReconciliationStore";
import { EXPENSE_CATEGORIES } from "@/accounting/types/reimbursements";
import type { CardStatementLine } from "@/accounting/types/cardReconciliation";
import { buildLine, nextJournalNumber, asCurrency } from "@/accounting/lib/journalHelpers";
import { formatCurrency } from "@/accounting/lib/format";
import { genId } from "@/accounting/stores/_persist";
import {
  extractCardStatement,
  mapToCardStatementLines,
  autoSuggestCategory,
  type ExtractionProgress,
} from "@/accounting/lib/extractCardStatement";
import { cn } from "@/lib/utils";

const SAMPLE_CSV = "Date,Description,Amount,Reference\n2025-10-01,STAPLES OFFICE,45.99,REF001\n2025-10-03,UBER TRIP,22.50,REF002\n2025-10-05,NETFLIX,15.99,REF003\n";

function parseCSV(text: string): { date: string; description: string; amount: number }[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const di = header.findIndex((h) => h.includes("date"));
  const desci = header.findIndex((h) => h.includes("desc") || h.includes("narrat") || h.includes("merch"));
  const ai = header.findIndex((h) => h.includes("amount") || h.includes("debit") || h.includes("value"));
  return lines.slice(1).map((row) => {
    const cells = row.split(",");
    return {
      date: (cells[di] ?? "").trim(),
      description: (cells[desci] ?? "").trim(),
      amount: Math.abs(Number((cells[ai] ?? "0").replace(/[^0-9.\-]/g, ""))),
    };
  }).filter((r) => r.date && r.description && r.amount > 0);
}

function suggestAccount(desc: string, expAccts: { id: string; code: string; name: string }[]) {
  const d = desc.toLowerCase();
  const find = (kw: string[]) => expAccts.find((a) => kw.some((k) => a.name.toLowerCase().includes(k) || a.code.includes(k)));
  if (/uber|taxi|flight|hotel|trip|travel/.test(d)) return find(["travel"]) ?? null;
  if (/staples|office|paper|pen/.test(d)) return find(["office", "supply", "suppl"]) ?? null;
  if (/netflix|spotify|adobe|software|saas/.test(d)) return find(["software"]) ?? null;
  if (/google ads|facebook ads|marketing/.test(d)) return find(["marketing"]) ?? null;
  if (/restaurant|coffee|meals|dinner|lunch/.test(d)) return find(["meal"]) ?? null;
  return null;
}

const STEPS = ["Card details", "Import statement", "Categorise", "Generate journal"];

export default function AccountingCardReconciliationNewPage() {
  const navigate = useNavigate();
  const entities = useEntities();
  const accounts = useAccounts();

  const [step, setStep] = useState(0);

  // Step 1
  const [cardAccountId, setCardAccountId] = useState("");
  const [cardHolder, setCardHolder] = useState("Santosh Rakhiani");
  const [cardType, setCardType] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");
  const [entity, setEntity] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [opening, setOpening] = useState("0");
  const [closing, setClosing] = useState("0");
  const [currency, setCurrency] = useState("CAD");

  // Step 2-3
  const [lines, setLines] = useState<CardStatementLine[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aiLineIds, setAiLineIds] = useState<Set<string>>(new Set());
  const [aiSummary, setAiSummary] = useState<{ total: number; matched: number } | null>(null);

  // PDF extraction state
  const [importTab, setImportTab] = useState<"pdf" | "csv">("pdf");
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const liabAccts = accounts.filter((a) => a.groupCode === "LIABILITY" && a.status === "ACTIVE");
  const expAccts = accounts.filter((a) => ["EXPENSE", "COGS", "OTHER_EXPENSE"].includes(a.groupCode) && a.status === "ACTIVE");

  const cardAcct = accounts.find((a) => a.id === cardAccountId);
  const drawingsAcct = useMemo(() => accounts.find((a) => /drawing/i.test(a.name)) ?? accounts.find((a) => a.groupCode === "EQUITY"), [accounts]);

  const totals = useMemo(() => {
    const biz = lines.filter((l) => l.category === "BUSINESS").reduce((s, l) => s + l.amount, 0);
    const per = lines.filter((l) => l.category === "PERSONAL").reduce((s, l) => s + l.amount, 0);
    const un = lines.filter((l) => l.category === "UNCATEGORISED").length;
    return { biz, per, un, total: lines.reduce((s, l) => s + l.amount, 0) };
  }, [lines]);

  function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(String(e.target?.result ?? ""));
      if (parsed.length === 0) { toast.error("Could not parse CSV"); return; }
      setLines(parsed.map((p) => ({
        id: genId("cl"),
        date: p.date, description: p.description, amount: p.amount,
        category: "UNCATEGORISED",
        isPersonal: false,
      })));
      setAiLineIds(new Set());
      setAiSummary(null);
      toast.success(`Imported ${parsed.length} transactions`);
      setStep(2);
    };
    reader.readAsText(file);
  }

  async function handlePdfFile(file: File) {
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }
    setPdfFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
    setExtractError(null);
    setExtracting(true);
    setProgress({ stage: "reading", message: "Reading PDF pages…" });

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const last4 = (cardAcct?.name ?? "").match(/(\d{4})\s*$/)?.[1];

    try {
      const result = await extractCardStatement(
        file,
        { cardHolderName: cardHolder, cardLast4: last4, currency },
        (p) => setProgress(p),
        ctrl.signal,
      );

      if (!result.success || result.transactions.length === 0) {
        setExtractError(
          result.transactions.length === 0
            ? "No transactions found. This can happen with scanned or image-only PDFs. Try the CSV upload instead."
            : (result.errors?.[0] ?? "AI extraction failed.")
        );
        setImportTab("csv");
        return;
      }

      // Auto-fill meta
      if (result.meta.statementFrom && !fromDate) setFromDate(result.meta.statementFrom);
      if (result.meta.statementTo && !toDate) setToDate(result.meta.statementTo);
      if (typeof result.meta.openingBalance === "number") setOpening(String(result.meta.openingBalance));
      if (typeof result.meta.closingBalance === "number") setClosing(String(result.meta.closingBalance));
      if (result.meta.currency && result.meta.currency !== currency) setCurrency(result.meta.currency);

      // Map + auto-suggest
      const mapped = mapToCardStatementLines(result.transactions, currency);
      const aiIds = new Set<string>();
      let matched = 0;
      const enriched = mapped.map((l) => {
        const hint = autoSuggestCategory(l.description);
        if (hint) {
          matched++;
          aiIds.add(l.id);
          const acct = expAccts.find((a) => a.code === hint.coaAccountCode);
          return {
            ...l,
            expenseCategory: hint.expenseCategory,
            coaAccountId: acct?.id,
            coaAccountName: acct?.name,
          };
        }
        return l;
      });

      setLines(enriched);
      setAiLineIds(aiIds);
      setAiSummary({ total: enriched.length, matched });
      toast.success(`Extracted ${enriched.length} transactions from ${result.pageCount} page(s)`);
      setStep(2);
    } catch (e) {
      if ((e as Error).message === "aborted" || (e as Error).name === "AbortError") {
        toast.info("Extraction cancelled");
      } else {
        setExtractError(e instanceof Error ? e.message : "AI extraction failed.");
        setImportTab("csv");
      }
    } finally {
      setExtracting(false);
      setProgress(null);
      abortRef.current = null;
    }
  }

  function cancelExtraction() {
    abortRef.current?.abort();
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "card-statement-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function updateLine(id: string, patch: Partial<CardStatementLine>) {
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  }

  function setBulkCategory(ids: string[], cat: "BUSINESS" | "PERSONAL") {
    setLines((prev) => prev.map((l) => ids.includes(l.id) ? {
      ...l, category: cat, isPersonal: cat === "PERSONAL",
      coaAccountId: cat === "BUSINESS" && !l.coaAccountId
        ? suggestAccount(l.description, expAccts)?.id : l.coaAccountId,
    } : l));
  }

  function generateJournal(): { journalLines: any[]; balanced: boolean } {
    const bizByAcct = new Map<string, number>();
    lines.filter((l) => l.category === "BUSINESS" && l.coaAccountId).forEach((l) => {
      bizByAcct.set(l.coaAccountId!, (bizByAcct.get(l.coaAccountId!) ?? 0) + l.amount);
    });
    const journalLines: any[] = [];
    bizByAcct.forEach((amt, accId) => {
      const line = buildLine({ id: genId("jl"), accountId: accId, debit: amt, description: "Card statement business" });
      if (line) journalLines.push(line);
    });
    if (totals.per > 0 && drawingsAcct) {
      const line = buildLine({ id: genId("jl"), accountId: drawingsAcct.id, debit: totals.per, description: "Personal drawings" });
      if (line) journalLines.push(line);
    }
    const cardLine = buildLine({ id: genId("jl"), accountId: cardAccountId, credit: totals.biz + totals.per, description: "Card statement settlement" });
    if (cardLine) journalLines.push(cardLine);
    const dr = journalLines.reduce((s, l) => s + l.debit, 0);
    const cr = journalLines.reduce((s, l) => s + l.credit, 0);
    return { journalLines, balanced: new Decimal(dr).minus(cr).abs().lt(0.01) };
  }

  function postJournal() {
    const { journalLines, balanced } = generateJournal();
    if (!balanced) { toast.error("Journal does not balance"); return; }
    const monthLabel = toDate ? new Date(toDate).toLocaleString("en-CA", { month: "short", year: "numeric" }) : "Statement";
    const j = addJournal({
      entryNumber: nextJournalNumber("JE"),
      entryDate: toDate || new Date().toISOString().slice(0, 10),
      entity, currency: asCurrency(currency),
      narration: `${monthLabel} ${cardAcct?.name ?? "card"} statement — business expenses`,
      sourceType: "MANUAL" as any,
      reference: nextReconciliationNumber(monthLabel),
      status: "POSTED", createdBy: "Current user",
      postedAt: new Date().toISOString(),
      lines: journalLines,
    });
    const rec = addCardReconciliation({
      reconciliationNumber: nextReconciliationNumber(monthLabel),
      statementMonth: monthLabel,
      statementFrom: fromDate, statementTo: toDate,
      cardAccountId, cardAccountName: cardAcct?.name ?? "",
      cardHolderName: cardHolder, cardType, entity, currency,
      openingBalance: Number(opening), closingBalance: Number(closing),
      totalTransactions: lines.length,
      totalBusinessAmount: totals.biz, totalPersonalAmount: totals.per,
      totalUncategorised: totals.un,
      lines, generatedJournalId: j.id,
      status: "JOURNAL_GENERATED",
      importedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
    toast.success(`Journal posted for ${monthLabel}`);
    if (cardType === "PERSONAL" && totals.biz > 0) {
      // offer to create claim
    }
    navigate("/accounting/card-reconciliation");
    return rec;
  }

  function createReimbursementClaim() {
    postJournal();
    setTimeout(() => navigate(`/accounting/reimbursements/new?amount=${totals.biz}&description=${encodeURIComponent("Card statement business expenses")}`), 100);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <AccountingPageHeader title="Import card statement" />

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 bg-muted/30 rounded-lg p-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn("size-7 rounded-full flex items-center justify-center text-xs font-semibold",
                i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs", i === step ? "font-semibold" : "text-muted-foreground")}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight className="size-3.5 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Card details</h2>
            <div>
              <Label>Card account</Label>
              <Select value={cardAccountId} onValueChange={setCardAccountId}>
                <SelectTrigger><SelectValue placeholder="Select credit card account…" /></SelectTrigger>
                <SelectContent className="max-h-64">{liabAccts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Card holder name</Label><Input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} /></div>
              <div>
                <Label>Card type</Label>
                <RadioGroup value={cardType} onValueChange={(v) => setCardType(v as any)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2"><RadioGroupItem value="PERSONAL" id="r-p" /><Label htmlFor="r-p" className="font-normal">Personal card</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="BUSINESS" id="r-b" /><Label htmlFor="r-b" className="font-normal">Business card</Label></div>
                </RadioGroup>
              </div>
              <div>
                <Label>Entity</Label>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger><SelectValue placeholder="Select entity…" /></SelectTrigger>
                  <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Currency</Label><DynamicSelect listKey="currencies" value={currency} onValueChange={setCurrency} /></div>
              <div><Label>From date</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
              <div><Label>To date</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
              <div><Label>Opening balance</Label><Input type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} /></div>
              <div><Label>Closing balance</Label><Input type="number" step="0.01" value={closing} onChange={(e) => setClosing(e.target.value)} /></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => {
                if (!cardAccountId || !entity || !fromDate || !toDate) { toast.error("Fill required fields"); return; }
                setStep(1);
              }}>Continue →</Button>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Import statement</h2>

            <Tabs value={importTab} onValueChange={(v) => setImportTab(v as "pdf" | "csv")}>
              <TabsList className="grid grid-cols-2 w-full md:w-auto">
                <TabsTrigger value="pdf" className="gap-2"><Sparkles className="size-3.5" /> PDF statement (AI)</TabsTrigger>
                <TabsTrigger value="csv" className="gap-2"><Upload className="size-3.5" /> CSV file</TabsTrigger>
              </TabsList>

              <TabsContent value="pdf" className="mt-4 space-y-3">
                {extracting ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4 bg-muted/20">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <div className="font-medium">AI is reading your statement</div>
                    </div>
                    {pdfFileName && <div className="text-xs text-muted-foreground">{pdfFileName}</div>}
                    <div className="max-w-sm mx-auto text-left space-y-1 text-xs">
                      <ProgressLine label="Reading PDF pages" active={progress?.stage === "reading"} done={progress ? ["converting","extracting","organising","done"].includes(progress.stage) : false} />
                      <ProgressLine label="Converting pages" active={progress?.stage === "converting"} done={progress ? ["extracting","organising","done"].includes(progress.stage) : false} />
                      <ProgressLine label={progress?.stage === "extracting" ? progress.message : "Extracting transactions"} active={progress?.stage === "extracting"} done={progress ? ["organising","done"].includes(progress.stage) : false} />
                      <ProgressLine label="Organising data" active={progress?.stage === "organising"} done={progress?.stage === "done"} />
                    </div>
                    <div className="text-xs text-muted-foreground">This usually takes 10–30 seconds depending on statement length.</div>
                    <Button variant="ghost" size="sm" onClick={cancelExtraction} className="gap-1"><X className="size-3.5" /> Cancel</Button>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-muted rounded-lg p-10 text-center hover:bg-muted/30 cursor-pointer transition-colors">
                    <FileText className="size-8 mx-auto mb-3 text-primary" />
                    <div className="text-sm font-medium">Drop your PDF credit card statement here</div>
                    <div className="text-xs text-muted-foreground mt-1">or click to browse · Max 20MB · PDF only</div>
                    <div className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1"><Sparkles className="size-3" /> AI will extract all transactions automatically</div>
                    <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); }} />
                  </label>
                )}
                {extractError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 text-destructive text-xs p-3">
                    {extractError}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Works best with text-based PDF statements from Amex, Visa, Mastercard etc. Scanned images may extract less reliably.</p>
              </TabsContent>

              <TabsContent value="csv" className="mt-4 space-y-3">
                <label className="block border-2 border-dashed border-muted rounded-lg p-10 text-center hover:bg-muted/30 cursor-pointer">
                  <Upload className="size-8 mx-auto mb-3 text-muted-foreground" />
                  <div className="text-sm font-medium">Drop your credit card statement CSV here</div>
                  <div className="text-xs text-muted-foreground mt-1">Or click to browse · Max 5MB · CSV only</div>
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </label>
                <p className="text-xs text-muted-foreground">Download your statement from your bank's website as CSV. Most banks include columns for Date, Description, and Amount.</p>
                <Button variant="link" size="sm" onClick={downloadSample} className="px-0">Download sample CSV template</Button>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)} disabled={extracting}>Back</Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-4">
            {aiSummary && (
              <div className="rounded-md border border-primary/30 bg-primary/5 text-xs p-3 flex items-start gap-2">
                <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{aiSummary.total} transactions extracted by AI.</span>{" "}
                  {aiSummary.matched} auto-categorised based on merchant names. Review and adjust Business/Personal for each line.
                </div>
              </div>
            )}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm">
                Total: <strong>{lines.length}</strong> · ✓ Business: <strong className="text-green-600">{lines.filter(l=>l.category==="BUSINESS").length}</strong> · Personal: <strong>{lines.filter(l=>l.category==="PERSONAL").length}</strong> · ⚠ Uncategorised: <strong className="text-amber-600">{totals.un}</strong>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setBulkCategory(lines.filter(l=>l.category==="UNCATEGORISED").map(l=>l.id), "BUSINESS")}>Mark remaining business</Button>
                <Button variant="ghost" size="sm" onClick={() => setBulkCategory(lines.filter(l=>l.category==="UNCATEGORISED").map(l=>l.id), "PERSONAL")}>Mark remaining personal</Button>
              </div>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full" style={{ width: `${lines.length ? ((lines.length - totals.un) / lines.length) * 100 : 0}%` }} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-2"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(lines.map(l=>l.id)) : new Set())} /></th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Expense type</th>
                    <th className="text-left p-2">COA account</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const bg = l.category === "BUSINESS" ? "bg-green-50/40 dark:bg-green-500/5"
                      : l.category === "PERSONAL" ? "bg-red-50/40 dark:bg-red-500/5"
                      : "bg-amber-50/30 dark:bg-amber-500/5";
                    return (
                      <tr key={l.id} className={cn("border-b", bg)}>
                        <td className="p-2"><input type="checkbox" checked={selected.has(l.id)} onChange={(e) => {
                          const n = new Set(selected); e.target.checked ? n.add(l.id) : n.delete(l.id); setSelected(n);
                        }} /></td>
                        <td className="p-2 whitespace-nowrap">{l.date}</td>
                        <td className="p-2">{l.description}</td>
                        <td className="p-2 text-right tabular-nums">{formatCurrency(l.amount)}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {(["BUSINESS","PERSONAL","UNCATEGORISED"] as const).map((c) => (
                              <button key={c} onClick={() => updateLine(l.id, {
                                category: c, isPersonal: c === "PERSONAL",
                                coaAccountId: c === "BUSINESS" && !l.coaAccountId ? suggestAccount(l.description, expAccts)?.id : l.coaAccountId,
                              })} className={cn("text-[10px] px-1.5 py-0.5 rounded",
                                l.category === c
                                  ? (c === "BUSINESS" ? "bg-green-600 text-white" : c === "PERSONAL" ? "bg-red-600 text-white" : "bg-muted-foreground/30")
                                  : "bg-muted text-muted-foreground hover:bg-muted/70"
                              )}>{c === "UNCATEGORISED" ? "Skip" : c[0] + c.slice(1).toLowerCase()}</button>
                            ))}
                          </div>
                        </td>
                        <td className="p-2">
                          {l.category === "BUSINESS" && (
                            <Select value={l.expenseCategory ?? ""} onValueChange={(v) => updateLine(l.id, { expenseCategory: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="…" /></SelectTrigger>
                              <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="p-2">
                          {l.category === "BUSINESS" && (
                            <Select value={l.coaAccountId ?? ""} onValueChange={(v) => updateLine(l.id, { coaAccountId: v, coaAccountName: expAccts.find(a=>a.id===v)?.name })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Account…" /></SelectTrigger>
                              <SelectContent className="max-h-64">{expAccts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selected.size > 0 && (
              <div className="flex gap-2 sticky bottom-2 bg-muted/80 backdrop-blur p-2 rounded">
                <span className="text-xs">{selected.size} selected</span>
                <Button size="sm" variant="outline" onClick={() => { setBulkCategory(Array.from(selected), "BUSINESS"); setSelected(new Set()); }}>Mark business</Button>
                <Button size="sm" variant="outline" onClick={() => { setBulkCategory(Array.from(selected), "PERSONAL"); setSelected(new Set()); }}>Mark personal</Button>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Continue →</Button>
            </div>
          </Card>
        )}

        {step === 3 && (() => {
          const { journalLines, balanced } = generateJournal();
          return (
            <Card className="p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Journal entry preview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Date</div>{toDate}</div>
                <div><div className="text-xs text-muted-foreground">Entity</div>{entities.find(e=>e.id===entity)?.name ?? "—"}</div>
                <div><div className="text-xs text-muted-foreground">Currency</div>{currency}</div>
                <div><div className="text-xs text-muted-foreground">Status</div>{balanced ? <span className="text-green-600">✓ Balanced</span> : <span className="text-destructive">✗ Unbalanced</span>}</div>
              </div>
              <table className="w-full text-sm border-t border-b">
                <thead className="text-xs text-muted-foreground bg-muted/30">
                  <tr><th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Account</th><th className="text-right px-3 py-2">DR</th><th className="text-right px-3 py-2">CR</th></tr>
                </thead>
                <tbody>
                  {journalLines.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5">{i+1}</td>
                      <td className="px-3 py-1.5">{l.accountCode} — {l.accountName}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.debit ? formatCurrency(l.debit) : "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.credit ? formatCurrency(l.credit) : "—"}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td colSpan={2} className="px-3 py-1.5 text-right">Totals</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(journalLines.reduce((s,l)=>s+l.debit,0))}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(journalLines.reduce((s,l)=>s+l.credit,0))}</td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                <div>Business expenses: <strong>{formatCurrency(totals.biz)}</strong></div>
                <div>Personal (drawings): <strong>{formatCurrency(totals.per)}</strong></div>
                <div>Total card charges: <strong>{formatCurrency(totals.biz + totals.per)}</strong></div>
                {cardType === "PERSONAL" && totals.biz > 0 && (
                  <div className="pt-1 border-t mt-2">Reimbursable to card holder: <strong>{formatCurrency(totals.biz)}</strong></div>
                )}
              </div>
              <div className="flex justify-between flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back to categorise</Button>
                <div className="flex gap-2">
                  {cardType === "PERSONAL" && totals.biz > 0 && (
                    <Button variant="outline" onClick={createReimbursementClaim}>Post & create reimbursement claim</Button>
                  )}
                  <Button onClick={postJournal} disabled={!balanced}>Post journal entry</Button>
                </div>
              </div>
            </Card>
          );
        })()}
      </div>
    </AppLayout>
  );
}