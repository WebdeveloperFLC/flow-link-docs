import { jsPDF } from "jspdf";
import flcLogo from "@/assets/flc-logo.png";
import flcBanner from "@/assets/flc-banner.jpg";
import { evaluateGermanyAsync, type DeEvaluation } from "@/lib/assessment/germany";
import { evaluateFamily, type FamilyAnswers, FAMILY_BRANCH_LABELS } from "@/lib/assessment/family";
import { suggestCrsImprovements } from "@/lib/assessment/canadaSuggestions";

const SECTION_LABELS: Record<string, string> = {
  personal: "Personal",
  education: "Education",
  language: "Language",
  work: "Work experience",
  canada: "Family & location",
  province: "Province preference",
  funds: "Settlement funds",
  compliance: "Compliance",
  documents: "Documents",
};
const SECTION_ORDER = ["personal","education","language","work","canada","province","funds","compliance","documents"];

// Sections relevant to Family Reunification flow — hide CRS-only sections.
const FAMILY_SECTION_ALLOW = new Set(["personal", "canada", "documents"]);
// Question codes to skip when in family flow (CRS-only).
const FAMILY_CODE_SKIP = /^(ielts|celpip|tef|tcf|noc|work|edu|education_level|spouse_|second_lang|canadian_work|provincial|funds|adapt|arranged)/i;

// IRCC LICO (Low Income Cut-Off) — 2024 figures, gross CAD/yr.
const LICO_TABLE: { label: string; size: number; amount: number }[] = [
  { label: "1 person",   size: 1, amount: 27514 },
  { label: "2 persons",  size: 2, amount: 34254 },
  { label: "3 persons",  size: 3, amount: 42100 },
  { label: "4 persons",  size: 4, amount: 51128 },
  { label: "5 persons",  size: 5, amount: 57988 },
  { label: "6 persons",  size: 6, amount: 65400 },
  { label: "7 persons",  size: 7, amount: 72814 },
];
const LICO_EACH_ADDITIONAL = 7412;

const GOAL_LABELS: Record<string, string> = {
  permanent_residence: "Permanent Residence",
  work_permit: "Work Permit",
  study_permit: "Study Permit",
  visitor_visa: "Visitor Visa",
  family_sponsorship: "Family Sponsorship",
  business_investment: "Business / Investment",
  unsure: "Eligibility Check",
  pnp: "Provincial Nominee Program",
  de_chancenkarte: "Opportunity Card (Chancenkarte)",
  de_job_seeker: "Job Seeker Visa",
  de_ausbildung: "Ausbildung",
  de_skilled_worker: "Skilled Worker (Germany)",
  de_blue_card: "EU Blue Card",
};

export type AssessmentQuestion = {
  id: string; code: string; section: string; label: string; q_type: string;
};

export interface AssessmentPdfInput {
  clientName?: string;
  clientEmail?: string;
  goal?: string;
  country?: string;
  answers: Record<string, any>;
  questions: AssessmentQuestion[];
  crs?: any;
  sessionId?: string;
}

// Cache logo data URL across multiple PDF generations.
let _logoDataUrl: string | null = null;
let _logoDims: { w: number; h: number } | null = null;

async function loadLogoDataUrl(): Promise<{ url: string; w: number; h: number } | null> {
  if (_logoDataUrl && _logoDims) return { url: _logoDataUrl, ..._logoDims };
  return loadImageDataUrl(flcLogo as unknown as string, "image/png").then((r) => {
    if (r) { _logoDataUrl = r.url; _logoDims = { w: r.w, h: r.h }; }
    return r;
  });
}

let _bannerDataUrl: string | null = null;
let _bannerDims: { w: number; h: number } | null = null;
async function loadBannerDataUrl(): Promise<{ url: string; w: number; h: number } | null> {
  if (_bannerDataUrl && _bannerDims) return { url: _bannerDataUrl, ..._bannerDims };
  const r = await loadImageDataUrl(flcBanner as unknown as string, "image/jpeg");
  if (r) { _bannerDataUrl = r.url; _bannerDims = { w: r.w, h: r.h }; }
  return r;
}

