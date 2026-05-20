import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  extractFileText,
  buildAiContent,
  extractPdfPages,
  renderPdfPageBase64,
  buildMultiImageContent,
} from "../_shared/extractFileText.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FAST_MODEL = "google/gemini-3-flash-preview";
const PRO_MODEL = "google/gemini-2.5-pro";
const PAGES_PER_CHUNK = 3;
const PASS1_CONCURRENCY = 6;
const PASS2_CONCURRENCY = 4;

const ENUM_TOOL = {
  type: "function",
  function: {
    name: "list_programs",
    description: "Enumerate every distinct academic program/course visible on these pages. Be exhaustive — include every degree, diploma, certificate, major, and minor. Same program at multiple campuses or levels = multiple entries.",
    parameters: {
      type: "object",
      properties: {
        programs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              course_title: { type: "string", description: "The program/course title as printed" },
              program_level: { type: "string", description: "e.g. Bachelor, Master, Diploma, Certificate, PhD" },
              campus_name: { type: "string" },
              page_number: { type: "number", description: "1-indexed page where this program appears within this chunk" },
            },
            required: ["course_title"],
            additionalProperties: false,
          },
        },
      },
      required: ["programs"],
      additionalProperties: false,
    },
  },
};

const COURSE_TOOL = {
  type: "function",
  function: {
    name: "extract_courses",
    description: "Extract every distinct course/program present in the uploaded document. For each, fill any field you can confidently infer; leave others null.",
    parameters: {
      type: "object",
      properties: {
        courses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              course_title: { type: "string" },
              program_level: { type: "string" },
              field_of_study: { type: "string" },
              specialization: { type: "string" },
              duration_value: { type: "number" },
              duration_unit: { type: "string" },
              tuition_fee: { type: "number" },
              currency: { type: "string" },
              application_fee: { type: "number" },
              intake_months: { type: "array", items: { type: "string" } },
              ielts_overall: { type: "number" },
              pte_overall: { type: "number" },
              toefl_overall: { type: "number" },
              duolingo_overall: { type: "number" },
              gpa_requirement: { type: "string" },
              is_pgwp_eligible: { type: "boolean" },
              is_coop: { type: "boolean" },
              campus_name: { type: "string" },
              city: { type: "string" },
              course_description: { type: "string" },
              confidence_score: { type: "number" },
            },
            required: ["course_title"],
            additionalProperties: true,
          },
        },
      },
      required: ["courses"],
    },
  },
};

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function callAiTool(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: any,
  tool: any,
  retries = 1,
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });
    if (r.ok) {
      const j = await r.json();
      const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return null;
      try { return JSON.parse(args); } catch { return null; }
    }
    if (r.status === 402) throw new Error("AI credits exhausted (402)");
    if (r.status === 429 && attempt < retries) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    const t = await r.text().catch(() => "");
    throw new Error(`AI ${r.status}: ${t.slice(0, 200)}`);
  }
  return null;
}

async function pMap<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

