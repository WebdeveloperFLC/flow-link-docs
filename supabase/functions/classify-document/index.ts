import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const filename = String(body?.filename ?? "").slice(0, 300);
    const snippet = String(body?.snippet ?? "").slice(0, 2000);
    const isImage = !!body?.is_image;
    const filenameTypeHint = typeof body?.filename_type_hint === "string" ? String(body.filename_type_hint).slice(0, 120) : null;
    const legacyPageImage = typeof body?.page_image_data_url === "string" && body.page_image_data_url.startsWith("data:image/") && body.page_image_data_url.length < 4_500_000
      ? body.page_image_data_url
      : "";
    const pageImageDataUrls: string[] = Array.isArray(body?.page_image_data_urls)
      ? body.page_image_data_urls
          .filter((u: unknown) => typeof u === "string" && (u as string).startsWith("data:image/") && (u as string).length < 4_500_000)
          .slice(0, 3)
      : (legacyPageImage ? [legacyPageImage] : []);
    // Server-side fallback for scanned/encrypted PDFs that pdf.js cannot render
    // in the browser. When present, attach the original PDF bytes so Gemini can
    // OCR them directly (same pattern as extract-document-data).
    const pdfDataUrl = typeof body?.pdf_data_url === "string"
        && body.pdf_data_url.startsWith("data:application/pdf")
        && body.pdf_data_url.length < 14_000_000
      ? String(body.pdf_data_url)
      : "";
    const allowed: string[] = Array.isArray(body?.allowed_types) ? body.allowed_types.slice(0, 50) : [];
    const casePeople: string[] = Array.isArray(body?.case_people)
      ? body.case_people.filter((n: unknown) => typeof n === "string" && n.trim()).slice(0, 10)
      : [];
    if (!filename || allowed.length === 0) return json({ error: "missing fields" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ type: "Other", confidence: 0, reason: "no_api_key" });

    const sys =
      "You classify uploaded immigration / study-abroad documents AND verify the person whose document it is. Respond ONLY with strict JSON: {\"type\":<one of allowed>,\"confidence\":0..1,\"type_evidence\":<short visible text proving the type or null>,\"suggested_label\":<string or null>,\"owner_name\":<full name found in document content or null>,\"owner_confidence\":0..1,\"owner_evidence\":<exact visible text/field proving the name or null>,\"owner_source\":<\"document_text\"|\"document_image\"|null>,\"reason\":<short>}.\n\nCRITICAL TYPE RULES:\n- The extracted text may be empty for SCANNED PDFs. In that case the page images are the source of truth — read them like OCR (logos, headers, MRZ blocks, table headings, stamps, labels).\n- You MUST pick the closest matching type from allowed_types whenever any visible evidence supports it (e.g., 'Republic of …' / MRZ / 'PASSPORT' → Passport; 'Test Report Form' / 'Candidate Details' / IELTS/TOEFL/PTE/Duolingo logos → the language-test type in allowed_types; transcript/marksheet/semester/CGPA → Academic Transcripts; bank statement/closing balance → Financial Documents; 'GIC' / 'Guaranteed Investment Certificate' → GIC Certificate).\n- Canonical type hints (use these exact values when present in allowed_types):\n  • English Language Proficiency Test → PTE Academic / Pearson Test of English / IELTS / TOEFL / CELPIP / Duolingo English Test (suggested_label: \"PTE Result\", \"IELTS Result\", \"TOEFL Result\", \"CELPIP Result\", or \"Duolingo Result\").\n  • Provincial Attestation Letter → any Canadian Provincial Attestation Letter / PAL / Allocation of PAL (suggested_label: \"PAL Letter\").\n- Use \"Other\" ONLY if NO visible evidence supports any allowed type, and set confidence ≤ 0.4 with a non-empty reason.\n- If you do return \"Other\", you MUST also fill suggested_label with a short human-readable type name based on what you actually see (e.g., 'Aadhaar', 'PAN Card', 'Cover Letter').\n- Output type MUST be one of allowed_types verbatim, otherwise the response is invalid.\n\nOWNER RULES:\n- Never use the filename as evidence for owner_name. The filename may be wrong.\n- owner_name must come only from the document text or provided document image/OCR.\n- For IELTS/language test forms, use Candidate Details / Family Name / First Name fields when visible.\n- Return owner_name null if the candidate/person name is not clearly visible in the document content.";

    const rosterLine = casePeople.length
      ? `\nPeople expected on this case (roster): ${JSON.stringify(casePeople)}. If the document's owner is clearly NOT one of these people, still return the actual name found on the document — do NOT guess one of the listed names. Only return a roster name if the document genuinely matches that person.`
      : "";
    const hasPdfBytes = !!pdfDataUrl;
    const isScanned = (pageImageDataUrls.length > 0 || hasPdfBytes) && snippet.replace(/\s+/g, "").length < 30;
    const user = `Allowed types: ${JSON.stringify(allowed)}\nFilename: ${filename} (use only as a document-type hint, NEVER for owner/candidate name)\nFilename type hint: ${filenameTypeHint ?? "none"}\nIs image upload: ${isImage}\nDocument images provided: ${pageImageDataUrls.length}\nOriginal PDF bytes attached: ${hasPdfBytes}\nLooks like a scanned PDF (no text layer): ${isScanned}${rosterLine}\nExtracted text from first pages (may be empty/garbled for scans):\n"""${snippet}"""\n\nReturn only JSON. If owner_name is not supported by document text or image, return owner_name:null, owner_confidence:0, owner_evidence:null, owner_source:null. If you choose \"Other\", confidence MUST be ≤ 0.4 and reason MUST explain why no allowed type matches.`;
    const parts: unknown[] = [{ type: "text", text: user }];
    if (hasPdfBytes) {
      parts.push({ type: "text", text: "Original PDF (read directly, OCR if scanned):" });
      parts.push({ type: "image_url", image_url: { url: pdfDataUrl } });
    }
    for (let i = 0; i < pageImageDataUrls.length; i++) {
      parts.push({ type: "text", text: `Image of page ${i + 1}:` });
      parts.push({ type: "image_url", image_url: { url: pageImageDataUrls[i] } });
    }
    const userContent = parts.length > 1 ? parts : user;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) return json({ type: "Other", confidence: 0, reason: "rate_limited" });
    if (resp.status === 402) return json({ type: "Other", confidence: 0, reason: "no_credits" });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return json({ type: "Other", confidence: 0, reason: `ai_error:${resp.status}`, detail: t.slice(0, 300) });
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { type?: string; confidence?: number; suggested_label?: string | null; owner_name?: string | null; owner_confidence?: number; owner_evidence?: string | null; owner_source?: string | null; reason?: string } = {};
    try { parsed = JSON.parse(content); } catch { /* keep empty */ }
    const type = parsed.type && allowed.includes(parsed.type) ? parsed.type : "Other";
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.4;
    return json({
      type,
      confidence,
      suggested_label: parsed.suggested_label ?? null,
      owner_name: typeof parsed.owner_name === "string" && parsed.owner_name.trim() ? parsed.owner_name.trim() : null,
      owner_confidence: typeof parsed.owner_confidence === "number" ? parsed.owner_confidence : 0,
      owner_evidence: typeof parsed.owner_evidence === "string" && parsed.owner_evidence.trim() ? parsed.owner_evidence.trim().slice(0, 300) : null,
      owner_source: parsed.owner_source === "document_text" || parsed.owner_source === "document_image" ? parsed.owner_source : null,
      reason: parsed.reason ?? null,
    });
  } catch (e) {
    return json({ type: "Other", confidence: 0, reason: e instanceof Error ? e.message : "unknown" });
  }
});