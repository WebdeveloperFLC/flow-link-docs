import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { calculateCrs, type CrsBreakdown } from "../_shared/crs/calculator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Answers = Record<string, any>;

function matchPrograms(answers: Answers, programs: any[]) {
  const results: { code: string; label: string; status: "eligible" | "review" | "not_eligible"; reasons: string[] }[] = [];
  for (const p of programs) {
    const rules = (p.match_rules ?? {}) as any;
    const reasons: string[] = [];
    let status: "eligible" | "review" | "not_eligible" = "eligible";

    if (rules.min) {
      for (const [k, v] of Object.entries(rules.min)) {
        const a = Number(answers[k] ?? 0);
        if (!Number.isFinite(a) || a < Number(v)) { status = "not_eligible"; reasons.push(`Requires ${k} ≥ ${v}, you reported ${answers[k] ?? "—"}`); }
      }
    }
    if (rules.requires) {
      for (const k of rules.requires) {
        if (!answers[k]) { status = "not_eligible"; reasons.push(`Requires ${k}`); }
      }
    }
    if (rules.province_in && Array.isArray(answers.province_preference)) {
      const ok = answers.province_preference.some((x: string) => rules.province_in.includes(x));
      if (!ok) { status = status === "not_eligible" ? "not_eligible" : "review"; reasons.push(`Preferred province must include one of: ${rules.province_in.join(", ")}`); }
    }
    if (status === "eligible" && reasons.length === 0) reasons.push("Meets baseline criteria — full review recommended.");
    results.push({ code: p.code, label: p.label, status, reasons });
  }
  return results;
}

function riskFlags(a: Answers) {
  const flags: string[] = [];
  if (a.criminal_history) flags.push("Disclosed criminal history — admissibility review required.");
  if (a.refusal_history) flags.push("Prior visa refusal — needs explanation letter.");
  if (a.overstay_history) flags.push("Overstay history — admissibility concern.");
  if (a.medical_issues) flags.push("Disclosed medical issues — medical inadmissibility review.");
  if (a.job_offer && !a.lmia) flags.push("Job offer disclosed without LMIA — verify exemption.");
  return flags;
}

function missingInfo(a: Answers) {
  const m: string[] = [];
  if (!a.eca_done && ["bachelor","master","phd","diploma"].includes(String(a.highest_education ?? ""))) m.push("Educational Credential Assessment (ECA) not yet done.");
  if (!a.ielts_report_available) m.push("Language test report not yet available.");
  if (!a.proof_of_funds_available) m.push("Proof of funds not yet available.");
  if (!a.passport_valid) m.push("Valid passport required before applying.");
  return m;
}

