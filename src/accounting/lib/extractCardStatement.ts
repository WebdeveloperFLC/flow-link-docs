import { rasterizePdfToJpegs, imageFileToJpegDataUrl } from "@/lib/extractFirstPageText";
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

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-card-statement`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
      const resp = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY } : {}),
        },
        body: JSON.stringify({ pages: batch, ...options }),
        signal,
      });
      const data = await resp.json();
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
    id: (crypto as any).randomUUID?.() ?? `cl-${Math.random().toString(36).slice(2)}`,
    date: t.date,
    description: t.description,
    amount: Math.abs(t.amount),
    category: "UNCATEGORISED",
    isPersonal: false,
    merchantName: guessedMerchant(t.description),
    notes: "",
  }));
}