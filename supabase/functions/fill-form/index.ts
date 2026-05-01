import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  PDFDocument, PDFArray, PDFDict, PDFName, PDFStream, PDFRawStream, StandardFonts, rgb, PDFFont, PDFPage,
  decodePDFRawStream, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup,
} from "https://esm.sh/pdf-lib@1.17.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

type Field = {
  id: string; pdf_field?: string; label: string;
  type?: string; options?: string[]; max_length?: number;
};
type Section = { key: string; label: string; fields: Field[] };

/** Build a map: every plausible answer-key the questionnaire could have used → original PDF field name. */
function buildAnswerKeyToPdfField(sections: Section[]): Record<string, { pdfField: string; field: Field }> {
  const out: Record<string, { pdfField: string; field: Field }> = {};
  for (const s of sections) {
    for (const f of (s.fields ?? [])) {
      const pdfName = (f.pdf_field ?? f.id ?? "").toString();
      if (!pdfName) continue;
      const rawKey = (f.id ?? f.pdf_field ?? "").toString();
      const candidates = new Set<string>([
        `${s.key}.${rawKey}`,
        `${s.key}.${pdfName}`,
        rawKey,
        pdfName,
      ]);
      for (const k of candidates) if (k) out[k] = { pdfField: pdfName, field: f };
    }
  }
  return out;
}

function formatValue(v: unknown, f: Field): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  const t = (f.type ?? "text").toLowerCase();
  if (t === "date") {
    // Normalize to YYYY-MM-DD, leave non-ISO strings untouched.
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) s = `${m[1]}-${m[2]}-${m[3]}`;
  }
  if (f.max_length && s.length > f.max_length) s = s.slice(0, f.max_length);
  return s;
}

function splitDateParts(value: string): Record<string, string> | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  return { year: m[1], month: m[2], day: m[3] };
}

function legacyXfaTargets(answerKey: string, rawValue: string): Array<{ pdfField: string; value: string }> {
  const key = answerKey.toLowerCase().replace(/^[^.]+\./, "");
  const value = rawValue.trim();
  const date = splitDateParts(value);
  const [firstName, ...restName] = value.split(/\s+/).filter(Boolean);
  const familyName = restName.length ? restName.join(" ") : firstName;
  const givenName = restName.length ? firstName : "";
  const map: Record<string, Array<{ pdfField: string; value: string }>> = {
    full_name: [{ pdfField: "FamilyName", value: familyName.toUpperCase() }, { pdfField: "GivenName", value: givenName.toUpperCase() }],
    gender: [{ pdfField: "Sex", value }],
    nationality: [{ pdfField: "Citizenship", value }],
    place_of_birth: [{ pdfField: "PlaceBirthCity", value }],
    passport_number: [{ pdfField: "PassportNum", value: value.toUpperCase() }],
    marital_status: [{ pdfField: "MaritalStatus", value }],
    address_line1: [{ pdfField: "Streetname", value }],
    address_city: [{ pdfField: "CityTown", value }],
    address_state: [{ pdfField: "ProvinceState", value }],
    address_country: [{ pdfField: "Country", value }],
    address_postal: [{ pdfField: "PostalCode", value }],
    phone_alt: [{ pdfField: "ActualNumber", value }],
    email_alt: [{ pdfField: "Email", value }],
    highest_qualification: [{ pdfField: "FieldOfStudy", value }],
    institution_name: [{ pdfField: "School", value }],
    employer_name: [{ pdfField: "Employer", value }],
    job_title: [{ pdfField: "Occupation", value }],
    account_balance: [{ pdfField: "Funds", value }],
    annual_income: [{ pdfField: "Funds", value }],
  };
  if (key === "date_of_birth" && date) return [{ pdfField: "DOBYear", value: date.year }, { pdfField: "DOBMonth", value: date.month }, { pdfField: "DOBDay", value: date.day }];
  if (key === "passport_issue_date" && date) return [{ pdfField: "IssueYYYY", value: date.year }, { pdfField: "IssueMM", value: date.month }, { pdfField: "IssueDD", value: date.day }];
  if (key === "passport_expiry" && date) return [{ pdfField: "expiryYYYY", value: date.year }, { pdfField: "expiryMM", value: date.month }, { pdfField: "expiryDD", value: date.day }];
  return map[key] ?? [];
}

