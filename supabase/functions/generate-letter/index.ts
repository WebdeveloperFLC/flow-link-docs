// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Kind = "cover" | "rcic" | "statdec";

const TITLES: Record<Kind, string> = {
  cover: "Applicant Letter of Explanation",
  rcic: "RCIC Submission Letter",
  statdec: "Statutory Declaration",
};

const SYSTEM_FOR: Record<Kind, string> = {
  cover:
    "You are an immigration consultant drafting an Applicant's Letter of Explanation to IRCC. Mirror the structure, tone and section headings of the SAMPLE LETTER provided. Replace the sample's specific facts with the CLIENT FACTS. Use the client's own voice (first person, signed by the client). Do NOT invent facts that are not present in CLIENT FACTS or DOCUMENT EXTRACTS. Where a needed detail is missing, write the phrase [MISSING: <field name>] instead of guessing. Output Markdown with `#`/`##` headings, `-` bullets, and **bold** for emphasis. Always include: addressee block (To: The Visa Officer, IRCC), Subject line, numbered body sections, Conclusion, and a signature line with the applicant name(s).",
  rcic:
    "You are a Regulated Canadian Immigration Consultant (RCIC) drafting a submission letter to IRCC on behalf of an applicant. Mirror the structure, tone and section headings of the SAMPLE LETTER. Replace the sample's specific facts with the CLIENT FACTS. Sign as the firm's RCIC using the firm.rcic_name and firm.rcic_number from CLIENT FACTS. Do NOT invent facts; use [MISSING: <field name>] for unknowns. Output Markdown. Always include: Date, From block (RCIC name + R# from firm), To block (Visa Officer, IRCC), Subject, Applicant block, numbered sections, Conclusion, and 'Yours faithfully,' signature with RCIC name and R#.",
  statdec:
    "You are drafting a Statutory Declaration in the Canadian legal format. Mirror the layout, oath language and numbered clauses of the SAMPLE. Replace specific facts with CLIENT FACTS. Do NOT invent facts; use [MISSING: <field name>] for unknowns. Output Markdown. ALWAYS preserve the legal header in the exact form 'CANADA }', 'Province of <X> }', 'City of <X> }' on separate lines, the 'I, <NAME> ... DO SOLEMNLY DECLARE THAT:' opener, numbered solemn clauses, the 'AND I make this solemn declaration ... Canada Evidence Act' closer, and the 'DECLARED BEFORE ME' / 'Commissioner of Oaths' / declarant signature footer.",
};

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build a single <w:p> for a paragraph, supporting **bold** runs and a heading style. */
function buildParagraph(text: string, opts: { heading?: 1 | 2; bold?: boolean; bullet?: boolean } = {}): string {
  const { heading, bold, bullet } = opts;
  const styleParts: string[] = [];
  if (heading === 1) styleParts.push('<w:pStyle w:val="Heading1"/>');
  if (heading === 2) styleParts.push('<w:pStyle w:val="Heading2"/>');
  if (bullet) styleParts.push('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
  const pPr = styleParts.length ? `<w:pPr>${styleParts.join("")}</w:pPr>` : "";

  // Tokenize **bold** and [MISSING: ...] for highlight
  const runs: string[] = [];
  const re = /(\*\*[^*]+\*\*|\[MISSING:[^\]]+\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(plainRun(text.slice(last, m.index), { bold }));
    const tok = m[0];
    if (tok.startsWith("**")) {
      runs.push(plainRun(tok.slice(2, -2), { bold: true }));
    } else {
      runs.push(plainRun(tok, { bold: true, highlight: "yellow" }));
    }
    last = re.lastIndex;
  }
  if (last < text.length) runs.push(plainRun(text.slice(last), { bold }));
  if (runs.length === 0) runs.push(plainRun("", {}));

  return `<w:p>${pPr}${runs.join("")}</w:p>`;
}

function plainRun(text: string, opts: { bold?: boolean; highlight?: string }): string {
  const rPr: string[] = [];
  if (opts.bold) rPr.push("<w:b/><w:bCs/>");
  if (opts.highlight) rPr.push(`<w:highlight w:val="${opts.highlight}"/>`);
  const rPrXml = rPr.length ? `<w:rPr>${rPr.join("")}</w:rPr>` : "";
  return `<w:r>${rPrXml}<w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}

function markdownToParagraphs(md: string): string[] {
  // Strip any stray HTML tags the model may emit (e.g. <br>, <br/>, <p>) — we render plain paragraphs
  const cleaned = md
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/<\/?div[^>]*>/gi, "");
  const lines = cleaned.split("\n");
  const paras: string[] = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") { paras.push(buildParagraph("")); continue; }
    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) { paras.push(buildParagraph(h1[1], { heading: 1, bold: true })); continue; }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) { paras.push(buildParagraph(h2[1], { heading: 2, bold: true })); continue; }
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) { paras.push(buildParagraph(h3[1], { heading: 2, bold: true })); continue; }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) { paras.push(buildParagraph(bullet[1], { bullet: true })); continue; }
    const num = line.match(/^\d+\.\s+(.*)$/);
    if (num) { paras.push(buildParagraph(line, {})); continue; }
    paras.push(buildParagraph(line, {}));
  }
  return paras;
}

function buildDocx(title: string, markdown: string, logoPng?: Uint8Array): Promise<Uint8Array> {
  const paragraphs = markdownToParagraphs(markdown);
  let logoParagraph = "";
  if (logoPng && logoPng.byteLength > 0) {
    const cx = 2286000; // 2.5"
    const cy = 685800;  // ~0.75"
    logoParagraph = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="FirmLogo"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="FirmLogo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId10"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:p/>`;
  }
  const body = logoParagraph + paragraphs.join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${body}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:pPr><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:pPr><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr></w:style>
</w:styles>`;

  const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${logoPng && logoPng.byteLength > 0 ? '<Default Extension="png" ContentType="image/png"/>' : ""}
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
${logoPng && logoPng.byteLength > 0 ? '<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/firm-logo.png"/>' : ""}
</Relationships>`;

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${escXml(title)}</dc:title><dc:creator>FutureLink Consultants</dc:creator><cp:lastModifiedBy>FutureLink Consultants</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")!.file(".rels", rels);
  zip.folder("docProps")!.file("core.xml", core);
  const word = zip.folder("word")!;
  word.file("document.xml", documentXml);
  word.file("styles.xml", stylesXml);
  word.file("numbering.xml", numberingXml);
  word.folder("_rels")!.file("document.xml.rels", documentRels);
  if (logoPng && logoPng.byteLength > 0) {
    word.folder("media")!.file("firm-logo.png", logoPng);
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (r.status === 429) throw new Error("AI rate-limited, try again shortly");
  if (r.status === 402) throw new Error("AI credits exhausted");
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`AI error ${r.status}: ${t.slice(0, 300)}`);
  }
  const data = await r.json();
  return (data?.choices?.[0]?.message?.content as string | undefined) ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(supaUrl, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind ?? "") as Kind;
    const clientId = String(body?.client_id ?? "");
    const extraInstructions = String(body?.extra_instructions ?? "").slice(0, 2000);
    if (!["cover", "rcic", "statdec"].includes(kind)) return json({ error: "invalid kind" }, 400);
    if (!clientId) return json({ error: "client_id required" }, 400);

    const { data: client } = await admin.from("clients").select("*").eq("id", clientId).maybeSingle();
    if (!client) return json({ error: "client not found" }, 404);

    // Active template — most-specific first, then fall back to global default
    const clientCountry: string | null = client.country ?? null;
    const clientCategory: string | null = client.application_type ?? null;
    const fetchTpl = async (country: string | null, category: string | null) => {
      let q = admin
        .from("letter_templates")
        .select("*")
        .eq("kind", kind)
        .eq("is_active", true);
      q = country === null ? q.is("country", null) : q.eq("country", country);
      q = category === null ? q.is("category", null) : q.eq("category", category);
      const { data } = await q.order("version", { ascending: false }).limit(1).maybeSingle();
      return data;
    };
    let tpl: any = null;
    let tplScope: { country: string | null; category: string | null } = { country: null, category: null };
    const tries: Array<[string | null, string | null]> = [
      [clientCountry, clientCategory],
      [clientCountry, null],
      [null, clientCategory],
      [null, null],
    ];
    for (const [c, cat] of tries) {
      tpl = await fetchTpl(c, cat);
      if (tpl?.style_text) { tplScope = { country: c, category: cat }; break; }
    }
    if (!tpl?.style_text) {
      return json({
        error: `No ${kind} template uploaded for ${clientCountry ?? "any country"} · ${clientCategory ?? "any category"}, and no global default exists. Please upload a sample in Letter templates.`,
      }, 400);
    }

    const { data: profile } = await admin.from("client_profile").select("*").eq("client_id", clientId).maybeSingle();
    const { data: firm } = await admin.from("firm_profile").select("*").limit(1).maybeSingle();
    const { data: docs } = await admin
      .from("client_documents")
      .select("id,document_type,custom_type,file_name,uploaded_at")
      .eq("client_id", clientId)
      .order("uploaded_at", { ascending: false });

    const factsObj = {
      client: {
        full_name: client.full_name,
        application_id: client.application_id,
        country: client.country,
        application_type: client.application_type,
        email: client.email,
        phone: client.phone,
      },
      profile: profile ?? {},
      firm: firm ?? {},
      uploaded_documents: (docs ?? []).map((d: any) => ({
        type: d.document_type === "Other" ? d.custom_type : d.document_type,
        file_name: d.file_name,
      })),
    };

    const userPrompt = [
      `=== SAMPLE ${TITLES[kind].toUpperCase()} (style and structure to mirror) ===`,
      tpl.style_text,
      "",
      "=== CLIENT FACTS (JSON) ===",
      JSON.stringify(factsObj, null, 2),
      "",
      extraInstructions ? `=== EXTRA INSTRUCTIONS ===\n${extraInstructions}\n` : "",
      "Now write the letter. Use Markdown only. Where a fact is missing, write [MISSING: <human field name>] verbatim.",
    ].join("\n");

    const md = await callAI(SYSTEM_FOR[kind], userPrompt);
    if (!md.trim()) return json({ error: "AI returned empty content" }, 500);

    // For RCIC letters, embed the firm logo as an inline letterhead at the top
    let logoBytes: Uint8Array | undefined;
    if (kind === "rcic" && firm?.logo_path) {
      try {
        const { data: logoBlob } = await admin.storage.from("branding").download(firm.logo_path);
        if (logoBlob) {
          const ab = await logoBlob.arrayBuffer();
          logoBytes = new Uint8Array(ab);
        }
      } catch (_e) { /* logo optional */ }
    }

    const docxBytes = await buildDocx(`${TITLES[kind]} - ${client.full_name}`, md, logoBytes);

    // Save to client-documents bucket under letters/
    const cleanName = String(client.full_name).replace(/[^a-zA-Z0-9]/g, "");
    const fileName = `${kind === "cover" ? "ApplicantLetter" : kind === "rcic" ? "RCICLetter" : "StatutoryDeclaration"}_${cleanName}_${Date.now()}.docx`;
    const path = `${clientId}/letters/${fileName}`;
    const { error: upErr } = await admin.storage
      .from("client-documents")
      .upload(path, docxBytes, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });
    if (upErr) throw upErr;

    // Insert into client_documents so it appears in the file list
    const { data: docRow, error: docErr } = await admin
      .from("client_documents")
      .insert({
        client_id: clientId,
        document_type: "Other",
        custom_type: `Letter: ${TITLES[kind]}`,
        file_name: fileName,
        storage_path: path,
        size_bytes: docxBytes.byteLength,
        mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        uploaded_by: userData.user.id,
        status: "uploaded",
      })
      .select("id")
      .single();
    if (docErr) throw docErr;

    // Activity log
    await admin.from("activity_logs").insert({
      user_id: userData.user.id,
      action: "letter.generated",
      entity_type: "client",
      entity_id: clientId,
      details: { kind, file_name: fileName, document_id: docRow?.id, template_scope: tplScope, template_version: tpl.version },
    });

    // Signed URL for immediate download
    const { data: signed } = await admin.storage.from("client-documents").createSignedUrl(path, 600);

    const missingMatches = Array.from(md.matchAll(/\[MISSING:\s*([^\]]+)\]/g)).map((m) => m[1].trim());
    const missing = Array.from(new Set(missingMatches));

    return json({
      ok: true,
      file_name: fileName,
      storage_path: path,
      document_id: docRow?.id,
      signed_url: signed?.signedUrl,
      missing_fields: missing,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});