const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Segment {
  start_page: number;
  end_page: number;
  type: string;
  suggested_label?: string | null;
  owner_name?: string | null;
  owner_evidence?: string | null;
  confidence?: number;
  reason?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const filename = String(body?.filename ?? "").slice(0, 300);
    const totalPages = Number(body?.total_pages ?? 0);
    const allowed: string[] = Array.isArray(body?.allowed_types)
      ? body.allowed_types.slice(0, 60).map((s: unknown) => String(s)).filter(Boolean)
      : [];
    const casePeople: string[] = Array.isArray(body?.case_people)
      ? body.case_people.filter((n: unknown) => typeof n === "string" && n.trim()).slice(0, 12)
      : [];
    const pageSnippets: string[] = Array.isArray(body?.page_snippets)
      ? body.page_snippets.slice(0, 60).map((s: unknown) => String(s ?? "").slice(0, 1200))
      : [];
    const pageImages: string[] = Array.isArray(body?.page_image_data_urls)
      ? body.page_image_data_urls
          .filter((u: unknown) => typeof u === "string" && (u as string).startsWith("data:image/"))
          .slice(0, 30)
      : [];

    if (!filename || !totalPages || allowed.length === 0) {
      return json({ error: "missing fields" }, 400);
    }
    if (totalPages < 2) {
      return json({ segments: [{ start_page: 1, end_page: totalPages || 1, type: "Other", confidence: 0 }] });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ segments: [{ start_page: 1, end_page: totalPages, type: "Other", confidence: 0, reason: "no_api_key" }] });
    }

    const pageLines = Array.from({ length: totalPages }, (_, i) => {
      const txt = (pageSnippets[i] ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
      return `--- PAGE ${i + 1} ---\n${txt || "(no text layer; rely on image)"}`;
    }).join("\n");

    const sys =
      "You are a document binder splitter for immigration / study-abroad case files. The user uploaded ONE PDF that may contain MULTIPLE distinct documents (passport scan, transcripts, IELTS TRF, bank statements, SOP, photos, etc.) concatenated together. Identify where each document starts and ends, and classify each segment.\n\n" +
      "Rules:\n" +
      "1. Output strict JSON: {\"segments\":[{\"start_page\":N,\"end_page\":N,\"type\":\"<allowed>\",\"suggested_label\":<string|null>,\"owner_name\":<string|null>,\"owner_evidence\":<string|null>,\"confidence\":0..1,\"reason\":<string>}]}.\n" +
      "2. Pages are 1-based and inclusive. Segments must be contiguous, non-overlapping, and cover EVERY page from 1 to total_pages exactly once.\n" +
      "3. type must be one of allowed_types. Use \"Other\" only if nothing matches; then provide a short suggested_label.\n" +
      "4. owner_name must come from the visible content of THAT segment (passport MRZ, transcript header, IELTS Candidate Details, bank account holder). NEVER infer from filename. Return null if not visible.\n" +
      "5. Prefer fewer, longer segments over over-splitting. Do not split a single multi-page document (e.g. a 4-page transcript or 12-page bank statement).\n" +
      "6. Boundary signals: change of letterhead, change of person name, page-1 indicators (\"Page 1 of N\", new title/heading, fresh MRZ block, new logo).\n" +
      "7. Keep accompanying photos/cover pages with their parent document when clearly part of it.\n" +
      "8. If consecutive pages show DIFFERENT letterheads, brand marks, or document formats, return them as SEPARATE segments — even when the PDF only has 2 pages. A merged PDF that contains e.g. a Pearson PTE score report on page 1 and a Provincial Attestation Letter on page 2 MUST come back as two segments.\n" +
      "9. Canonical type hints (use these exact values when present in allowed_types):\n" +
      "   - English Language Proficiency Test → PTE Academic / Pearson Test of English / IELTS / TOEFL / CELPIP / Duolingo English Test (suggested_label: \"PTE Result\", \"IELTS Result\", \"TOEFL Result\", \"CELPIP Result\", or \"Duolingo Result\").\n" +
      "   - Provincial Attestation Letter → any \"Provincial Attestation Letter\" / \"PAL\" / \"Allocation of PAL\" issued by a Canadian province (suggested_label: \"PAL Letter\").\n" +
      "   - Passport → biographic page with MRZ.\n" +
      "   - Academic Transcripts → marksheets, transcripts, consolidated grade reports.\n" +
      "   - Offer Letter → letter of acceptance / admission letter.";

    const rosterLine = casePeople.length
      ? `\nPeople expected on this case (roster): ${JSON.stringify(casePeople)}. owner_name should match one of these when the document genuinely belongs to that person; otherwise return the actual name from the document.`
      : "";

    const userText =
      `Filename: ${filename} (HINT ONLY — never use for owner_name)\n` +
      `Total pages: ${totalPages}\n` +
      `Allowed types: ${JSON.stringify(allowed)}${rosterLine}\n\n` +
      `Per-page extracted text (may be empty for scans; images attached when available):\n${pageLines}\n\n` +
      `Return ONLY the JSON object. Segments MUST cover pages 1..${totalPages} contiguously.`;

    const userContent: unknown[] = [{ type: "text", text: userText }];
    for (let i = 0; i < pageImages.length; i++) {
      userContent.push({ type: "text", text: `Image of page ${i + 1}:` });
      userContent.push({ type: "image_url", image_url: { url: pageImages[i] } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      return json({ segments: [{ start_page: 1, end_page: totalPages, type: "Other", confidence: 0, reason: "rate_limited" }] });
    }
    if (resp.status === 402) {
      return json({ segments: [{ start_page: 1, end_page: totalPages, type: "Other", confidence: 0, reason: "no_credits" }] });
    }
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return json({ segments: [{ start_page: 1, end_page: totalPages, type: "Other", confidence: 0, reason: `ai_error:${resp.status}`, detail: t.slice(0, 300) }] });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { segments?: Segment[] } = {};
    try { parsed = JSON.parse(content); } catch { /* ignore */ }

    const raw = Array.isArray(parsed.segments) ? parsed.segments : [];
    const cleaned = sanitizeSegments(raw, totalPages, allowed);
    return json({ segments: cleaned });
  } catch (e) {
    return json({ segments: [], error: e instanceof Error ? e.message : "unknown" }, 200);
  }
});

