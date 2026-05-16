import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  reference?: string;
}

interface StatementMeta {
  statementFrom?: string;
  statementTo?: string;
  openingBalance?: number;
  closingBalance?: number;
  cardLast4?: string;
  cardHolderName?: string;
  currency?: string;
}

const SYSTEM_PROMPT =
  "You are a financial document extraction specialist. Extract all transaction lines from this credit card statement image. Return ONLY valid JSON, no markdown, no explanation.";

const USER_PROMPT = `Extract all transactions from this credit card statement page.
Return JSON with this exact schema:
{
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "merchant name", "amount": 0, "reference": "optional" }
  ],
  "meta": {
    "statementFrom": "YYYY-MM-DD",
    "statementTo": "YYYY-MM-DD",
    "openingBalance": 0,
    "closingBalance": 0,
    "cardLast4": "1234",
    "cardHolderName": "Name",
    "currency": "CAD"
  }
}
Rules:
- amount is positive for charges/debits, negative for payments/credits to card.
- Omit a meta field if not visible on this page.
- Skip page totals, interest summary rows, and section headers; only real transactions.
- Use YYYY-MM-DD dates; infer year from statement period if abbreviated.`;

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function safeParse(text: string): any | null {
  if (!text) return null;
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

async function callGemini(
  apiKey: string,
  base64Jpeg: string,
  context: { cardHolderName?: string; cardLast4?: string; currency?: string },
): Promise<{ ok: boolean; raw: string; status: number }> {
  const dataUrl = base64Jpeg.startsWith("data:")
    ? base64Jpeg
    : `data:image/jpeg;base64,${base64Jpeg}`;

  const ctxLines = [
    context.cardHolderName ? `Card holder: ${context.cardHolderName}` : null,
    context.cardLast4 ? `Card last 4: ${context.cardLast4}` : null,
    context.currency ? `Currency: ${context.currency}` : null,
  ].filter(Boolean).join("\n");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT + (ctxLines ? `\n\nContext:\n${ctxLines}` : "") },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return { ok: false, raw: t, status: resp.status };
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { ok: true, raw: text, status: 200 };
}

function dedupe(rows: ExtractedTransaction[]): ExtractedTransaction[] {
  const seen = new Set<string>();
  const out: ExtractedTransaction[] = [];
  for (const r of rows) {
    const key = `${r.date}|${Math.round(r.amount * 100)}|${(r.description || "").toLowerCase().slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function normaliseTx(raw: any): ExtractedTransaction | null {
  if (!raw) return null;
  const date = String(raw.date ?? "").trim();
  const description = String(raw.description ?? "").trim();
  const amount = Number(raw.amount);
  if (!date || !description || !Number.isFinite(amount)) return null;
  return {
    date,
    description,
    amount,
    reference: raw.reference ? String(raw.reference) : undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, transactions: [], meta: {}, pageCount: 0, errors: ["LOVABLE_API_KEY not configured"] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const pages: string[] = Array.isArray(body?.pages) ? body.pages.slice(0, 10) : [];
    const cardHolderName: string | undefined = body?.cardHolderName;
    const cardLast4: string | undefined = body?.cardLast4;
    const currency: string | undefined = body?.currency;

    if (!pages.length) {
      return new Response(JSON.stringify({ success: false, transactions: [], meta: {}, pageCount: 0, errors: ["No pages provided"] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allTx: ExtractedTransaction[] = [];
    const errors: string[] = [];
    let mergedMeta: StatementMeta = {};
    let rateLimited = false;
    let paymentRequired = false;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      let parsed: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await callGemini(apiKey, page, { cardHolderName, cardLast4, currency });
        if (!r.ok) {
          if (r.status === 429) rateLimited = true;
          if (r.status === 402) paymentRequired = true;
          errors.push(`Page ${i + 1}: gateway ${r.status}`);
          break;
        }
        parsed = safeParse(r.raw);
        if (parsed) break;
        if (attempt === 1) errors.push(`Page ${i + 1}: invalid JSON after retry`);
      }
      if (!parsed) continue;

      const txArr: any[] = Array.isArray(parsed.transactions) ? parsed.transactions : [];
      for (const t of txArr) {
        const norm = normaliseTx(t);
        if (norm) allTx.push(norm);
      }
      const meta = parsed.meta ?? {};
      mergedMeta = {
        statementFrom: mergedMeta.statementFrom ?? meta.statementFrom,
        statementTo: mergedMeta.statementTo ?? meta.statementTo,
        openingBalance: mergedMeta.openingBalance ?? (Number.isFinite(Number(meta.openingBalance)) ? Number(meta.openingBalance) : undefined),
        closingBalance: mergedMeta.closingBalance ?? (Number.isFinite(Number(meta.closingBalance)) ? Number(meta.closingBalance) : undefined),
        cardLast4: mergedMeta.cardLast4 ?? meta.cardLast4,
        cardHolderName: mergedMeta.cardHolderName ?? meta.cardHolderName,
        currency: mergedMeta.currency ?? meta.currency,
      };
    }

    if (rateLimited) errors.push("Rate limit hit on Lovable AI — try again shortly.");
    if (paymentRequired) errors.push("AI credits exhausted — add credits in Settings → Workspace → Usage.");

    const transactions = dedupe(allTx).sort((a, b) => a.date.localeCompare(b.date));

    return new Response(JSON.stringify({
      success: transactions.length > 0,
      transactions,
      meta: mergedMeta,
      pageCount: pages.length,
      errors: errors.length ? errors : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-card-statement error:", e);
    return new Response(JSON.stringify({
      success: false,
      transactions: [],
      meta: {},
      pageCount: 0,
      errors: [e instanceof Error ? e.message : "Unknown error"],
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});