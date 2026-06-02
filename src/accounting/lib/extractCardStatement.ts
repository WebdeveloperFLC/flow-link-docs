import { rasterizePdfToJpegs, imageFileToJpegDataUrl } from "@/lib/extractFirstPageText";
import { supabase } from "@/integrations/supabase/client";
import type { CardStatementLine } from "@/accounting/types/cardReconciliation";

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  reference?: string;
}

export interface StatementMeta {
  statementFrom?: string;
  statementTo?: string;
  openingBalance?: number;
  closingBalance?: number;
  cardLast4?: string;
  cardHolderName?: string;
  currency?: string;
}

export interface ExtractionResult {
  success: boolean;
  transactions: ExtractedTransaction[];
  meta: StatementMeta;
  pageCount: number;
  errors?: string[];
}

export interface ExtractionProgress {
  stage: "reading" | "converting" | "extracting" | "organising" | "done";
  message: string;
  current?: number;
  total?: number;
}

function describeFunctionError(error: unknown): string {
  if (!error) return "Unknown OCR service error";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    return [e.message, e.name, e.status, e.context]
      .filter(Boolean)
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join(" — ") || "Unknown OCR service error";
  }
  return "Unknown OCR service error";
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function stripDataPrefix(s: string): string {
  const i = s.indexOf(",");
  return s.startsWith("data:") && i >= 0 ? s.slice(i + 1) : s;
}

async function fileToPages(file: File): Promise<string[]> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) {
    const blobs = await rasterizePdfToJpegs(file, 140, 0.72);
    const base64s: string[] = [];
    for (const b of blobs) base64s.push(await blobToBase64(b));
    return base64s;
  }
  const dataUrl = await imageFileToJpegDataUrl(file, 1800, 0.8);
  return dataUrl ? [stripDataPrefix(dataUrl)] : [];
}