function sanitizeSegments(raw: Segment[], totalPages: number, allowed: string[]): Segment[] {
  if (!raw.length) {
    return [{ start_page: 1, end_page: totalPages, type: "Other", confidence: 0, reason: "empty" }];
  }
  const norm = raw
    .map((s) => {
      const start = clamp(Math.floor(Number(s.start_page) || 1), 1, totalPages);
      const end = clamp(Math.floor(Number(s.end_page) || start), start, totalPages);
      const type = typeof s.type === "string" && allowed.includes(s.type) ? s.type : "Other";
      return {
        start_page: start,
        end_page: end,
        type,
        suggested_label: typeof s.suggested_label === "string" ? s.suggested_label.slice(0, 80) : null,
        owner_name: typeof s.owner_name === "string" && s.owner_name.trim() ? s.owner_name.trim().slice(0, 120) : null,
        owner_evidence: typeof s.owner_evidence === "string" && s.owner_evidence.trim() ? s.owner_evidence.trim().slice(0, 240) : null,
        confidence: typeof s.confidence === "number" ? clamp(s.confidence, 0, 1) : 0.5,
        reason: typeof s.reason === "string" ? s.reason.slice(0, 200) : null,
      } as Segment;
    })
    .sort((a, b) => a.start_page - b.start_page);

  const fixed: Segment[] = [];
  let cursor = 1;
  for (const s of norm) {
    if (s.end_page < cursor) continue;
    const start = Math.max(s.start_page, cursor);
    const end = Math.min(s.end_page, totalPages);
    if (start > end) continue;
    if (start > cursor) {
      fixed.push({
        start_page: cursor, end_page: start - 1, type: "Other",
        suggested_label: null, owner_name: null, owner_evidence: null,
        confidence: 0.2, reason: "gap_filler",
      });
    }
    fixed.push({ ...s, start_page: start, end_page: end });
    cursor = end + 1;
    if (cursor > totalPages) break;
  }
  if (cursor <= totalPages) {
    fixed.push({
      start_page: cursor, end_page: totalPages, type: "Other",
      suggested_label: null, owner_name: null, owner_evidence: null,
      confidence: 0.2, reason: "tail_filler",
    });
  }
  return fixed;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