async function buildPdf(opts: { lead: any; session: any; matches: any[]; flags: string[]; missing: string[]; wrapper: any | null; crs: CrsBreakdown; }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842;
  const drawHeader = (page: any, title: string) => {
    page.drawRectangle({ x: 0, y: H - 80, width: W, height: 80, color: rgb(0.07, 0.16, 0.32) });
    page.drawText(opts.wrapper?.brand_name ?? "Futurelink Consultants", { x: 36, y: H - 40, size: 16, font: bold, color: rgb(1,1,1) });
    page.drawText(title, { x: 36, y: H - 60, size: 11, font, color: rgb(0.85, 0.92, 1) });
  };
  const drawFooter = (page: any) => {
    page.drawText(opts.wrapper?.footer_text ?? "Confidential — Canada Immigration Assessment", { x: 36, y: 30, size: 9, font, color: rgb(0.5,0.5,0.5) });
  };

  // Cover
  let page = pdf.addPage([W, H]);
  drawHeader(page, "Canada Immigration Assessment");
  page.drawText("Personalised Assessment Report", { x: 36, y: H - 160, size: 22, font: bold, color: rgb(0.07,0.16,0.32) });
  page.drawText(`Prepared for: ${[opts.lead.first_name, opts.lead.middle_name, opts.lead.last_name].filter(Boolean).join(" ")}`, { x: 36, y: H - 200, size: 12, font });
  page.drawText(`Email: ${opts.lead.email}`, { x: 36, y: H - 220, size: 11, font });
  page.drawText(`Phone: ${opts.lead.phone ?? ""}`, { x: 36, y: H - 235, size: 11, font });
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 36, y: H - 250, size: 11, font });
  page.drawText("This advisory report summarises programs you may qualify for based on your responses.", { x: 36, y: H - 290, size: 11, font, color: rgb(0.3,0.3,0.3), maxWidth: W - 72 });
  page.drawText("It is not a legal opinion. Final eligibility is determined by IRCC.", { x: 36, y: H - 305, size: 11, font, color: rgb(0.3,0.3,0.3) });
  drawFooter(page);

  // CRS Breakdown
  page = pdf.addPage([W, H]);
  drawHeader(page, "CRS Score Breakdown");
  let yc = H - 110;
  page.drawText(`Total CRS Score: ${opts.crs.total}`, { x: 36, y: yc, size: 20, font: bold, color: rgb(0.07,0.16,0.32) });
  yc -= 24;
  page.drawText(opts.crs.withSpouse ? "Calculated with accompanying spouse" : "Calculated as single applicant", { x: 36, y: yc, size: 10, font, color: rgb(0.4,0.4,0.4) });
  yc -= 24;
  const sec = (label: string, total: number, max: number, items: Record<string, number>) => {
    if (yc < 140) { drawFooter(page); page = pdf.addPage([W, H]); drawHeader(page, "CRS Breakdown (cont.)"); yc = H - 110; }
    page.drawText(`${label} — ${total} / ${max}`, { x: 36, y: yc, size: 13, font: bold }); yc -= 16;
    for (const [k, v] of Object.entries(items)) {
      page.drawText(`• ${k.replace(/_/g," ")}`, { x: 44, y: yc, size: 10, font, color: rgb(0.25,0.25,0.25) });
      page.drawText(String(v), { x: W - 80, y: yc, size: 10, font });
      yc -= 12;
    }
    yc -= 8;
  };
  sec("Core / Human Capital", opts.crs.sections.core.total, opts.crs.sections.core.max, opts.crs.sections.core.items);
  if (opts.crs.withSpouse) sec("Spouse factors", opts.crs.sections.spouse.total, opts.crs.sections.spouse.max, opts.crs.sections.spouse.items);
  sec("Skill transferability", opts.crs.sections.transferability.total, opts.crs.sections.transferability.max, opts.crs.sections.transferability.items);
  sec("Additional points", opts.crs.sections.additional.total, opts.crs.sections.additional.max, opts.crs.sections.additional.items);
  if (opts.crs.notes.length) {
    if (yc < 80) { drawFooter(page); page = pdf.addPage([W, H]); drawHeader(page, "CRS Notes"); yc = H - 110; }
    page.drawText("Notes", { x: 36, y: yc, size: 12, font: bold }); yc -= 14;
    for (const n of opts.crs.notes) { for (const ln of wrap(n, 95)) { page.drawText(`• ${ln}`, { x: 44, y: yc, size: 10, font }); yc -= 12; } }
  }
  drawFooter(page);

  // Programs
  page = pdf.addPage([W, H]);
  drawHeader(page, "Program Matches");
  let y = H - 110;
  for (const m of opts.matches) {
    if (y < 120) { drawFooter(page); page = pdf.addPage([W, H]); drawHeader(page, "Program Matches (cont.)"); y = H - 110; }
    const color = m.status === "eligible" ? rgb(0.05,0.5,0.25) : m.status === "review" ? rgb(0.85,0.55,0) : rgb(0.7,0.15,0.15);
    page.drawText(m.label, { x: 36, y, size: 13, font: bold });
    page.drawText(m.status.replace("_"," ").toUpperCase(), { x: W - 140, y, size: 10, font: bold, color });
    y -= 16;
    for (const r of m.reasons) {
      const lines = wrap(r, 90);
      for (const ln of lines) { page.drawText(`• ${ln}`, { x: 44, y, size: 10, font, color: rgb(0.25,0.25,0.25) }); y -= 12; }
    }
    y -= 8;
  }
  drawFooter(page);

  // Flags / missing
  page = pdf.addPage([W, H]);
  drawHeader(page, "Risk Flags & Missing Documents");
  y = H - 110;
  page.drawText("Risk flags", { x: 36, y, size: 13, font: bold }); y -= 18;
  if (opts.flags.length === 0) { page.drawText("None disclosed.", { x: 36, y, size: 11, font }); y -= 16; }
  for (const f of opts.flags) { for (const ln of wrap(f, 95)) { page.drawText(`• ${ln}`, { x: 44, y, size: 11, font }); y -= 14; } }
  y -= 12;
  page.drawText("Missing information / documents", { x: 36, y, size: 13, font: bold }); y -= 18;
  if (opts.missing.length === 0) { page.drawText("Nothing flagged.", { x: 36, y, size: 11, font }); y -= 16; }
  for (const m of opts.missing) { for (const ln of wrap(m, 95)) { page.drawText(`• ${ln}`, { x: 44, y, size: 11, font }); y -= 14; } }
  y -= 16;
  page.drawText("Next steps", { x: 36, y, size: 13, font: bold }); y -= 18;
  const steps = [
    "Book a consultation with a Futurelink RCIC to review this report.",
    "Begin collecting documents flagged as missing.",
    "If applicable, book your language test and start the ECA process.",
  ];
  for (const s of steps) { for (const ln of wrap(s, 95)) { page.drawText(`• ${ln}`, { x: 44, y, size: 11, font }); y -= 14; } }
  drawFooter(page);

  return await pdf.save();
}