export async function extractCardStatement(
  file: File,
  options?: { cardHolderName?: string; cardLast4?: string; currency?: string },
  onProgress?: (p: ExtractionProgress) => void,
  signal?: AbortSignal,
): Promise<ExtractionResult> {
  onProgress?.({ stage: "reading", message: "Reading PDF pages…" });
  const pages = await fileToPages(file);
  if (signal?.aborted) throw new Error("aborted");

  if (!pages.length) {
    return { success: false, transactions: [], meta: {}, pageCount: 0, errors: ["Could not read any pages from file"] };
  }

  onProgress?.({ stage: "converting", message: `Converted ${pages.length} page(s)`, total: pages.length });

  const batchSize = 10;
  const batches: string[][] = [];
  for (let i = 0; i < pages.length; i += batchSize) batches.push(pages.slice(i, i + batchSize));

  const allTx: ExtractedTransaction[] = [];
  let mergedMeta: StatementMeta = {};
  const errors: string[] = [];
  let processed = 0;

  for (const batch of batches) {
    if (signal?.aborted) throw new Error("aborted");
    onProgress?.({
      stage: "extracting",
      message: `Extracting transactions from page ${processed + 1}–${processed + batch.length} of ${pages.length}…`,
      current: processed,
      total: pages.length,
    });

    try {
      const { data, error } = await supabase.functions.invoke("extract-card-statement", {
        body: { pages: batch, ...options },
      });
      if (signal?.aborted) throw new Error("aborted");
      if (error) {
        errors.push(`Batch failed: ${describeFunctionError(error)}`);
        processed += batch.length;
        continue;
      }
      if (!data || typeof data !== "object") {
        errors.push("Batch failed: OCR service returned an empty response");
        processed += batch.length;
        continue;
      }
      if (Array.isArray(data?.transactions)) allTx.push(...data.transactions);
      if (Array.isArray(data?.errors)) errors.push(...data.errors);
      if (data?.meta && typeof data.meta === "object") {
        mergedMeta = {
          statementFrom: mergedMeta.statementFrom ?? data.meta.statementFrom,
          statementTo: mergedMeta.statementTo ?? data.meta.statementTo,
          openingBalance: mergedMeta.openingBalance ?? data.meta.openingBalance,
          closingBalance: mergedMeta.closingBalance ?? data.meta.closingBalance,
          cardLast4: mergedMeta.cardLast4 ?? data.meta.cardLast4,
          cardHolderName: mergedMeta.cardHolderName ?? data.meta.cardHolderName,
          currency: mergedMeta.currency ?? data.meta.currency,
        };
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      errors.push(`Batch failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
    processed += batch.length;
  }

  onProgress?.({ stage: "organising", message: "Organising data…" });

  // Final dedupe + sort (in case multiple batches overlap)
  const seen = new Set<string>();
  const transactions: ExtractedTransaction[] = [];
  for (const t of allTx) {
    const key = `${t.date}|${Math.round(t.amount * 100)}|${(t.description || "").toLowerCase().slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    transactions.push(t);
  }
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  onProgress?.({ stage: "done", message: "Done" });

  return {
    success: transactions.length > 0,
    transactions,
    meta: mergedMeta,
    pageCount: pages.length,
    errors: errors.length ? errors : undefined,
  };
}

// ---- Auto-suggestion ----

interface CategoryHint {
  expenseCategory: string;
  coaAccountCode: string;
}

const KEYWORD_RULES: { match: RegExp; hint: CategoryHint }[] = [
  { match: /\bGOOGLE\b(?!.*CLOUD)/i, hint: { expenseCategory: "MARKETING", coaAccountCode: "6202" } },
  { match: /AWS|AMAZON WEB|GOOGLE CLOUD|GCP/i, hint: { expenseCategory: "SOFTWARE", coaAccountCode: "6404" } },
  { match: /MICROSOFT|OFFICE\s?365|MSFT/i, hint: { expenseCategory: "SOFTWARE", coaAccountCode: "6403" } },
  { match: /UBER|LYFT|OLA|TAXI/i, hint: { expenseCategory: "TRAVEL", coaAccountCode: "6301" } },
  { match: /HOTEL|MARRIOTT|HILTON|HYATT|SHERATON|TAJ|OYO/i, hint: { expenseCategory: "TRAVEL", coaAccountCode: "6303" } },
  { match: /AIR\s?CANADA|WESTJET|AIRLINE|DELTA|UNITED|AIR INDIA|INDIGO|EMIRATES|FLIGHT/i, hint: { expenseCategory: "TRAVEL", coaAccountCode: "6302" } },
  { match: /SHOPIFY|STRIPE|PAYPAL|RAZORPAY|SQUARE/i, hint: { expenseCategory: "SOFTWARE", coaAccountCode: "6403" } },
  { match: /BELL|ROGERS|TELUS|AIRTEL|JIO|VODAFONE|VERIZON|AT&T/i, hint: { expenseCategory: "UTILITIES", coaAccountCode: "6108" } },
  { match: /STAPLES|OFFICE\s?DEPOT|OFFICEMAX/i, hint: { expenseCategory: "OFFICE_SUPPLIES", coaAccountCode: "6401" } },
  { match: /CANADA\s?POST|FEDEX|UPS|DHL|BLUE\s?DART/i, hint: { expenseCategory: "COURIER", coaAccountCode: "6402" } },
  { match: /WEWORK|REGUS|AWFIS|IWG/i, hint: { expenseCategory: "OFFICE_RENT", coaAccountCode: "6113" } },
];

export function autoSuggestCategory(description: string): CategoryHint | null {
  const d = description || "";
  for (const r of KEYWORD_RULES) if (r.match.test(d)) return r.hint;
  return null;
}

function guessedMerchant(description: string): string {
  return (description || "")
    .replace(/\s{2,}/g, " ")
    .replace(/[#*]+\d+/g, "")
    .replace(/\d{3,}/g, "")
    .trim()
    .split(/\s+/).slice(0, 4).join(" ");
}

export function mapToCardStatementLines(
  transactions: ExtractedTransaction[],
  _currency: string,
): CardStatementLine[] {
  return transactions.map((t) => ({
    id:
      (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : null) ??
      `cl-${Math.random().toString(36).slice(2)}`,
    date: t.date,
    description: t.description,
    amount: t.amount, // signed: negative = debit/expense, positive = credit/income
    category: "UNCATEGORISED",
    isPersonal: false,
    merchantName: guessedMerchant(t.description),
    notes: "",
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// Smart CSV parser for bank / card statements
// ───────────────────────────────────────────────────────────────────────────

export type CsvFormat = "TD" | "GENERIC_AMOUNT" | "CREDIT_CARD" | "UNKNOWN";

export interface CsvMapping {
  dateCol: number;
  descCol: number;
  desc2Col?: number;
  debitCol?: number;
  creditCol?: number;
  amountCol?: number;
  balanceCol?: number;
}

export interface CsvParseResult {
  format: CsvFormat;
  formatLabel: string;
  headers: string[];
  rows: string[][];
  mapping: CsvMapping;
  parsed: { date: string; description: string; amount: number }[];
  headerless?: boolean;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseNum(s: string): number {
  if (!s) return 0;
  let v = s.replace(/[$\s,]/g, "");
  let neg = false;
  if (/^\(.*\)$/.test(v)) { neg = true; v = v.slice(1, -1); }
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
}

export function normaliseDate(s: string, opts?: { preferMDY?: boolean }): string {
  if (!s) return "";
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, a, b, y] = slash;
    if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
    const ai = parseInt(a, 10);
    const bi = parseInt(b, 10);
    let dd: number; let mm: number;
    if (ai > 12) { dd = ai; mm = bi; }
    else if (bi > 12) { mm = ai; dd = bi; }
    else if (opts?.preferMDY) { mm = ai; dd = bi; } // MM/DD/YYYY (TD headerless)
    else { dd = ai; mm = bi; } // ambiguous → DD/MM/YYYY (TD Canadian default)
    return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  const dash = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) {
    const [, a, b, y] = dash;
    const ai = parseInt(a, 10); const bi = parseInt(b, 10);
    const dd = ai > 12 ? ai : bi > 12 ? bi : ai;
    const mm = ai > 12 ? bi : bi > 12 ? ai : bi;
    return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return t;
}

function findCol(headers: string[], patterns: RegExp[]): number {
  for (const p of patterns) {
    const i = headers.findIndex((h) => p.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

function findAllCols(headers: string[], pattern: RegExp): number[] {
  const out: number[] = [];
  headers.forEach((h, i) => { if (pattern.test(h)) out.push(i); });
  return out;
}

export function detectCsvMapping(headers: string[]): { format: CsvFormat; formatLabel: string; mapping: CsvMapping } {
  const lower = headers.map((h) => h.toLowerCase());
  const hasDebit = lower.some((h) => /\b(debit|withdrawals?|money\s*out)\b/.test(h));
  const hasCredit = lower.some((h) => /\b(credit|deposits?|money\s*in)\b/.test(h));
  const hasBalance = lower.some((h) => /balance/.test(h));
  const hasAmount = lower.some((h) => /\b(amount|amt)\b/.test(h));

  const dateCol = findCol(lower, [/^date$/, /date/]);
  const descCols = findAllCols(lower, /(description|desc|narration|merchant|details?|particulars?)/);
  const descCol = descCols[0] ?? -1;
  const desc2Col = descCols[1];
  const balanceCol = findCol(lower, [/balance/]);

  // TD-style: separate debit & credit columns (+ optional balance)
  if (hasDebit && hasCredit) {
    const debitCol = findCol(lower, [/^debit$/, /debit/, /withdrawals?/, /money\s*out/]);
    const creditCol = findCol(lower, [/^credit$/, /credit/, /deposits?/, /money\s*in/]);
    const isTd = hasBalance;
    return {
      format: isTd ? "TD" : "GENERIC_AMOUNT",
      formatLabel: isTd ? "TD Canada Trust format" : "Generic bank statement (debit/credit columns)",
      mapping: { dateCol, descCol, desc2Col, debitCol, creditCol, balanceCol: balanceCol >= 0 ? balanceCol : undefined },
    };
  }

  if (hasAmount) {
    const amountCol = findCol(lower, [/^amount$/, /amount/, /\bamt\b/]);
    const looksCard = lower.some((h) => /(card|transaction|posted|merchant)/.test(h)) && !hasBalance;
    return {
      format: looksCard ? "CREDIT_CARD" : "GENERIC_AMOUNT",
      formatLabel: looksCard ? "Credit card statement" : "Generic bank statement",
      mapping: { dateCol, descCol, desc2Col, amountCol, balanceCol: balanceCol >= 0 ? balanceCol : undefined },
    };
  }

  return {
    format: "UNKNOWN",
    formatLabel: "Unknown format — please map fields",
    mapping: { dateCol, descCol, desc2Col, balanceCol: balanceCol >= 0 ? balanceCol : undefined },
  };
}

export function applyCsvMapping(
  rows: string[][],
  mapping: CsvMapping,
  opts?: { preferMDY?: boolean },
): { date: string; description: string; amount: number }[] {
  const out: { date: string; description: string; amount: number }[] = [];
  for (const cells of rows) {
    const dateRaw = mapping.dateCol >= 0 ? cells[mapping.dateCol] ?? "" : "";
    const date = normaliseDate(dateRaw, opts);
    if (!date) continue;
    const d1 = mapping.descCol >= 0 ? cells[mapping.descCol] ?? "" : "";
    const d2 = mapping.desc2Col !== undefined ? cells[mapping.desc2Col] ?? "" : "";
    const description = `${d1} ${d2}`.replace(/\s+/g, " ").trim();
    if (!description) continue;

    let amount = 0;
    if (mapping.debitCol !== undefined || mapping.creditCol !== undefined) {
      const debit = mapping.debitCol !== undefined ? parseNum(cells[mapping.debitCol] ?? "") : 0;
      const credit = mapping.creditCol !== undefined ? parseNum(cells[mapping.creditCol] ?? "") : 0;
      if (debit > 0) amount = -Math.abs(debit);
      else if (credit > 0) amount = Math.abs(credit);
      else continue; // skip empty rows
    } else if (mapping.amountCol !== undefined) {
      amount = parseNum(cells[mapping.amountCol] ?? "");
      if (amount === 0) continue;
    } else {
      continue;
    }
    out.push({ date, description, amount });
  }
  return out;
}

const MDY_RE = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function isTdHeaderlessRow(row: string[]): boolean {
  if (!row || row.length !== 5) return false;
  const d = (row[0] ?? "").trim();
  if (!MDY_RE.test(d) && !ISO_RE.test(d)) return false;
  const numOrEmpty = (s: string) => {
    const v = (s ?? "").replace(/[$,\s()]/g, "");
    return v === "" || /^-?\d+(\.\d+)?$/.test(v);
  };
  return (
    numOrEmpty(row[2]) &&
    numOrEmpty(row[3]) &&
    numOrEmpty(row[4]) &&
    (row[4] ?? "").trim() !== ""
  );
}

export function parseStatementCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return {
      format: "UNKNOWN", formatLabel: "Empty file",
      headers: [], rows: [], mapping: { dateCol: -1, descCol: -1 }, parsed: [],
    };
  }
  const allRows = lines.map(splitCsvLine);

  // Headerless TD Canada Trust: 5 cols, first col MM/DD/YYYY or YYYY-MM-DD
  if (isTdHeaderlessRow(allRows[0])) {
    const mapping: CsvMapping = { dateCol: 0, descCol: 1, debitCol: 2, creditCol: 3, balanceCol: 4 };
    const headers = ["Date", "Description", "Debit", "Credit", "Balance"];
    const parsed = applyCsvMapping(allRows, mapping, { preferMDY: true });
    return {
      format: "TD",
      formatLabel: "TD Canada Trust format (no headers)",
      headers,
      rows: allRows,
      mapping,
      parsed,
      headerless: true,
    };
  }

  const headers = allRows[0];
  const rows = lines.slice(1).map(splitCsvLine);
  const { format, formatLabel, mapping } = detectCsvMapping(headers);
  const parsed = applyCsvMapping(rows, mapping);
  return { format, formatLabel, headers, rows, mapping, parsed, headerless: false };
}