import { jsPDF } from "jspdf";
import flcLogo from "@/assets/flc-logo.png";
import { evaluateGermanyAsync, type DeEvaluation } from "@/lib/assessment/germany";

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

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(flcLogo);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
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
      try { pdf.addImage(logo, "PNG", margin, y, 90, 32); } catch { /* ignore */ }
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
  if (!isGermany && crs && typeof crs.total === "number") {
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
    }
    y += 6;
  }

  drawFooter();
  return pdf;
}