const ENUM_SYSTEM = "You enumerate academic programs from institution brochures, prospectuses, and program tables. Be exhaustive: capture every distinct program, including duplicates across campuses or levels. Do not invent programs. Only return what you can see in the supplied pages.";
const ENRICH_SYSTEM = "You enrich a known list of academic programs with details (fees, durations, English requirements, intakes, campus). Never invent numeric fields; leave them null if not present on the page.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();
  try {
    const { document_id, institution_id } = await req.json();
    if (!document_id || !institution_id) throw new Error("document_id and institution_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc, error: dErr } = await supabase
      .from("upi_uploaded_documents").select("*").eq("id", document_id).single();
    if (dErr || !doc) throw new Error("Document not found");

    await supabase.from("upi_uploaded_documents").update({ review_status: "processing" }).eq("id", document_id);

    // ---- Load file ----
    if (!doc.file_path) throw new Error("Document has no file_path");
    const { data: file } = await supabase.storage.from("institution-documents").download(doc.file_path);
    if (!file) throw new Error("Failed to download file from storage");
    const isPdf = (doc.mime_type ?? "").toLowerCase().includes("pdf") ||
                  (doc.file_name ?? "").toLowerCase().endsWith(".pdf");

    // ---- Build chunks ----
    type Chunk = { from: number; to: number; text: string; needsImage: boolean };
    const chunks: Chunk[] = [];
    let pageCount = 0;
    let pagesWithText = 0;
    let modelMix = { fast: 0, pro: 0, vision: 0 };

    if (isPdf) {
      const pagesRes = await extractPdfPages(file);
      pageCount = pagesRes.pageCount;
      pagesWithText = pagesRes.pages.filter((p) => p.length >= 50).length;
      for (let from = 1; from <= pageCount; from += PAGES_PER_CHUNK) {
        const to = Math.min(from + PAGES_PER_CHUNK - 1, pageCount);
        const slice = pagesRes.pages.slice(from - 1, to);
        const text = slice.map((t, i) => `--- PAGE ${from + i} ---\n${t}`).join("\n\n");
        const needsImage = slice.every((t) => t.trim().length < 50);
        chunks.push({ from, to, text, needsImage });
      }
    } else {
      // Non-PDF: fall back to flat text via extractFileText, one chunk
      const extracted = await extractFileText(file, { mime: doc.mime_type, fileName: doc.file_name });
      pageCount = extracted.pageCount ?? 1;
      pagesWithText = extracted.text.length >= 50 ? pageCount : 0;
      chunks.push({ from: 1, to: pageCount, text: extracted.text.slice(0, 80000), needsImage: false });
    }

    if (chunks.length === 0) throw new Error("No pages to process");

    // ---- PASS 1: enumerate per chunk in parallel ----
    const pass1Results = await pMap(chunks, PASS1_CONCURRENCY, async (chunk) => {
      try {
        let content: any;
        if (chunk.needsImage && isPdf) {
          const images: Array<{ mime: string; base64: string }> = [];
          for (let p = chunk.from; p <= chunk.to; p++) {
            const img = await renderPdfPageBase64(file, p, 1.5);
            if (img) images.push(img);
          }
          modelMix.vision += images.length;
          const prompt = `Document: ${doc.file_name}\nPages ${chunk.from}–${chunk.to} (scanned/graphical — see images). Enumerate every distinct academic program visible. Set page_number relative to this chunk (1 = first image).`;
          content = buildMultiImageContent(prompt, images);
        } else {
          modelMix.fast += 1;
          content = `Document: ${doc.file_name}\nPages ${chunk.from}–${chunk.to}.\n\n${chunk.text || "(no embedded text)"}`;
        }
        const parsed = await callAiTool(LOVABLE_API_KEY, FAST_MODEL, ENUM_SYSTEM, content, ENUM_TOOL, 1);
        const arr = Array.isArray(parsed?.programs) ? parsed.programs : [];
        return { chunk, programs: arr, ok: true };
      } catch (e) {
        return { chunk, programs: [], ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    });

    const pagesSucceeded = new Set<number>();
    const pagesFailed = new Set<number>();
    const skeleton: Array<{ course_title: string; program_level?: string; campus_name?: string; page_number: number }> = [];
    for (const r of pass1Results) {
      if (!r.ok) {
        for (let p = r.chunk.from; p <= r.chunk.to; p++) pagesFailed.add(p);
        continue;
      }
      for (let p = r.chunk.from; p <= r.chunk.to; p++) pagesSucceeded.add(p);
      for (const prog of r.programs) {
        const title = String(prog.course_title ?? "").trim();
        if (!title) continue;
        const rel = Number(prog.page_number) || 1;
        const absPage = r.chunk.from + Math.max(0, rel - 1);
        skeleton.push({
          course_title: title,
          program_level: prog.program_level ?? undefined,
          campus_name: prog.campus_name ?? undefined,
          page_number: absPage,
        });
      }
    }

    // Dedupe skeleton by (lower title + level + campus)
    const skelKey = (p: any) =>
      `${p.course_title.toLowerCase().trim()}|${(p.program_level ?? "").toLowerCase().trim()}|${(p.campus_name ?? "").toLowerCase().trim()}`;
    const skelByKey = new Map<string, typeof skeleton[number]>();
    for (const p of skeleton) {
      const k = skelKey(p);
      if (!skelByKey.has(k)) skelByKey.set(k, p);
    }
    const skeletonUnique = Array.from(skelByKey.values());

    // ---- PASS 2: enrich, grouped by chunk for batched context ----
    type EnrichGroup = { chunk: Chunk; programs: typeof skeletonUnique };
    const groups: EnrichGroup[] = [];
    for (const r of pass1Results) {
      const programsInChunk = skeletonUnique.filter(
        (p) => p.page_number >= r.chunk.from && p.page_number <= r.chunk.to,
      );
      if (programsInChunk.length > 0) groups.push({ chunk: r.chunk, programs: programsInChunk });
    }

    const allEnriched: any[] = [];
    const enrichResults = await pMap(groups, PASS2_CONCURRENCY, async ({ chunk, programs }) => {
      try {
        // Use Pro model for dense chunks (many programs) for better recall on detail fields
        const model = programs.length > 15 ? PRO_MODEL : FAST_MODEL;
        if (model === PRO_MODEL) modelMix.pro += 1; else modelMix.fast += 1;
        const titles = programs.map((p, idx) =>
          `${idx + 1}. ${p.course_title}${p.program_level ? ` (${p.program_level})` : ""}${p.campus_name ? ` @ ${p.campus_name}` : ""}`,
        ).join("\n");
        const userText = `Document: ${doc.file_name}\nPages ${chunk.from}–${chunk.to}.\n\nKNOWN PROGRAMS ON THESE PAGES (enrich each one — return one row per program; keep titles verbatim):\n${titles}\n\n--- PAGE TEXT ---\n${chunk.text || "(no embedded text; rely on the program list above)"}`;
        let content: any = userText;
        if (chunk.needsImage && isPdf) {
          const images: Array<{ mime: string; base64: string }> = [];
          for (let p = chunk.from; p <= chunk.to; p++) {
            const img = await renderPdfPageBase64(file, p, 1.5);
            if (img) images.push(img);
          }
          content = buildMultiImageContent(userText, images);
        }
        const parsed = await callAiTool(LOVABLE_API_KEY, model, ENRICH_SYSTEM, content, COURSE_TOOL, 1);
        const arr = Array.isArray(parsed?.courses) ? parsed.courses : [];
        return arr.map((c: any) => ({ ...c, _page: chunk.from }));
      } catch (e) {
        // Fall back to the skeleton (title-only) so we don't lose programs
        return programs.map((p) => ({
          course_title: p.course_title,
          program_level: p.program_level ?? null,
          campus_name: p.campus_name ?? null,
          confidence_score: 30,
          _page: chunk.from,
          _enrichment_failed: true,
          _enrichment_error: e instanceof Error ? e.message : String(e),
        }));
      }
    });
    for (const arr of enrichResults) allEnriched.push(...arr);

    // Normalize confidence scores
    const courses = allEnriched.map((c) => {
      const raw = Number(c.confidence_score);
      const cs = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 60;
      const { _page, _enrichment_failed, _enrichment_error, ...clean } = c;
      return { ...clean, confidence_score: cs };
    });

    // ---- Upsert ----
    let upserted = 0;
    if (courses.length > 0) {
      const tagged = courses.map((c) => ({
        ...c,
        source_document_id: document_id,
        source_document_name: doc.file_name,
      }));
      const { data: upRes } = await supabase.functions.invoke("upi-upsert-courses", {
        body: { courses: tagged, institution_id, source_id: doc.source_id ?? undefined },
      });
      upserted = (upRes as any)?.upserted ?? 0;
    }

    // ---- Honest confidence ----
    const avgConfidence = courses.length
      ? Math.round(courses.reduce((s, c) => s + Number(c.confidence_score ?? 0), 0) / courses.length)
      : 0;
    const coverage = pageCount > 0 ? pagesSucceeded.size / pageCount : 0;
    const coverageWeighted = Math.round(avgConfidence * Math.max(0.3, coverage));
    const docConfidence = coverage < 0.8 ? Math.min(70, coverageWeighted) : coverageWeighted;
    const runMs = Date.now() - startedAt;

    const extractionMeta = {
      pageCount,
      pagesSucceeded: pagesSucceeded.size,
      pagesFailed: Array.from(pagesFailed),
      pagesWithText,
      programsFound: courses.length,
      programsUpserted: upserted,
      runMs,
      modelMix,
      version: 2,
    };

    const reviewStatus = courses.length === 0 || coverage < 0.8 ? "needs_review" : "approved";

    // Preserve existing metadata while merging extraction_meta
    const mergedMetadata = { ...((doc.metadata as any) ?? {}), extraction_meta: extractionMeta };

    await supabase.from("upi_uploaded_documents")
      .update({
        is_processed: true,
        confidence_score: docConfidence,
        review_status: reviewStatus,
        page_count: pageCount,
        metadata: mergedMetadata,
      })
      .eq("id", document_id);

    return new Response(JSON.stringify({
      ok: true,
      found: courses.length,
      upserted,
      confidence: docConfidence,
      pageCount,
      pagesSucceeded: pagesSucceeded.size,
      pagesFailed: Array.from(pagesFailed),
      runMs,
      modelMix,
      extraction_meta: extractionMeta,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});