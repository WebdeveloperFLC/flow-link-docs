import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { Upload, ChevronRight, Check, FileText, Sparkles, Loader2, X, Split as SplitIcon, Undo2 } from "lucide-react";
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
import { useScopedEntities } from "../../hooks/useEntityScope";
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
  parseStatementCsv,
  applyCsvMapping,
  type CsvParseResult,
  type CsvMapping,
  type ExtractionProgress,
} from "@/accounting/lib/extractCardStatement";
import { cn } from "@/lib/utils";

const SAMPLE_CSV = "Date,Description,Debit,Credit,Balance\n01/10/2025,STAPLES OFFICE,45.99,,1954.01\n03/10/2025,UBER TRIP,22.50,,1931.51\n05/10/2025,CLIENT PAYMENT,,500.00,2431.51\n";

type LineCategory = "BUSINESS" | "PERSONAL" | "INCOME" | "CLIENT_FUNDS" | "UNCATEGORISED";

type SplitLine = {
  id: string;
  amount: number; // unsigned magnitude; sign derived from parent
  category: LineCategory;
  coaAccountId?: string;
  coaAccountName?: string;
  clientRef?: string;
  expenseCategory?: string;
};

type EffectiveLine = {
  id: string;
  parentId?: string;
  date: string;
  description: string;
  amount: number; // signed
  category: LineCategory;
  coaAccountId?: string;
  coaAccountName?: string;
  clientRef?: string;
  expenseCategory?: string;
};

type AiMetaField = "fromDate" | "toDate" | "opening" | "closing" | "currency";

function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
        className,
      )}
    >
      <Sparkles className="size-2.5" /> AI
    </span>
  );
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

/** Toggle button row for the 4 categories (+ Skip). Shared between parent rows and split sub-rows. */
function CategoryToggle({
  value,
  onChange,
}: {
  value: LineCategory;
  onChange: (c: LineCategory) => void;
}) {
  const cats: LineCategory[] = ["BUSINESS", "PERSONAL", "INCOME", "CLIENT_FUNDS", "UNCATEGORISED"];
  const labels: Record<LineCategory, string> = {
    BUSINESS: "Business", PERSONAL: "Personal", INCOME: "Income",
    CLIENT_FUNDS: "Client funds", UNCATEGORISED: "Skip",
  };
  const activeCls: Record<LineCategory, string> = {
    BUSINESS: "bg-green-600 text-white border-green-600",
    PERSONAL: "bg-red-600 text-white border-red-600",
    INCOME: "bg-emerald-700 text-white border-emerald-700",
    CLIENT_FUNDS: "bg-purple-600 text-white border-purple-600",
    UNCATEGORISED: "bg-muted-foreground/30 border-muted-foreground/30",
  };
  const inactiveCls: Record<LineCategory, string> = {
    BUSINESS: "border-muted text-muted-foreground hover:bg-muted/70",
    PERSONAL: "border-muted text-muted-foreground hover:bg-muted/70",
    INCOME: "border-muted text-muted-foreground hover:bg-muted/70",
    CLIENT_FUNDS: "border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-500/10",
    UNCATEGORISED: "border-muted text-muted-foreground hover:bg-muted/70",
  };
  return (
    <div className="flex gap-1 flex-wrap">
      {cats.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border",
              active ? activeCls[c] : inactiveCls[c],
            )}
          >
            {labels[c]}
          </button>
        );
      })}
    </div>
  );
}