/** AcroForm fill. Returns { filled, skipped, unmatched } stats. */
function fillAcroForm(
  pdf: PDFDocument,
  answers: Record<string, unknown>,
  keyMap: Record<string, { pdfField: string; field: Field }>,
): { filled: string[]; skipped: { key: string; reason: string }[]; pdfFieldNames: Set<string> } {
  const filled: string[] = [];
  const skipped: { key: string; reason: string }[] = [];
  const form = pdf.getForm();
  const all = form.getFields();
  const byName = new Map<string, ReturnType<typeof form.getFields>[number]>();
  for (const f of all) byName.set(f.getName(), f);
  const pdfFieldNames = new Set(byName.keys());

  for (const [answerKey, raw] of Object.entries(answers)) {
    if (raw === "" || raw === null || raw === undefined) continue;
    const m = keyMap[answerKey];
    if (!m) { skipped.push({ key: answerKey, reason: "no schema field" }); continue; }
    const widget = byName.get(m.pdfField);
    if (!widget) continue; // XFA-only field; will be handled in XFA pass.
    const value = formatValue(raw, m.field);
    try {
      if (widget instanceof PDFTextField) {
        widget.setText(value);
        filled.push(m.pdfField);
      } else if (widget instanceof PDFCheckBox) {
        const yes = /^(yes|true|y|1|on|checked)$/i.test(value);
        if (yes) widget.check(); else widget.uncheck();
        filled.push(m.pdfField);
      } else if (widget instanceof PDFDropdown) {
        widget.select(value);
        filled.push(m.pdfField);
      } else if (widget instanceof PDFRadioGroup) {
        try { widget.select(value); filled.push(m.pdfField); }
        catch { skipped.push({ key: answerKey, reason: `radio option not found: ${value}` }); }
      } else {
        skipped.push({ key: answerKey, reason: `unsupported widget ${widget.constructor.name}` });
      }
    } catch (e) {
      skipped.push({ key: answerKey, reason: e instanceof Error ? e.message : "set failed" });
    }
  }
  // Make filled values visible in viewers that don't auto-render appearances.
  try { form.updateFieldAppearances(); } catch { /* ignore */ }
  return { filled, skipped, pdfFieldNames };
}

/** Locate XFA streams by role: returns { datasets, template }. */
function locateXfaStreams(pdf: PDFDocument): { datasets?: PDFStream; template?: PDFStream; xfaArray?: PDFArray } {
  let acro: PDFDict | undefined;
  try { acro = pdf.catalog.lookup(PDFName.of("AcroForm"), PDFDict); }
  catch (e) { console.error("AcroForm lookup failed", e); return {}; }
  if (!acro) return {};
  let xfa: unknown;
  try { xfa = acro.lookup(PDFName.of("XFA")); }
  catch (e) { console.error("XFA lookup failed", e); return {}; }
  if (!xfa) return {};
  if (xfa instanceof PDFArray) {
    let datasets: PDFStream | undefined;
    let template: PDFStream | undefined;
    for (let i = 0; i < xfa.size(); i += 2) {
      const nm = xfa.lookup(i)?.toString?.() ?? "";
      const s = xfa.lookup(i + 1);
      if (s instanceof PDFStream) {
        if (nm.includes("datasets")) datasets = s;
        if (nm.includes("template")) template = s;
      }
    }
    return { datasets, template, xfaArray: xfa };
  }
  return {};
}