async function loadImageDataUrl(src: string, mime: string): Promise<{ url: string; w: number; h: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    await new Promise<void>((resolve, reject) => {
      if ((img as any).decode) {
        (img as any).decode().then(() => resolve()).catch(() => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("image load failed"));
        });
      } else {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image load failed"));
      }
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 240;
    canvas.height = img.naturalHeight || 80;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const url = canvas.toDataURL(mime);
    return { url, w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

function formatAnswer(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") {
    if (typeof v.noc_code === "string" && typeof v.teer === "number") {
      const cats = Array.isArray(v.categories) && v.categories.length ? ` · ${v.categories.join(", ")}` : "";
      return `${v.title} (NOC ${v.noc_code} · TEER ${v.teer}${cats})`;
    }
    return JSON.stringify(v);
  }
  return String(v);
}

export async function downloadAssessmentPdf(input: AssessmentPdfInput) {
  const pdf = await buildAssessmentPdf(input);
  const fname = `FLC-Assessment-${(input.clientName || input.sessionId || "report").replace(/[^a-z0-9_-]+/gi, "_")}.pdf`;
  pdf.save(fname);
}

export async function openAssessmentPdf(input: AssessmentPdfInput) {
  const pdf = await buildAssessmentPdf(input);
  const url = pdf.output("bloburl") as unknown as string;
  window.open(url, "_blank", "noopener");
}

async function buildAssessmentPdf(input: AssessmentPdfInput): Promise<jsPDF> {
  const { clientName, clientEmail, goal, answers, questions, crs, sessionId } = input;
  const country = input.country ?? "Canada";
  const isGermany = country === "Germany" || country === "DE";
  const isCanada = country === "Canada" || country === "CA";
  // Family flow: triggered by explicit goal or PR/citizen status.
  const familyStatus = String(answers.current_status_canada ?? "");
  const isFamilyFlow = isCanada && (goal === "family_sponsorship" || familyStatus === "pr_holder" || familyStatus === "citizen");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const logo = await loadLogoDataUrl();

  const newPageIfNeeded = (need: number) => {
    if (y + need > H - 50) {
      drawFooter();
      pdf.addPage();
      y = margin;
      drawHeader(false);
    }
  };

  const drawHeader = (full = true) => {
    if (logo) {
      // Maintain aspect ratio to a max width of 90pt.
      const maxW = 90;
      const ratio = logo.h / logo.w;
      const drawW = maxW;
      const drawH = Math.min(40, Math.round(maxW * ratio));
      try { pdf.addImage(logo.url, "PNG", margin, y, drawW, drawH); } catch { /* ignore */ }
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(20, 30, 70);
    pdf.text("Future Link Consultants", margin + 100, y + 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(220, 90, 60);
    pdf.text("Settle Abroad", margin + 100, y + 30);
    pdf.setTextColor(90, 90, 100);
    pdf.text(`${country} Immigration Assessment`, margin + 100, y + 42);
    pdf.setDrawColor(220, 220, 225);
    pdf.line(margin, y + 54, W - margin, y + 54);
    y += 68;
    pdf.setTextColor(20, 20, 25);
    if (full) return;
  };

  const drawFooter = () => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(140, 140, 145);
    pdf.text(
      "Confidential — Future Link Consultants. Advisory only; final CRS confirmed by IRCC.",
      margin, H - 25
    );
    const page = pdf.getNumberOfPages();
    pdf.text(`Page ${page}`, W - margin - 30, H - 25);
  };

  drawHeader();

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Personalised Assessment Report", margin, y);
  y += 22;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 90);
  pdf.text(`Prepared for: ${clientName || "—"}`, margin, y); y += 14;
  if (clientEmail) { pdf.text(`Email: ${clientEmail}`, margin, y); y += 14; }
  pdf.text(`Goal: ${GOAL_LABELS[goal ?? ""] ?? goal ?? "—"}`, margin, y); y += 14;
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, y); y += 14;
  if (sessionId) { pdf.text(`Ref: ${sessionId}`, margin, y); y += 14; }
  y += 8;
  pdf.setTextColor(20, 20, 25);

  // Germany section — Chancenkarte points + pathway eligibility
  let de: DeEvaluation | null = null;
  if (isGermany) {
    try { de = await evaluateGermanyAsync(answers); } catch { de = null; }
  }

  if (isGermany && de) {
    newPageIfNeeded(180);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Germany — Chancenkarte Score", margin, y); y += 18;
    pdf.setFontSize(28);
    pdf.setTextColor(220, 90, 60);
    pdf.text(`${de.chancenkarte.total}`, margin, y + 6); y += 22;
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 130);
    pdf.text(`/ ${de.chancenkarte.threshold} points to pass — ${de.chancenkarte.passes ? "Likely eligible" : de.chancenkarte.basePass ? "Below threshold" : "Base requirements missing"}`, margin, y);
    y += 14;
    pdf.setTextColor(20, 20, 25);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    for (const f of de.chancenkarte.factors) {
      newPageIfNeeded(14);
      pdf.setTextColor(80, 80, 90);
      pdf.text(`${f.label} — ${f.reason}`, margin + 6, y);
      pdf.setTextColor(20, 20, 25);
      pdf.text(`${f.points}/${f.max}`, W - margin, y, { align: "right" });
      y += 14;
    }
    y += 4;

    if (de.chancenkarte.baseFailures.length) {
      newPageIfNeeded(20 + de.chancenkarte.baseFailures.length * 12);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
      pdf.setTextColor(220, 90, 60);
      pdf.text("Base requirements missing", margin, y); y += 14;
      pdf.setTextColor(20, 20, 25); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
      for (const b of de.chancenkarte.baseFailures) {
        const lines = pdf.splitTextToSize(`• ${b}`, W - margin * 2) as string[];
        newPageIfNeeded(lines.length * 12);
        lines.forEach((ln, i) => pdf.text(ln, margin, y + i * 12));
        y += lines.length * 12;
      }
      y += 4;
    }

    // Pathway matches
    newPageIfNeeded(40);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
    pdf.setTextColor(20, 30, 70);
    pdf.text("Germany pathway eligibility", margin, y); y += 16;
    pdf.setTextColor(20, 20, 25); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    for (const p of de.pathways) {
      newPageIfNeeded(30);
      pdf.setFont("helvetica", "bold");
      pdf.text(p.label, margin, y);
      pdf.setTextColor(p.status === "eligible" ? 30 : p.status === "partial" ? 200 : 120, p.status === "eligible" ? 130 : 130, p.status === "eligible" ? 70 : 70);
      pdf.text(p.status.replace("_", " ").toUpperCase(), W - margin, y, { align: "right" });
      pdf.setTextColor(20, 20, 25); pdf.setFont("helvetica", "normal");
      y += 12;
      const lines = [...p.reasons.map((r) => `• ${r}`), ...p.gaps.map((g) => `– ${g}`)];
      for (const ln of lines.slice(0, 5)) {
        const wrapped = pdf.splitTextToSize(ln, W - margin * 2 - 10) as string[];
        newPageIfNeeded(wrapped.length * 12);
        wrapped.forEach((w2, i) => pdf.text(w2, margin + 8, y + i * 12));
        y += wrapped.length * 12;
      }
      y += 4;
    }

    // Recommendations
    if (de.recommendation.suggestedImprovements.length || de.recommendation.nextActions.length) {
      newPageIfNeeded(40);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
      pdf.setTextColor(20, 30, 70);
      pdf.text("Recommendations & next actions", margin, y); y += 16;
      pdf.setTextColor(20, 20, 25); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
      for (const s of de.recommendation.suggestedImprovements) {
        const txt = `• ${s.area}: ${s.action}`;
        const wrapped = pdf.splitTextToSize(txt, W - margin * 2) as string[];
        newPageIfNeeded(wrapped.length * 12);
        wrapped.forEach((w2, i) => pdf.text(w2, margin, y + i * 12));
        y += wrapped.length * 12;
      }
      y += 6;
      if (de.recommendation.nextActions.length) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Next steps", margin, y); y += 14;
        pdf.setFont("helvetica", "normal");
        for (const a of de.recommendation.nextActions) {
          const wrapped = pdf.splitTextToSize(`→ ${a}`, W - margin * 2) as string[];
          newPageIfNeeded(wrapped.length * 12);
          wrapped.forEach((w2, i) => pdf.text(w2, margin, y + i * 12));
          y += wrapped.length * 12;
        }
      }
      y += 6;
    }
  }

  // CRS section (Canada only)
  if (!isGermany && !isFamilyFlow && crs && typeof crs.total === "number") {
    newPageIfNeeded(160);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Estimated CRS Score", margin, y); y += 18;
    pdf.setFontSize(28);
    pdf.setTextColor(220, 90, 60);
    pdf.text(String(crs.total), margin, y + 6); y += 22;
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 130);
    pdf.text("/ 520 target — self-reported estimate", margin, y); y += 14;
    pdf.setTextColor(20, 20, 25);

    const rows: [string, any][] = [
      ["Age", crs.sections?.core?.items?.age],
      ["Education", crs.sections?.core?.items?.education],
      ["First language", crs.sections?.core?.items?.first_language],
      ["Second language", crs.sections?.core?.items?.second_language],
      ["Canadian experience", crs.sections?.core?.items?.canadian_work],
      ["Spouse", crs.sections?.spouse?.total],
      ["Transferability", crs.sections?.transferability?.total],
      ["Additional", crs.sections?.additional?.total],
    ];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    for (const [lbl, v] of rows) {
      newPageIfNeeded(14);
      pdf.setTextColor(80, 80, 90);
      pdf.text(lbl, margin + 6, y);
      pdf.setTextColor(20, 20, 25);
      pdf.text(String(typeof v === "number" ? v : 0), W - margin - 30, y, { align: "right" });
      y += 14;
    }
    y += 8;

    // FSW 67-point eligibility — directly from the edge function response.
    const fsw = crs?.fsw67;
    if (fsw && typeof fsw.total === "number") {
      newPageIfNeeded(160);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(20, 30, 70);
      pdf.text("Federal Skilled Worker — 67-Point Eligibility", margin, y);
      // Pass/fail chip on the right.
      const passing = !!fsw.pass;
      const chip = passing ? "PASS" : "BELOW 67";
      pdf.setFontSize(9);
      pdf.setTextColor(passing ? 30 : 220, passing ? 130 : 90, passing ? 70 : 60);
      pdf.text(chip, W - margin, y, { align: "right" });
      y += 18;
      pdf.setFontSize(24);
      pdf.setTextColor(220, 90, 60);
      pdf.text(`${fsw.total}`, margin, y + 4); y += 18;
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 130);
      pdf.text(`/ 100 · pass mark 67`, margin, y); y += 14;
      pdf.setTextColor(20, 20, 25);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const fswRows: [string, number, number][] = [
        ["Language ability", fsw.sections?.language?.total ?? 0, fsw.sections?.language?.max ?? 28],
        ["Education", fsw.sections?.education?.total ?? 0, fsw.sections?.education?.max ?? 25],
        ["Work experience", fsw.sections?.experience?.total ?? 0, fsw.sections?.experience?.max ?? 15],
        ["Age", fsw.sections?.age?.total ?? 0, fsw.sections?.age?.max ?? 12],
        ["Arranged employment", fsw.sections?.arranged_employment?.total ?? 0, fsw.sections?.arranged_employment?.max ?? 10],
        ["Adaptability", fsw.sections?.adaptability?.total ?? 0, fsw.sections?.adaptability?.max ?? 10],
      ];
      for (const [lbl, v, mx] of fswRows) {
        newPageIfNeeded(14);
        pdf.setTextColor(80, 80, 90);
        pdf.text(lbl, margin + 6, y);
        pdf.setTextColor(20, 20, 25);
        pdf.text(`${v} / ${mx}`, W - margin - 6, y, { align: "right" });
        y += 14;
      }
      y += 8;
    }

    // Suggestions to improve CRS — client-side heuristic.
    try {
      const tips = suggestCrsImprovements(crs, answers);
      if (tips.length) {
        newPageIfNeeded(40);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
        pdf.setTextColor(20, 30, 70);
        pdf.text("Suggestions to improve your CRS", margin, y); y += 16;
        pdf.setTextColor(20, 20, 25); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
        for (const t of tips) {
          const head = `• ${t.area}: ${t.action}`;
          const wrapped = pdf.splitTextToSize(head, W - margin * 2) as string[];
          newPageIfNeeded(wrapped.length * 12 + (t.potentialGain ? 12 : 0));
          wrapped.forEach((w2, i) => pdf.text(w2, margin, y + i * 12));
          y += wrapped.length * 12;
          if (t.potentialGain) {
            pdf.setTextColor(120, 120, 130);
            const gw = pdf.splitTextToSize(`   ↳ ${t.potentialGain}`, W - margin * 2) as string[];
            gw.forEach((w2, i) => pdf.text(w2, margin, y + i * 12));
            y += gw.length * 12;
            pdf.setTextColor(20, 20, 25);
          }
        }
        y += 6;
      }
    } catch { /* defensive */ }
  }

  // Family Reunification section (Canada PR / citizen sponsor flow).
  if (isFamilyFlow) {
    const fam = (answers.family ?? {}) as any;
    const ev = evaluateFamily(fam);
    newPageIfNeeded(60);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
    pdf.setTextColor(20, 30, 70);
    pdf.text("Family Reunification — Pathway Assessment", margin, y); y += 18;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(20, 20, 25);
    pdf.text(`Sponsor status: ${fam.sponsor_status === "citizen" ? "Canadian citizen" : fam.sponsor_status === "pr_holder" ? "Canadian PR" : "—"}`, margin, y); y += 14;
    if (ev.branch) {
      pdf.text(`Selected branch: ${FAMILY_BRANCH_LABELS[ev.branch]}`, margin, y); y += 14;
    }
    y += 4;
    // Verdicts
    for (const v of ev.verdicts) {
      newPageIfNeeded(30);
      pdf.setFont("helvetica", "bold");
      pdf.text(v.label, margin, y);
      const tone = v.status === "likely" ? [30, 130, 70] : v.status === "not_eligible" ? [200, 60, 60] : [200, 130, 70];
      pdf.setTextColor(tone[0], tone[1], tone[2]);
      pdf.text(v.status.replace("_", " ").toUpperCase(), W - margin, y, { align: "right" });
      pdf.setTextColor(20, 20, 25); pdf.setFont("helvetica", "normal");
      y += 12;
      for (const r of v.reasons) {
        const wrapped = pdf.splitTextToSize(`• ${r}`, W - margin * 2 - 10) as string[];
        newPageIfNeeded(wrapped.length * 12);
        wrapped.forEach((w2, i) => pdf.text(w2, margin + 8, y + i * 12));
        y += wrapped.length * 12;
      }
      y += 4;
    }
    // Checklist
    if (ev.checklist.length) {
      newPageIfNeeded(30);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
      pdf.setTextColor(20, 30, 70);
      pdf.text("Document readiness", margin, y); y += 14;
      pdf.setTextColor(20, 20, 25); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
      for (const c of ev.checklist) {
        newPageIfNeeded(14);
        const mark = c.have ? "[x]" : c.required ? "[ ]" : "[-]";
        pdf.text(`${mark} ${c.label}${c.required ? " (required)" : ""}`, margin, y);
        y += 14;
      }
      y += 4;
    }
    // Next actions
    if (ev.nextActions.length) {
      newPageIfNeeded(30);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
      pdf.setTextColor(20, 30, 70);
      pdf.text("Next actions", margin, y); y += 14;
      pdf.setTextColor(20, 20, 25); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
      for (const a of ev.nextActions) {
        const wrapped = pdf.splitTextToSize(`→ ${a}`, W - margin * 2) as string[];
        newPageIfNeeded(wrapped.length * 12);
        wrapped.forEach((w2, i) => pdf.text(w2, margin, y + i * 12));
        y += wrapped.length * 12;
      }
      y += 6;
    }
  }

  // Answers grouped by section
  const bySection: Record<string, AssessmentQuestion[]> = {};
  for (const q of questions) (bySection[q.section] ??= []).push(q);

  for (const key of SECTION_ORDER) {
    const qs = bySection[key];
    if (!qs || qs.length === 0) continue;
    newPageIfNeeded(40);
    pdf.setDrawColor(220, 220, 225);
    pdf.line(margin, y, W - margin, y); y += 14;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(20, 30, 70);
    pdf.text(SECTION_LABELS[key] ?? key, margin, y); y += 16;
    pdf.setTextColor(20, 20, 25);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    for (const q of qs) {
      const ans = formatAnswer(answers[q.code]);
      const labelLines = pdf.splitTextToSize(q.label, W - margin * 2 - 130) as string[];
      const ansLines = pdf.splitTextToSize(ans, 120) as string[];
      const lineH = 12;
      const blockH = Math.max(labelLines.length, ansLines.length) * lineH + 4;
      newPageIfNeeded(blockH);
      pdf.setTextColor(80, 80, 90);
      labelLines.forEach((ln, i) => pdf.text(ln, margin, y + i * lineH));
      pdf.setTextColor(20, 20, 25);
      pdf.setFont("helvetica", "bold");
      ansLines.forEach((ln, i) => pdf.text(ln, W - margin, y + i * lineH, { align: "right" }));
      pdf.setFont("helvetica", "normal");
      y += blockH;

      // Inject derived Age right after DOB for Germany so the report mirrors the score input.
      if (isGermany && q.code === "de_dob") {
        const age = computeAge(answers.de_dob) ?? (typeof answers.de_age === "number" ? answers.de_age : null);
        if (age != null) {
          const lbl = "Age (derived)";
          const ansStr = `${age}`;
          const lblLines = pdf.splitTextToSize(lbl, W - margin * 2 - 130) as string[];
          const aLines = pdf.splitTextToSize(ansStr, 120) as string[];
          const bH = Math.max(lblLines.length, aLines.length) * lineH + 4;
          newPageIfNeeded(bH);
          pdf.setTextColor(80, 80, 90);
          lblLines.forEach((ln, i) => pdf.text(ln, margin, y + i * lineH));
          pdf.setTextColor(20, 20, 25);
          pdf.setFont("helvetica", "bold");
          aLines.forEach((ln, i) => pdf.text(ln, W - margin, y + i * lineH, { align: "right" }));
          pdf.setFont("helvetica", "normal");
          y += bH;
        }
      }
    }
    y += 6;
  }

  drawFooter();
  return pdf;
}

function computeAge(dob: any): number | null {
  if (typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}