/** Account dropdown for a single line/split based on its category. */
function AccountPicker({
  category,
  value,
  onChange,
  expAccts,
  incomeAccts,
  clientFundsAccts,
}: {
  category: LineCategory;
  value?: string;
  onChange: (id: string, name: string | undefined) => void;
  expAccts: { id: string; code: string; name: string }[];
  incomeAccts: { id: string; code: string; name: string }[];
  clientFundsAccts: { id: string; code: string; name: string }[];
}) {
  if (category !== "BUSINESS" && category !== "INCOME" && category !== "CLIENT_FUNDS") return null;
  const list = category === "INCOME" ? incomeAccts
    : category === "CLIENT_FUNDS" ? clientFundsAccts
    : expAccts;
  const placeholder = category === "CLIENT_FUNDS" ? "Select client funds account" : "Account…";
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v, list.find(a => a.id === v)?.name)}>
      <SelectTrigger className={cn("h-7 text-xs", category === "CLIENT_FUNDS" && "border-purple-300")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {list.length === 0 && (
          <div className="p-2 text-xs text-muted-foreground">No accounts</div>
        )}
        {list.map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A single parent row + (optionally) two split sub-rows below. */
function FragmentRow(props: {
  line: CardStatementLine;
  splits: SplitLine[] | undefined;
  hasSplits: boolean;
  bg: string;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  updateLine: (id: string, patch: Partial<CardStatementLine>) => void;
  updateSplit: (parentId: string, splitId: string, patch: Partial<SplitLine>) => void;
  splitTransaction: (id: string) => void;
  unsplitTransaction: (id: string) => void;
  expAccts: { id: string; code: string; name: string }[];
  incomeAccts: { id: string; code: string; name: string }[];
  clientFundsAccts: { id: string; code: string; name: string }[];
  defaultIncomeAcct: { id: string; name: string } | undefined;
  aiLineIds: Set<string>;
}) {
  const {
    line: l, splits, hasSplits, bg, selected, setSelected,
    updateLine, updateSplit, splitTransaction, unsplitTransaction,
    expAccts, incomeAccts, clientFundsAccts, defaultIncomeAcct, aiLineIds,
  } = props;

  const cat = (l.category as LineCategory);
  const clientRef = (l as any).clientRef as string | undefined;

  const applyCategoryToParent = (c: LineCategory) => {
    const patch: any = { category: c, isPersonal: c === "PERSONAL" };
    if (c === "BUSINESS" && !l.coaAccountId) {
      const sug = suggestAccount(l.description, expAccts);
      patch.coaAccountId = sug?.id; patch.coaAccountName = sug?.name;
    } else if (c === "INCOME") {
      patch.coaAccountId = defaultIncomeAcct?.id;
      patch.coaAccountName = defaultIncomeAcct?.name;
    } else if (c === "CLIENT_FUNDS") {
      patch.coaAccountId = undefined;
      patch.coaAccountName = undefined;
    }
    updateLine(l.id, patch);
  };

  const splitSum = (splits ?? []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const original = Math.abs(l.amount);
  const splitBalanced = Math.abs(splitSum - original) < 0.005;
  const remaining = Math.round((original - splitSum) * 100) / 100;

  return (
    <>
      <tr className={cn("border-b align-top", bg)}>
        <td className="p-2">
          <input type="checkbox" checked={selected.has(l.id)} onChange={(e) => {
            const n = new Set(selected); e.target.checked ? n.add(l.id) : n.delete(l.id); setSelected(n);
          }} />
        </td>
        <td className="p-2 whitespace-nowrap">{l.date}</td>
        <td className="p-2">{l.description}</td>
        <td className={cn("p-2 text-right tabular-nums font-medium", l.amount < 0 ? "text-red-600" : "text-green-600")}>
          <div>{l.amount < 0 ? "-" : "+"}{formatCurrency(original)}</div>
          <div className="text-[9px] font-normal uppercase tracking-wide opacity-70">
            {l.amount < 0 ? "Debit (out)" : "Credit (in)"}
          </div>
        </td>
        <td className="p-2 space-y-1">
          {!hasSplits ? (
            <>
              <CategoryToggle value={cat} onChange={applyCategoryToParent} />
              {cat === "CLIENT_FUNDS" && (
                <div className="text-[10px] text-purple-600">Pass-through — will not affect P&amp;L</div>
              )}
              {cat === "BUSINESS" && (
                <div className="flex items-center gap-1 mt-1">
                  <Select value={l.expenseCategory ?? ""} onValueChange={(v) => updateLine(l.id, { expenseCategory: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Expense type…" /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {aiLineIds.has(l.id) && (
                    <span title="Suggested by AI" className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary font-semibold">AI</span>
                  )}
                </div>
              )}
              <div className="mt-1">
                <AccountPicker
                  category={cat}
                  value={l.coaAccountId}
                  onChange={(id, name) => updateLine(l.id, { coaAccountId: id, coaAccountName: name })}
                  expAccts={expAccts}
                  incomeAccts={incomeAccts}
                  clientFundsAccts={clientFundsAccts}
                />
              </div>
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground italic">Split into {splits!.length} lines below</div>
          )}
        </td>
        <td className="p-2">
          {!hasSplits && (
            <Input
              placeholder="Client name / purpose"
              value={clientRef ?? ""}
              onChange={(e) => updateLine(l.id, { clientRef: e.target.value } as any)}
              className="h-7 text-xs w-40 border-dashed placeholder:text-xs"
            />
          )}
        </td>
        <td className="p-2 text-right">
          {!hasSplits ? (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => splitTransaction(l.id)}>
              <SplitIcon className="size-3 mr-1" /> Split
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => unsplitTransaction(l.id)}>
              <Undo2 className="size-3 mr-1" /> Unsplit
            </Button>
          )}
        </td>
      </tr>
      {hasSplits && splits!.map((s, idx) => {
        const sCat = s.category;
        const sBg = sCat === "BUSINESS" ? "bg-green-50/40 dark:bg-green-500/5"
          : sCat === "PERSONAL" ? "bg-red-50/40 dark:bg-red-500/5"
          : sCat === "INCOME" ? "bg-emerald-50/40 dark:bg-emerald-500/10"
          : sCat === "CLIENT_FUNDS" ? "bg-purple-50/50 dark:bg-purple-500/10"
          : "bg-amber-50/30 dark:bg-amber-500/5";
        return (
          <tr key={s.id} className={cn("border-b align-top", sBg)}>
            <td className="p-2"></td>
            <td className="p-2 text-[11px] text-muted-foreground pl-6">↳ Split {idx + 1}</td>
            <td className="p-2 text-[11px] text-muted-foreground">{l.description}</td>
            <td className="p-2 text-right">
              <Input
                type="number"
                step="0.01"
                value={String(s.amount)}
                onChange={(e) => updateSplit(l.id, s.id, { amount: Number(e.target.value) || 0 })}
                className="h-7 text-xs w-24 ml-auto tabular-nums text-right"
              />
            </td>
            <td className="p-2 space-y-1">
              <CategoryToggle
                value={sCat}
                onChange={(c) => {
                  const patch: Partial<SplitLine> = { category: c };
                  if (c !== "BUSINESS" && c !== "INCOME" && c !== "CLIENT_FUNDS") {
                    patch.coaAccountId = undefined; patch.coaAccountName = undefined;
                  }
                  updateSplit(l.id, s.id, patch);
                }}
              />
              {sCat === "CLIENT_FUNDS" && (
                <div className="text-[10px] text-purple-600">Pass-through — will not affect P&amp;L</div>
              )}
              <div className="mt-1">
                <AccountPicker
                  category={sCat}
                  value={s.coaAccountId}
                  onChange={(id, name) => updateSplit(l.id, s.id, { coaAccountId: id, coaAccountName: name })}
                  expAccts={expAccts}
                  incomeAccts={incomeAccts}
                  clientFundsAccts={clientFundsAccts}
                />
              </div>
            </td>
            <td className="p-2">
              <Input
                placeholder="Client name / purpose"
                value={s.clientRef ?? ""}
                onChange={(e) => updateSplit(l.id, s.id, { clientRef: e.target.value })}
                className="h-7 text-xs w-40 border-dashed placeholder:text-xs"
              />
            </td>
            <td className="p-2"></td>
          </tr>
        );
      })}
      {hasSplits && (
        <tr className="border-b bg-muted/20">
          <td colSpan={7} className="px-3 py-1.5 text-[11px] text-right">
            {splitBalanced ? (
              <span className="text-green-600">
                {splits!.map(s => formatCurrency(Number(s.amount) || 0)).join(" + ")} = {formatCurrency(original)} ✓
              </span>
            ) : (
              <span className="text-red-600">
                {splits!.map(s => formatCurrency(Number(s.amount) || 0)).join(" + ")} = {formatCurrency(splitSum)} ✗
                {" "}({remaining >= 0 ? `${formatCurrency(Math.abs(remaining))} remaining` : `over by ${formatCurrency(Math.abs(remaining))}`})
              </span>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

const STEPS = ["Card details", "Import statement", "Categorise", "Generate journal"];

function ProgressLine({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", done ? "text-green-600" : active ? "text-foreground" : "text-muted-foreground")}>
      {done ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : <span className="size-3.5 rounded-full border border-current opacity-40" />}
      <span>{label}</span>
    </div>
  );
}

export default function AccountingCardReconciliationNewPage() {
  const navigate = useNavigate();
  const entities = useScopedEntities();
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
  const [aiMetaFields, setAiMetaFields] = useState<Set<AiMetaField>>(new Set());
  const [aiMetaPrev, setAiMetaPrev] = useState<Partial<Record<AiMetaField, string>>>({});

  // PDF extraction state
  const [importTab, setImportTab] = useState<"pdf" | "csv">("pdf");
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // CSV mapping confirmation
  const [csvPreview, setCsvPreview] = useState<CsvParseResult | null>(null);
  const [csvMapping, setCsvMapping] = useState<CsvMapping | null>(null);
  const [csvManual, setCsvManual] = useState(false);

  // Hand-off from Documents → OCR → Send to Card reconciliation
  useEffect(() => {
    let raw: string | null = null;
    try { raw = sessionStorage.getItem('pending-card-statement'); } catch { return; }
    if (!raw) return;
    try { sessionStorage.removeItem('pending-card-statement'); } catch {}
    try {
      const payload = JSON.parse(raw) as {
        filename?: string;
        meta?: { statementFrom?: string; statementTo?: string; openingBalance?: number; closingBalance?: number; currency?: string };
        lines?: CardStatementLine[];
      };
      if (Array.isArray(payload.lines) && payload.lines.length > 0) {
        if (payload.meta?.statementFrom) setFromDate(payload.meta.statementFrom);
        if (payload.meta?.statementTo) setToDate(payload.meta.statementTo);
        if (Number.isFinite(Number(payload.meta?.openingBalance))) setOpening(String(payload.meta!.openingBalance));
        if (Number.isFinite(Number(payload.meta?.closingBalance))) setClosing(String(payload.meta!.closingBalance));
        if (payload.meta?.currency) setCurrency(payload.meta.currency);
        setLines(payload.lines);
        setAiSummary({ total: payload.lines.length, matched: 0 });
        setPdfFileName(payload.filename ?? 'From Documents');
        toast.success(`Loaded ${payload.lines.length} transactions from Documents`);
        setStep(2);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAi = (f: AiMetaField) => aiMetaFields.has(f);
  const clearAiFlag = (f: AiMetaField) => {
    if (!aiMetaFields.has(f)) return;
    setAiMetaFields((prev) => { const n = new Set(prev); n.delete(f); return n; });
  };
  const revertAi = (f: AiMetaField) => {
    const prev = aiMetaPrev[f];
    if (prev === undefined) return;
    if (f === "fromDate") setFromDate(prev);
    else if (f === "toDate") setToDate(prev);
    else if (f === "opening") setOpening(prev);
    else if (f === "closing") setClosing(prev);
    else if (f === "currency") setCurrency(prev);
    clearAiFlag(f);
  };
  const aiHint = (f: AiMetaField) =>
    isAi(f) ? (
      <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">
        AI-filled from PDF
        {aiMetaPrev[f] !== undefined && aiMetaPrev[f] !== "" && (
          <> · was: <span className="font-mono">{aiMetaPrev[f]}</span></>
        )}
        {" · "}
        <button type="button" onClick={() => revertAi(f)} className="underline hover:text-amber-900 dark:hover:text-amber-200">Revert</button>
      </p>
    ) : null;
  const aiRing = (f: AiMetaField) =>
    isAi(f) ? "ring-2 ring-amber-300 focus-visible:ring-amber-400 border-amber-300" : "";

  const liabAccts = accounts.filter((a) => a.groupCode === "LIABILITY" && a.status === "ACTIVE" && a.isPostable !== false);
  const bankAndCardAccounts = useMemo(() => accounts.filter((account) => {
    if (account.status !== "ACTIVE") return false;
    if (account.isPostable === false) return false;
    const group = (account.groupCode || (account as any).group || "").toUpperCase();
    const type  = (account.typeCode  || (account as any).type  || "").toUpperCase();
    const name  = (account.name || "").toUpperCase();
    const tags: string[] = (account as any).automationTags || [];

    const isBank =
      (group === "ASSET" || group === "ASSETS") && (
        type.includes("BANK") || type.includes("CASH") || type.includes("CURRENT") ||
        name.includes("BANK") || name.includes("TD") || name.includes("RBC") ||
        name.includes("HDFC") || name.includes("ICICI") || name.includes("SBI") ||
        name.includes("FCNR") || tags.includes("bank")
      );

    const isCreditCard =
      (group === "LIABILITY" || group === "LIABILITIES") && (
        type.includes("CREDIT_CARD") || type.includes("CREDIT CARD") ||
        name.includes("CARD") || name.includes("AMEX") ||
        name.includes("VISA") || name.includes("MASTERCARD") ||
        tags.includes("credit_card")
      );

    const isIntercompany =
      tags.includes("intercompany") ||
      name.includes("DUE TO") || name.includes("DUE FROM");

    return (isBank || isCreditCard) && !isIntercompany;
  }), [accounts]);
  const expAccts = accounts.filter((a) => ["EXPENSE", "COGS", "OTHER_EXPENSE"].includes(a.groupCode) && a.status === "ACTIVE" && a.isPostable !== false);
  const incomeAccts = accounts.filter((a) => ["REVENUE", "OTHER_INCOME"].includes(a.groupCode) && a.status === "ACTIVE" && a.isPostable !== false);
  const clientFundsAccts = useMemo(() => accounts.filter((account) => {
    if (account.status !== "ACTIVE") return false;
    if (account.isPostable === false) return false;
    const tags: string[] = (account as any).automationTags || [];
    return tags.includes("client_funds") || tags.includes("pass_through");
  }), [accounts]);
  const defaultIncomeAcct = useMemo(
    () => incomeAccts[0] ?? accounts.find((a) => a.groupCode === "ASSET" && /receivable/i.test(a.name)),
    [accounts, incomeAccts],
  );

  const cardAcct = accounts.find((a) => a.id === cardAccountId);
  const drawingsAcct = useMemo(() => accounts.find((a) => /drawing/i.test(a.name)) ?? accounts.find((a) => a.groupCode === "EQUITY"), [accounts]);

  const effective: EffectiveLine[] = useMemo(() => {
    const out: EffectiveLine[] = [];
    for (const l of lines) {
      const splits = (l as any).splits as SplitLine[] | undefined;
      if (splits && splits.length > 0) {
        const sign = l.amount < 0 ? -1 : 1;
        for (const s of splits) {
          out.push({
            id: s.id,
            parentId: l.id,
            date: l.date,
            description: l.description,
            amount: sign * Math.abs(Number(s.amount) || 0),
            category: s.category,
            coaAccountId: s.coaAccountId,
            coaAccountName: s.coaAccountName,
            clientRef: s.clientRef,
            expenseCategory: s.expenseCategory,
          });
        }
      } else {
        out.push({
          id: l.id,
          date: l.date,
          description: l.description,
          amount: l.amount,
          category: l.category as LineCategory,
          coaAccountId: l.coaAccountId,
          coaAccountName: l.coaAccountName,
          clientRef: (l as any).clientRef,
          expenseCategory: l.expenseCategory,
        });
      }
    }
    return out;
  }, [lines]);

  const totals = useMemo(() => {
    const biz = effective.filter((l) => l.category === "BUSINESS").reduce((s, l) => s + Math.abs(l.amount), 0);
    const per = effective.filter((l) => l.category === "PERSONAL").reduce((s, l) => s + Math.abs(l.amount), 0);
    const inc = effective.filter((l) => l.category === "INCOME").reduce((s, l) => s + Math.abs(l.amount), 0);
    const cf  = effective.filter((l) => l.category === "CLIENT_FUNDS").reduce((s, l) => s + Math.abs(l.amount), 0);
    const bizN = effective.filter((l) => l.category === "BUSINESS").length;
    const perN = effective.filter((l) => l.category === "PERSONAL").length;
    const incN = effective.filter((l) => l.category === "INCOME").length;
    const cfN  = effective.filter((l) => l.category === "CLIENT_FUNDS").length;
    const un = effective.filter((l) => l.category === "UNCATEGORISED").length;
    return { biz, per, inc, cf, bizN, perN, incN, cfN, un,
      total: effective.reduce((s, l) => s + Math.abs(l.amount), 0) };
  }, [effective]);

  function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseStatementCsv(String(e.target?.result ?? ""));
      if (!result.headers.length) { toast.error("Could not read CSV"); return; }
      setCsvPreview(result);
      setCsvMapping(result.mapping);
      setCsvManual(result.format === "UNKNOWN");
    };
    reader.readAsText(file);
  }

  function confirmCsvImport() {
    if (!csvPreview || !csvMapping) return;
    const parsed = applyCsvMapping(csvPreview.rows, csvMapping, csvPreview.headerless ? { preferMDY: true } : undefined);
    if (parsed.length === 0) { toast.error("No transactions parsed with this mapping"); return; }
    setLines(parsed.map((p) => {
      const isIncome = p.amount > 0;
      const incomeAcct = isIncome ? defaultIncomeAcct : undefined;
      return {
        id: genId("cl"),
        date: p.date,
        description: p.description,
        amount: p.amount, // signed
        category: (isIncome ? "INCOME" : "UNCATEGORISED") as any,
        isPersonal: false,
        coaAccountId: incomeAcct?.id,
        coaAccountName: incomeAcct?.name,
      };
    }));
    setAiLineIds(new Set());
    setAiSummary(null);
    toast.success(`Imported ${parsed.length} transactions`);
    setCsvPreview(null);
    setCsvMapping(null);
    setCsvManual(false);
    setStep(2);
  }

  async function handlePdfFile(file: File) {
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }
    setPdfFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
    setExtractError(null);
    setExtracting(true);
    setProgress({ stage: "reading", message: "Reading PDF pages…" });
    // Reset AI meta markers for this fresh extraction
    setAiMetaFields(new Set());
    setAiMetaPrev({});

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

      // Auto-fill meta from AI (always overwrite when AI returns a usable value),
      // recording the prior value so the user can revert.
      const nextAi = new Set<AiMetaField>();
      const nextPrev: Partial<Record<AiMetaField, string>> = {};
      const tryFill = <T,>(
        field: AiMetaField,
        aiValue: T | undefined,
        current: string,
        accept: (v: T) => string | null,
        setter: (s: string) => void,
      ) => {
        if (aiValue === undefined || aiValue === null) return;
        const next = accept(aiValue);
        if (next === null || next === "") return;
        if (next === current) return;
        nextPrev[field] = current;
        nextAi.add(field);
        setter(next);
      };
      tryFill("fromDate", result.meta.statementFrom, fromDate, (v) => (typeof v === "string" && v ? v : null), setFromDate);
      tryFill("toDate",   result.meta.statementTo,   toDate,   (v) => (typeof v === "string" && v ? v : null), setToDate);
      tryFill("opening",  result.meta.openingBalance, opening, (v) => (Number.isFinite(Number(v)) ? String(Number(v)) : null), setOpening);
      tryFill("closing",  result.meta.closingBalance, closing, (v) => (Number.isFinite(Number(v)) ? String(Number(v)) : null), setClosing);
      tryFill("currency", result.meta.currency, currency, (v) => (typeof v === "string" && /^[A-Za-z]{3}$/.test(v) ? v.toUpperCase() : null), setCurrency);
      setAiMetaFields(nextAi);
      setAiMetaPrev(nextPrev);

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

  function updateSplit(parentId: string, splitId: string, patch: Partial<SplitLine>) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== parentId) return l;
      const splits = ((l as any).splits as SplitLine[] | undefined) ?? [];
      const next = splits.map((s) => s.id === splitId ? { ...s, ...patch } : s);
      return { ...l, splits: next } as any;
    }));
  }

  function splitTransaction(id: string) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      if ((l as any).splits) return l;
      const amt = Math.abs(l.amount);
      const half = Math.round((amt / 2) * 100) / 100;
      const splits: SplitLine[] = [
        { id: genId("sp"), amount: half, category: (l.category as LineCategory) ?? "UNCATEGORISED",
          coaAccountId: l.coaAccountId, coaAccountName: l.coaAccountName,
          expenseCategory: l.expenseCategory, clientRef: (l as any).clientRef },
        { id: genId("sp"), amount: Math.round((amt - half) * 100) / 100, category: "UNCATEGORISED" },
      ];
      return { ...l, splits } as any;
    }));
  }

  function unsplitTransaction(id: string) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const next: any = { ...l };
      delete next.splits;
      return next;
    }));
  }

  function setBulkCategory(ids: string[], cat: "BUSINESS" | "PERSONAL" | "INCOME") {
    setLines((prev) => prev.map((l) => {
      if (!ids.includes(l.id)) return l;
      let coaAccountId = l.coaAccountId;
      let coaAccountName = l.coaAccountName;
      if (cat === "BUSINESS" && !coaAccountId) {
        const sug = suggestAccount(l.description, expAccts);
        coaAccountId = sug?.id; coaAccountName = sug?.name;
      } else if (cat === "INCOME") {
        coaAccountId = defaultIncomeAcct?.id;
        coaAccountName = defaultIncomeAcct?.name;
      }
      return { ...l, category: cat as any, isPersonal: cat === "PERSONAL", coaAccountId, coaAccountName };
    }));
  }

  function generateJournal(): { journalLines: any[]; kinds: string[]; balanced: boolean } {
    const journalLines: any[] = [];
    const kinds: string[] = [];
    const push = (jl: any | null, kind: string) => { if (jl) { journalLines.push(jl); kinds.push(kind); } };

    const bizByAcct = new Map<string, number>();
    effective.filter((l) => l.category === "BUSINESS" && l.coaAccountId).forEach((l) => {
      bizByAcct.set(l.coaAccountId!, (bizByAcct.get(l.coaAccountId!) ?? 0) + Math.abs(l.amount));
    });
    const incomeByAcct = new Map<string, number>();
    effective.filter((l) => l.category === "INCOME" && l.coaAccountId).forEach((l) => {
      incomeByAcct.set(l.coaAccountId!, (incomeByAcct.get(l.coaAccountId!) ?? 0) + Math.abs(l.amount));
    });
    bizByAcct.forEach((amt, accId) => {
      push(buildLine({ id: genId("jl"), accountId: accId, debit: amt, description: "Card statement business" }), "BUSINESS");
    });
    if (totals.per > 0 && drawingsAcct) {
      push(buildLine({ id: genId("jl"), accountId: drawingsAcct.id, debit: totals.per, description: "Personal drawings" }), "PERSONAL");
    }
    incomeByAcct.forEach((amt, accId) => {
      push(buildLine({ id: genId("jl"), accountId: accId, credit: amt, description: "Statement income / receipt" }), "INCOME");
    });
    // Client funds — per-line so clientRef appears in narration
    effective.filter((l) => l.category === "CLIENT_FUNDS" && l.coaAccountId).forEach((l) => {
      const desc = l.clientRef ? `${l.description} [${l.clientRef}]` : l.description;
      push(buildLine({ id: genId("jl"), accountId: l.coaAccountId!, credit: Math.abs(l.amount), description: desc }), "CLIENT_FUNDS");
    });
    const expensesNet = totals.biz + totals.per;
    if (expensesNet > 0) {
      push(buildLine({ id: genId("jl"), accountId: cardAccountId, credit: expensesNet, description: "Statement settlement (out)" }), "CARD");
    }
    const cashIn = totals.inc + totals.cf;
    if (cashIn > 0) {
      push(buildLine({ id: genId("jl"), accountId: cardAccountId, debit: cashIn, description: "Statement receipts (in)" }), "CARD");
    }
    const dr = journalLines.reduce((s, l) => s + l.debit, 0);
    const cr = journalLines.reduce((s, l) => s + l.credit, 0);
    return { journalLines, kinds, balanced: new Decimal(dr).minus(cr).abs().lt(0.01) };
  }

  function postJournal() {
    // Guard: every split row must sum to its parent's amount.
    const badSplit = lines.find((l) => {
      const sp = (l as any).splits as SplitLine[] | undefined;
      if (!sp || sp.length === 0) return false;
      const sum = sp.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      return Math.abs(sum - Math.abs(l.amount)) >= 0.005;
    });
    if (badSplit) {
      toast.error("One or more split transactions don't add up to the original amount");
      return;
    }
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
        <AccountingPageHeader title="Import bank / card statement" />

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
                <SelectTrigger><SelectValue placeholder="Select bank or card account…" /></SelectTrigger>
                <SelectContent className="max-h-64">{bankAndCardAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
              {bankAndCardAccounts.length === 0 && (
                <div className="mt-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-[13px] text-muted-foreground">
                  No bank or card accounts found in Chart of Accounts. Go to Chart of Accounts → New account and add your bank account first.
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => navigate("/accounting/coa")}>
                      Add bank account to COA →
                    </Button>
                  </div>
                </div>
              )}
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
              <div>
                <Label className="flex items-center gap-2">Currency {isAi("currency") && <AiBadge />}</Label>
                <div className={cn("rounded-md", isAi("currency") && "ring-2 ring-amber-300 rounded-md")}>
                  <DynamicSelect listKey="currencies" value={currency} onValueChange={(v) => { clearAiFlag("currency"); setCurrency(v); }} />
                </div>
                {aiHint("currency")}
              </div>
              <div>
                <Label className="flex items-center gap-2">From date {isAi("fromDate") && <AiBadge />}</Label>
                <Input type="date" value={fromDate} className={cn(aiRing("fromDate"))} onChange={(e) => { clearAiFlag("fromDate"); setFromDate(e.target.value); }} />
                {aiHint("fromDate")}
              </div>
              <div>
                <Label className="flex items-center gap-2">To date {isAi("toDate") && <AiBadge />}</Label>
                <Input type="date" value={toDate} className={cn(aiRing("toDate"))} onChange={(e) => { clearAiFlag("toDate"); setToDate(e.target.value); }} />
                {aiHint("toDate")}
              </div>
              <div>
                <Label className="flex items-center gap-2">Opening balance {isAi("opening") && <AiBadge />}</Label>
                <Input type="number" step="0.01" value={opening} className={cn(aiRing("opening"))} onChange={(e) => { clearAiFlag("opening"); setOpening(e.target.value); }} />
                {aiHint("opening")}
              </div>
              <div>
                <Label className="flex items-center gap-2">Closing balance {isAi("closing") && <AiBadge />}</Label>
                <Input type="number" step="0.01" value={closing} className={cn(aiRing("closing"))} onChange={(e) => { clearAiFlag("closing"); setClosing(e.target.value); }} />
                {aiHint("closing")}
              </div>
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
                {!csvPreview && (
                  <>
                    <label className="block border-2 border-dashed border-muted rounded-lg p-10 text-center hover:bg-muted/30 cursor-pointer">
                      <Upload className="size-8 mx-auto mb-3 text-muted-foreground" />
                      <div className="text-sm font-medium">Drop your bank or credit card statement CSV here</div>
                      <div className="text-xs text-muted-foreground mt-1">Or click to browse · Max 5MB · CSV only · TD Canada Trust auto-detected</div>
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    </label>
                    <p className="text-xs text-muted-foreground">Download your statement from your bank's website as CSV. Most Canadian banks include Date, Description, Debit, Credit and Balance columns.</p>
                    <Button variant="link" size="sm" onClick={downloadSample} className="px-0">Download sample CSV template (TD format)</Button>
                  </>
                )}

                {csvPreview && csvMapping && (() => {
                  const headerless = !!csvPreview.headerless;
                  const previewParsed = applyCsvMapping(csvPreview.rows, csvMapping, headerless ? { preferMDY: true } : undefined).slice(0, 5);
                  const known = csvPreview.format !== "UNKNOWN";
                  const roles: { key: keyof CsvMapping; label: string }[] = [
                    { key: "dateCol", label: "Date" },
                    { key: "descCol", label: "Description" },
                    { key: "desc2Col", label: "Description 2 (optional)" },
                    { key: "debitCol", label: "Debit (money out)" },
                    { key: "creditCol", label: "Credit (money in)" },
                    { key: "amountCol", label: "Amount (signed)" },
                    { key: "balanceCol", label: "Balance (ignored)" },
                  ];
                  return (
                    <div className="space-y-3">
                      <div className={cn(
                        "rounded-md border text-xs p-3",
                        known ? "border-green-300 bg-green-50 text-green-900 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300"
                              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                      )}>
                        {headerless ? (
                          <><strong>Detected:</strong> TD Canada Trust format (no headers) — mapped automatically · {csvPreview.rows.length} rows</>
                        ) : (
                          <><strong>Detected:</strong> {csvPreview.formatLabel} · {csvPreview.rows.length} data rows</>
                        )}
                      </div>

                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Description</th>
                              <th className="text-right p-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewParsed.length === 0 && (
                              <tr><td colSpan={3} className="p-3 text-muted-foreground text-center">No rows parsed with current mapping — try "Re-map columns manually".</td></tr>
                            )}
                            {previewParsed.map((p, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2 whitespace-nowrap">{p.date}</td>
                                <td className="p-2">{p.description}</td>
                                <td className={cn("p-2 text-right tabular-nums font-medium", p.amount < 0 ? "text-red-600" : "text-green-600")}>
                                  {p.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(p.amount))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Balance column is ignored. Negative = debit (money out), positive = credit (money in).</p>

                      {csvManual && !headerless && (
                        <div className="rounded-md border p-3 space-y-2 bg-muted/20">
                          <div className="text-xs font-medium">Map CSV columns manually</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {roles.map((r) => (
                              <div key={r.key} className="flex items-center gap-2 text-xs">
                                <span className="w-44 text-muted-foreground">{r.label}</span>
                                <Select
                                  value={String(csvMapping[r.key] ?? "")}
                                  onValueChange={(v) => {
                                    const n = Number(v);
                                    const next: any = { ...csvMapping };
                                    if (!v || n < 0) {
                                      if (r.key === "dateCol" || r.key === "descCol") next[r.key] = -1;
                                      else next[r.key] = undefined;
                                    } else next[r.key] = n;
                                    setCsvMapping(next);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— none —" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="-1">— none —</SelectItem>
                                    {csvPreview.headers.map((h, i) => (
                                      <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setCsvPreview(null); setCsvMapping(null); setCsvManual(false); }}>Choose a different file</Button>
                        <div className="flex items-center gap-3">
                          {!headerless && (
                            <Button variant="link" size="sm" className="px-0" onClick={() => setCsvManual((v) => !v)}>
                              {csvManual ? "Hide manual mapper" : "Re-map columns manually"}
                            </Button>
                          )}
                          <Button size="sm" onClick={confirmCsvImport}>Confirm and categorise →</Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
            {aiMetaFields.size > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10 text-xs p-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2">
                  <Sparkles className="size-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="font-medium text-amber-900 dark:text-amber-200">AI also filled in your card details</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-800 dark:text-amber-300">
                      {isAi("fromDate") && <span>Statement from: <strong>{fromDate}</strong></span>}
                      {isAi("toDate") && <span>Statement to: <strong>{toDate}</strong></span>}
                      {isAi("opening") && <span>Opening: <strong>{formatCurrency(Number(opening))}</strong></span>}
                      {isAi("closing") && <span>Closing: <strong>{formatCurrency(Number(closing))}</strong></span>}
                      {isAi("currency") && <span>Currency: <strong>{currency}</strong></span>}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep(0)} className="border-amber-400 text-amber-900 hover:bg-amber-100 dark:text-amber-200">Review card details</Button>
              </div>
            )}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs space-x-3">
                <span>✓ Business: <strong className="text-green-600">{totals.bizN}</strong> — {formatCurrency(totals.biz)}</span>
                <span>Personal: <strong className="text-red-600">{totals.perN}</strong> — {formatCurrency(totals.per)}</span>
                <span>Income: <strong className="text-emerald-700">{totals.incN}</strong> — {formatCurrency(totals.inc)}</span>
                <span>Client funds: <strong className="text-purple-600">{totals.cfN}</strong> — {formatCurrency(totals.cf)} <span className="text-purple-600/70">(pass-through)</span></span>
                <span>⚠ Uncategorised: <strong className="text-amber-600">{totals.un}</strong> remaining</span>
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
                    <th className="text-left p-2">Category & account</th>
                    <th className="text-left p-2">Client ref</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const splits = (l as any).splits as SplitLine[] | undefined;
                    const hasSplits = !!(splits && splits.length > 0);
                    const cat = (l.category as LineCategory);
                    const bg = hasSplits ? "bg-muted/40"
                      : cat === "BUSINESS" ? "bg-green-50/40 dark:bg-green-500/5"
                      : cat === "PERSONAL" ? "bg-red-50/40 dark:bg-red-500/5"
                      : cat === "INCOME" ? "bg-emerald-50/40 dark:bg-emerald-500/10"
                      : cat === "CLIENT_FUNDS" ? "bg-purple-50/50 dark:bg-purple-500/10"
                      : "bg-amber-50/30 dark:bg-amber-500/5";
                    return (
                      <FragmentRow
                        key={l.id}
                        line={l}
                        splits={splits}
                        hasSplits={hasSplits}
                        bg={bg}
                        selected={selected}
                        setSelected={setSelected}
                        updateLine={updateLine}
                        updateSplit={updateSplit}
                        splitTransaction={splitTransaction}
                        unsplitTransaction={unsplitTransaction}
                        expAccts={expAccts}
                        incomeAccts={incomeAccts}
                        clientFundsAccts={clientFundsAccts}
                        defaultIncomeAcct={defaultIncomeAcct}
                        aiLineIds={aiLineIds}
                      />
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
          const { journalLines, kinds, balanced } = generateJournal();
          const kindBadge = (k: string) => {
            const map: Record<string, { cls: string; label: string }> = {
              BUSINESS:     { cls: "bg-amber-100 text-amber-800 border-amber-300",   label: "Business" },
              PERSONAL:     { cls: "bg-red-100 text-red-800 border-red-300",         label: "Personal" },
              INCOME:       { cls: "bg-green-100 text-green-800 border-green-300",   label: "Income" },
              CLIENT_FUNDS: { cls: "bg-purple-100 text-purple-800 border-purple-300", label: "Pass-through" },
              CARD:         { cls: "bg-muted text-muted-foreground border-muted",     label: "Bank/Card" },
            };
            const m = map[k] ?? map.CARD;
            return <span className={cn("inline-block text-[10px] px-1.5 py-0.5 rounded border", m.cls)}>{m.label}</span>;
          };
          return (
            <Card className="p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Journal entry preview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">Date {isAi("toDate") && <AiBadge />}</div>
                  {toDate}
                </div>
                <div><div className="text-xs text-muted-foreground">Entity</div>{entities.find(e=>e.id===entity)?.name ?? "—"}</div>
                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">Currency {isAi("currency") && <AiBadge />}</div>
                  {currency}
                </div>
                <div><div className="text-xs text-muted-foreground">Status</div>{balanced ? <span className="text-green-600">✓ Balanced</span> : <span className="text-destructive">✗ Unbalanced</span>}</div>
              </div>
              <table className="w-full text-sm border-t border-b">
                <thead className="text-xs text-muted-foreground bg-muted/30">
                  <tr>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Account</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-right px-3 py-2">DR</th>
                    <th className="text-right px-3 py-2">CR</th>
                  </tr>
                </thead>
                <tbody>
                  {journalLines.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5">{i+1}</td>
                      <td className="px-3 py-1.5">
                        <div>{l.accountCode} — {l.accountName}</div>
                        {l.description && <div className="text-[10px] text-muted-foreground">{l.description}</div>}
                      </td>
                      <td className="px-3 py-1.5">{kindBadge(kinds[i])}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.debit ? formatCurrency(l.debit) : "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.credit ? formatCurrency(l.credit) : "—"}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td colSpan={3} className="px-3 py-1.5 text-right">Totals</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(journalLines.reduce((s,l)=>s+l.debit,0))}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(journalLines.reduce((s,l)=>s+l.credit,0))}</td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                {(isAi("opening") || isAi("closing")) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pb-2 mb-2 border-b text-xs">
                    <span className="flex items-center gap-1">Opening: <strong>{formatCurrency(Number(opening))}</strong> {isAi("opening") && <AiBadge />}</span>
                    <span className="flex items-center gap-1">Closing: <strong>{formatCurrency(Number(closing))}</strong> {isAi("closing") && <AiBadge />}</span>
                  </div>
                )}
                <div>Business expenses: <strong>{formatCurrency(totals.biz)}</strong></div>
                <div>Personal (drawings): <strong>{formatCurrency(totals.per)}</strong></div>
                <div>Income received: <strong className="text-emerald-700">{formatCurrency(totals.inc)}</strong></div>
                <div>
                  Client funds (pass-through): <strong className="text-purple-700">{formatCurrency(totals.cf)}</strong>
                  <div className="text-[11px] text-muted-foreground pl-2">These do not affect your P&amp;L</div>
                </div>
                <div className="border-t mt-2 pt-2">
                  Net P&amp;L impact: <strong>{formatCurrency(totals.inc - totals.biz)}</strong>
                  <span className="text-[11px] text-muted-foreground"> (income − business expenses)</span>
                </div>
                <div className="text-[11px] text-muted-foreground">Total statement activity: {formatCurrency(totals.biz + totals.per + totals.inc + totals.cf)}</div>
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