function wrap(t: string, n: number) {
  const out: string[] = [];
  const words = t.split(/\s+/);
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > n) { out.push(cur.trim()); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const user = await createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } }).auth.getUser();
    if (!user.data.user) return json({ error: "Not authenticated" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const { sessionId, answers } = await req.json();
    if (!sessionId) return json({ error: "Missing sessionId" }, 400);

    const { data: session } = await admin.from("assessment_sessions")
      .select("*, lead:assessment_leads(*), client:clients(id, full_name, email, phone, country)")
      .eq("id", sessionId).maybeSingle();
    if (!session) return json({ error: "Session not found" }, 404);

    // Authorisation:
    //  - Email-flow sessions: the lead's auth_user_id must match.
    //  - Counselor-initiated sessions (no lead): admin/counselor role.
    const uid = user.data.user.id;
    let allowed = false;
    if (session.lead?.auth_user_id === uid) allowed = true;
    if (!allowed) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
      if ((roles ?? []).some((r) => ["admin", "counselor"].includes(r.role))) allowed = true;
    }
    if (!allowed) return json({ error: "Forbidden" }, 403);

    // Build a "subject" object for the PDF & email — works for either path.
    const subject = session.lead ?? (session.client ? {
      first_name: (session.client.full_name ?? "").split(" ")[0] ?? "",
      middle_name: "",
      last_name: (session.client.full_name ?? "").split(" ").slice(1).join(" "),
      email: session.client.email,
      phone: session.client.phone,
    } : { first_name: "", middle_name: "", last_name: "", email: "", phone: "" });

    const finalAnswers = { ...(session.answers ?? {}), ...(answers ?? {}) };
    const { data: programs } = await admin.from("assessment_programs").select("*").eq("is_active", true).order("order_index");
    const matches = matchPrograms(finalAnswers, programs ?? []);
    const flags = riskFlags(finalAnswers);
    const missing = missingInfo(finalAnswers);
    const crs = calculateCrs(finalAnswers);

    const { data: wrapper } = await admin.from("assessment_pdf_wrapper").select("*").maybeSingle();

    const pdfBytes = await buildPdf({ lead: subject, session, matches, flags, missing, wrapper, crs });
    const path = `${sessionId}/report.pdf`;
    await admin.storage.from("assessment-pdf-assets").upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });

    const { data: signed } = await admin.storage.from("assessment-pdf-assets").createSignedUrl(path, 60 * 60 * 24 * 7);

    await admin.from("assessment_sessions").update({
      status: "submitted",
      answers: finalAnswers,
      output: { matches, flags, missing, crs },
      pdf_path: path,
      submitted_at: new Date().toISOString(),
      last_emailed_at: new Date().toISOString(),
    }).eq("id", sessionId);

    // Email report to client
    if (subject.email) {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "assessment-report",
            recipientEmail: subject.email,
            idempotencyKey: `assessment-report-${sessionId}`,
            templateData: { firstName: subject.first_name, reportUrl: signed?.signedUrl ?? "" },
          },
        });
      } catch (_) { /* queued */ }
    }

    return json({ ok: true, sessionId, matches, flags, missing, crs });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