function decodeStream(s: PDFStream): string {
  try {
    if (s instanceof PDFRawStream) return new TextDecoder().decode(decodePDFRawStream(s).decode());
  } catch { /* fall through */ }
  return "";
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Set a value at a SOM-style path in an XFA datasets XML string.
 * Path examples: "form1.page1.PersonalDetails.GivenName", "topmostSubform[0].Page1[0].FullName[0]".
 * Brackets/indexes are tolerated. We walk the XML by tag name only (XFA datasets are a flat-ish tree of <Name>...</Name>).
 */
function setXfaValue(xml: string, fieldName: string, value: string): { xml: string; changed: boolean } {
  // Strip indexes for path navigation; keep last segment for the leaf.
  const cleanPath = fieldName.replace(/\[\d+\]/g, "");
  const parts = cleanPath.split(".").filter(Boolean);
  if (parts.length === 0) return { xml, changed: false };
  const leaf = parts[parts.length - 1];
  const safe = leaf.replace(/[^a-zA-Z0-9_:-]/g, "");
  if (!safe) return { xml, changed: false };

  // Try to update an existing leaf element: <Leaf>...</Leaf> (open + close, no children).
  const re = new RegExp(`(<${safe}\\b[^>]*>)([\\s\\S]*?)(</${safe}>)`);
  const m = re.exec(xml);
  if (m) {
    // Only replace if body has no child element (i.e. it's a leaf).
    if (!/[<]/.test(m[2])) {
      const next = xml.slice(0, m.index) + m[1] + escapeXml(value) + m[3] + xml.slice(m.index + m[0].length);
      return { xml: next, changed: true };
    }
  }
  // Self-closing: <Leaf />
  const sc = new RegExp(`<${safe}\\b[^>]*/>`).exec(xml);
  if (sc) {
    const next = xml.slice(0, sc.index) + `<${safe}>${escapeXml(value)}</${safe}>` + xml.slice(sc.index + sc[0].length);
    return { xml: next, changed: true };
  }
  return { xml, changed: false };
}

function fillXfaDatasets(
  xml: string,
  answers: Record<string, unknown>,
  keyMap: Record<string, { pdfField: string; field: Field }>,
): { xml: string; filled: string[]; skipped: { key: string; reason: string }[] } {
  const filled: string[] = [];
  const skipped: { key: string; reason: string }[] = [];
  let next = xml;
  for (const [answerKey, raw] of Object.entries(answers)) {
    if (raw === "" || raw === null || raw === undefined) continue;
    const m = keyMap[answerKey];
    const value = m ? formatValue(raw, m.field) : String(raw);
    const candidates = m ? [{ pdfField: m.pdfField, value }] : [];
    candidates.push(...legacyXfaTargets(answerKey, value));

    let changed = false;
    for (const candidate of candidates) {
      const result = setXfaValue(next, candidate.pdfField, candidate.value);
      if (result.changed) {
        next = result.xml;
        filled.push(candidate.pdfField);
        changed = true;
      }
    }
    if (!changed) skipped.push({ key: answerKey, reason: m ? `xfa leaf not found: ${m.pdfField}` : "no schema field" });
  }
  return { xml: next, filled, skipped };
}

/**
 * Build a new uncompressed PDFRawStream containing newBytes, reusing the
 * pdf-lib context attached to the document.
 */
function buildRawStream(pdf: PDFDocument, newBytes: Uint8Array): PDFStream {
  // deno-lint-ignore no-explicit-any
  const ctx: any = (pdf as any).context;
  // deno-lint-ignore no-explicit-any
  const dict = (PDFDict as any).withContext(ctx);
  dict.set(PDFName.of("Length"), ctx.obj(newBytes.length));
  // deno-lint-ignore no-explicit-any
  return (PDFRawStream as any).of(dict, newBytes);
}

/**
 * Swap the datasets stream inside the AcroForm/XFA array with one containing
 * newBytes. Works for the typical IRCC layout where XFA is a name/stream pair
 * array on the AcroForm dict.
 */
function replaceXfaDatasetsStream(pdf: PDFDocument, xfaArray: PDFArray, newBytes: Uint8Array): boolean {
  const newStream = buildRawStream(pdf, newBytes);
  // deno-lint-ignore no-explicit-any
  const ctx: any = (pdf as any).context;
  const newRef = ctx.register(newStream);
  for (let i = 0; i < xfaArray.size(); i += 2) {
    const nm = xfaArray.lookup(i)?.toString?.() ?? "";
    if (nm.includes("datasets")) {
      // deno-lint-ignore no-explicit-any
      (xfaArray as any).set(i + 1, newRef);
      return true;
    }
  }
  return false;
}

/* ============================================================
 * Internal IMM5257-style PDF builder.
 * Generates a clean, deterministic PDF from questionnaire answers.
 * Used when the uploaded form is dynamic XFA / encrypted / unwriteable.
 * ============================================================ */

type Answer = { label: string; value: string };

function collectAnswers(
  sections: Section[],
  answers: Record<string, unknown>,
): { sectionKey: string; sectionLabel: string; rows: Answer[] }[] {
  const out: { sectionKey: string; sectionLabel: string; rows: Answer[] }[] = [];
  for (const s of sections) {
    const rows: Answer[] = [];
    for (const f of (s.fields ?? [])) {
      const candidates = [
        `${s.key}.${f.id ?? ""}`,
        `${s.key}.${f.pdf_field ?? ""}`,
        f.id ?? "",
        f.pdf_field ?? "",
      ].filter(Boolean);
      let v: unknown = undefined;
      for (const k of candidates) {
        if (k in answers && answers[k] !== "" && answers[k] !== null && answers[k] !== undefined) {
          v = answers[k]; break;
        }
      }
      const value = v === undefined ? "" : formatValue(v, f);
      rows.push({ label: f.label || (f.pdf_field ?? f.id ?? "Field"), value });
    }
    if (rows.length) out.push({ sectionKey: s.key, sectionLabel: s.label || s.key, rows });
  }
  return out;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      line = trial;
    } else {
      if (line) lines.push(line);
      // Break very long single tokens
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        let chunk = "";
        for (const ch of w) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk); chunk = ch;
          } else chunk += ch;
        }
        line = chunk;
      } else {
        line = w;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function buildInternalImm5257Pdf(args: {
  formName: string;
  clientName?: string;
  sections: Section[];
  answers: Record<string, unknown>;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;   // letter
  const PAGE_H = 792;
  const MARGIN_X = 48;
  const MARGIN_TOP = 56;
  const MARGIN_BOTTOM = 56;
  const LABEL_W = 200;
  const VALUE_W = PAGE_W - MARGIN_X * 2 - LABEL_W - 12;
  const TEXT_SIZE = 10;
  const LINE_H = 13;
  const SECTION_GAP = 14;

  const PRIMARY = rgb(0.10, 0.20, 0.45);
  const MUTED = rgb(0.40, 0.40, 0.45);
  const RULE = rgb(0.85, 0.87, 0.92);
  const BLACK = rgb(0.10, 0.10, 0.12);

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_TOP;

  const drawHeader = (p: PDFPage, pageNum: number) => {
    p.drawText("Internal Application Data Sheet", {
      x: MARGIN_X, y: PAGE_H - 36, size: 14, font: helvBold, color: PRIMARY,
    });
    p.drawText("IMM5257 Equivalent — Generated from Client Questionnaire", {
      x: MARGIN_X, y: PAGE_H - 52, size: 9, font: helv, color: MUTED,
    });
    p.drawLine({
      start: { x: MARGIN_X, y: PAGE_H - 60 },
      end: { x: PAGE_W - MARGIN_X, y: PAGE_H - 60 },
      thickness: 0.6, color: RULE,
    });
    // Footer
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    p.drawText(`Generated ${stamp} UTC`, {
      x: MARGIN_X, y: 32, size: 8, font: helv, color: MUTED,
    });
    p.drawText(`Page ${pageNum}`, {
      x: PAGE_W - MARGIN_X - 40, y: 32, size: 8, font: helv, color: MUTED,
    });
    p.drawText("This is an internal record, not the official IRCC submission PDF.", {
      x: MARGIN_X, y: 20, size: 7.5, font: helv, color: MUTED,
    });
  };

  let pageNum = 1;
  drawHeader(page, pageNum);
  y = PAGE_H - 80;

  // Subject block
  if (args.clientName) {
    page.drawText("Applicant", { x: MARGIN_X, y, size: 9, font: helvBold, color: MUTED });
    page.drawText(args.clientName, { x: MARGIN_X + 70, y, size: 11, font: helvBold, color: BLACK });
    y -= 16;
  }
  page.drawText("Form", { x: MARGIN_X, y, size: 9, font: helvBold, color: MUTED });
  page.drawText(args.formName, { x: MARGIN_X + 70, y, size: 10, font: helv, color: BLACK });
  y -= 22;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pageNum++;
    drawHeader(page, pageNum);
    y = PAGE_H - 80;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN_BOTTOM) newPage();
  };

  const grouped = collectAnswers(args.sections, args.answers);
  if (grouped.length === 0) {
    page.drawText("No questionnaire answers were submitted.", {
      x: MARGIN_X, y, size: 11, font: helv, color: BLACK,
    });
  }

  for (const group of grouped) {
    ensureSpace(40);
    // Section header
    page.drawRectangle({
      x: MARGIN_X, y: y - 4, width: PAGE_W - MARGIN_X * 2, height: 20,
      color: rgb(0.94, 0.96, 1),
    });
    page.drawText(group.sectionLabel.toUpperCase(), {
      x: MARGIN_X + 8, y: y + 2, size: 10, font: helvBold, color: PRIMARY,
    });
    y -= 24;

    for (const row of group.rows) {
      const labelLines = wrapText(row.label, helv, TEXT_SIZE, LABEL_W);
      const valueLines = wrapText(row.value || "—", helvBold, TEXT_SIZE, VALUE_W);
      const blockH = Math.max(labelLines.length, valueLines.length) * LINE_H + 6;
      ensureSpace(blockH + 4);

      // Row top
      const rowTop = y;
      labelLines.forEach((ln, i) => {
        page.drawText(ln, {
          x: MARGIN_X, y: rowTop - i * LINE_H - LINE_H + 4,
          size: TEXT_SIZE, font: helv, color: MUTED,
        });
      });
      valueLines.forEach((ln, i) => {
        page.drawText(ln, {
          x: MARGIN_X + LABEL_W + 12, y: rowTop - i * LINE_H - LINE_H + 4,
          size: TEXT_SIZE, font: row.value ? helvBold : helv,
          color: row.value ? BLACK : MUTED,
        });
      });
      y = rowTop - blockH;
      // Row separator
      page.drawLine({
        start: { x: MARGIN_X, y: y + 2 }, end: { x: PAGE_W - MARGIN_X, y: y + 2 },
        thickness: 0.4, color: RULE,
      });
    }
    y -= SECTION_GAP;
  }

  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { global: { headers: { Authorization: auth } } });
    const token = auth.replace("Bearer ", "");
    const { data: userResp } = await supabase.auth.getUser(token);
    if (!userResp.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const instance_id: string = String(body.instance_id ?? "");
    const force_internal: boolean = Boolean(body.force_internal ?? false);
    if (!instance_id) return json({ error: "instance_id required" }, 400);

    const { data: inst, error: instErr } = await supabase
      .from("questionnaire_instances")
      .select("id, client_id, form_id, schema_id, answers, status")
      .eq("id", instance_id).maybeSingle();
    if (instErr || !inst) return json({ error: "Instance not found" }, 404);

    const { data: schema } = await supabase
      .from("questionnaire_schemas")
      .select("id, sections")
      .eq("id", inst.schema_id).maybeSingle();
    if (!schema) return json({ error: "Schema not found" }, 404);

    const formId = inst.form_id;
    if (!formId) return json({ error: "Instance has no form_id" }, 400);
    const { data: form } = await supabase
      .from("visa_forms").select("id, name, file_path, file_name, published_pdf_path").eq("id", formId).maybeSingle();
    if (!form) return json({ error: "Form not found" }, 404);

    const sections = (schema.sections ?? []) as Section[];
    const answers = (inst.answers ?? {}) as Record<string, unknown>;
    const keyMap = buildAnswerKeyToPdfField(sections);

    // Look up client name for the internal data sheet
    let clientName: string | undefined;
    try {
      const { data: client } = await supabase
        .from("clients").select("full_name").eq("id", inst.client_id).maybeSingle();
      clientName = client?.full_name ?? undefined;
    } catch { /* ignore */ }

    const finalize = async (out: Uint8Array, mode: "filled" | "internal", extra: Record<string, unknown>) => {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const suffix = mode === "internal" ? "-data-sheet" : "";
      const outPath = `${inst.client_id}/filled-forms/${form.id}-${stamp}${suffix}.pdf`;
      const { error: upErr } = await supabase.storage.from("client-documents")
        .upload(outPath, out, { contentType: "application/pdf", upsert: true });
      if (upErr) return json({ error: `Upload failed: ${upErr.message}` }, 500);
      const fileLabel = mode === "internal"
        ? `${form.name} - data sheet.pdf`
        : `${form.name} - filled.pdf`;
      const { data: ff, error: ffErr } = await supabase.from("filled_forms").insert({
        client_id: inst.client_id, form_id: form.id, instance_id: inst.id,
        file_name: fileLabel, file_path: outPath, size_bytes: out.byteLength,
        status: inst.status === "submitted" ? "ready" : "draft",
        created_by: userResp.user.id,
      }).select().single();
      if (ffErr) console.error("filled_forms insert failed", ffErr);
      await supabase.from("activity_logs").insert({
        action: mode === "internal" ? "form.data_sheet_generated" : "form.filled",
        entity_type: "filled_form", entity_id: ff?.id ?? null, user_id: userResp.user.id,
        details: { form_id: form.id, instance_id: inst.id, mode, ...extra },
      });
      return json({ ok: true, mode, filled_form_id: ff?.id ?? null, file_path: outPath, ...extra });
    };

    // Shortcut: build internal data sheet directly without touching the source PDF.
    if (force_internal) {
      const out = await buildInternalImm5257Pdf({
        formName: form.name, clientName, sections, answers,
      });
      return await finalize(out, "internal", { reason: "force_internal" });
    }

    // Prefer the published, builder-produced PDF (clean AcroForm we control).
    // Fall back to the original uploaded file for legacy forms not yet republished.
    const sourcePath = (form as { published_pdf_path?: string | null }).published_pdf_path || form.file_path;
    const { data: file, error: dlErr } = await supabase.storage.from("visa-forms").download(sourcePath);
    if (dlErr || !file) return json({ error: "Cannot read form PDF" }, 500);
    const pdfBytes = new Uint8Array(await file.arrayBuffer());

    let pdf: PDFDocument;
    try {
      pdf = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false,
      });
    } catch (e) {
      console.warn("Source PDF parse failed, falling back to internal data sheet", e);
      const out = await buildInternalImm5257Pdf({
        formName: form.name, clientName, sections, answers,
      });
      return await finalize(out, "internal", {
        reason: "source_pdf_unparseable",
        detail: e instanceof Error ? e.message : "unknown",
      });
    }

    // Detect XFA up front so we can avoid AcroForm operations that crash
    // on dynamic XFA / IRCC PDFs (pdf-lib does not officially support XFA).
    const xfaInfo = locateXfaStreams(pdf);
    const hasXfa = !!(xfaInfo.datasets && xfaInfo.xfaArray);

    // 1) AcroForm pass — wrapped so a single broken widget can never abort
    // the whole job. Skipped entirely for XFA-only forms.
    let acro: { filled: string[]; skipped: { key: string; reason: string }[]; pdfFieldNames: Set<string> } =
      { filled: [], skipped: [], pdfFieldNames: new Set() };
    if (!hasXfa) {
      try {
        acro = fillAcroForm(pdf, answers, keyMap);
      } catch (e) {
        console.error("AcroForm fill failed", e);
        acro.skipped.push({ key: "*", reason: `AcroForm pass aborted: ${e instanceof Error ? e.message : "error"}` });
      }
    }

    // 2) XFA pass — write to <datasets> so Adobe Reader displays values.
    let xfaFilled: string[] = [];
    let xfaSkipped: { key: string; reason: string }[] = [];
    if (hasXfa) {
      const xml = decodeStream(xfaInfo.datasets!);
      if (xml) {
        const r = fillXfaDatasets(xml, answers, keyMap);
        xfaFilled = r.filled; xfaSkipped = r.skipped;
        if (r.filled.length > 0) {
          try {
            replaceXfaDatasetsStream(pdf, xfaInfo.xfaArray!, new TextEncoder().encode(r.xml));
          } catch (e) {
            console.error("XFA stream replace failed", e);
            xfaSkipped.push({ key: "*", reason: `XFA stream replace failed: ${e instanceof Error ? e.message : "error"}` });
          }
        }
      } else {
        xfaSkipped.push({ key: "*", reason: "XFA datasets stream is empty or undecodable" });
      }
    }

    let out: Uint8Array;
    try {
      if (acro.filled.length + xfaFilled.length === 0) {
        // Source PDF can't be filled (dynamic XFA / encrypted / no widgets).
        // Generate the internal IMM5257-style data sheet so the user always gets a result.
        const internal = await buildInternalImm5257Pdf({
          formName: form.name, clientName, sections, answers,
        });
        return await finalize(internal, "internal", {
          reason: hasXfa ? "xfa_not_writable" : "no_writable_fields",
          has_xfa: hasXfa,
          skipped_sample: [...acro.skipped, ...xfaSkipped].slice(0, 10),
        });
      }
      out = await pdf.save({ updateFieldAppearances: false });
    } catch (e) {
      console.error("pdf.save failed, falling back to internal data sheet", e);
      const internal = await buildInternalImm5257Pdf({
        formName: form.name, clientName, sections, answers,
      });
      return await finalize(internal, "internal", {
        reason: "save_failed",
        detail: e instanceof Error ? e.message : "unknown",
      });
    }

    return await finalize(out, "filled", {
      filled: { acroform: acro.filled, xfa: xfaFilled },
      skipped_sample: [...acro.skipped, ...xfaSkipped].slice(0, 20),
      has_xfa: hasXfa,
    });
  } catch (e) {
    console.error("fill-form error", e);
    return json({ error: e instanceof Error ? e.message : "Failed" }, 500);
  }
});