#!/usr/bin/env node
/**
 * Generate branded PDF checklist for Canada Student Visa (outside Canada).
 *
 *   node scripts/generate-canada-student-checklist-pdf.mjs
 *   → public/specimens/canada-student-visa-outside-canada-checklist.pdf
 */
import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";

const OUT = path.join(
  process.cwd(),
  "public/specimens/canada-student-visa-outside-canada-checklist.pdf",
);
const LOGO = path.join(process.cwd(), "src/assets/flc-logo.png");

const BLUE = [26, 79, 140];
const RED = [196, 30, 58];
const MUTED = [92, 101, 120];
const INK = [26, 26, 46];

function section(pdf, y, title) {
  pdf.setFillColor(...RED);
  pdf.rect(40, y, 3, 12, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...BLUE);
  pdf.text(title.toUpperCase(), 48, y + 9);
  return y + 18;
}

function item(pdf, y, text, maxW = 515) {
  pdf.setDrawColor(...BLUE);
  pdf.rect(40, y - 3, 10, 10);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...INK);
  const lines = pdf.splitTextToSize(text, maxW);
  pdf.text(lines, 54, y + 4);
  return y + Math.max(12, lines.length * 10 + 2);
}

function newPageIfNeeded(pdf, y, need = 40) {
  if (y + need > 800) {
    pdf.addPage();
    return 50;
  }
  return y;
}

async function main() {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  let y = 0;

  // Header band
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, W, 88, "F");
  const logoB64 = fs.readFileSync(LOGO).toString("base64");
  pdf.addImage(`data:image/png;base64,${logoB64}`, "PNG", (W - 180) / 2, 12, 180, 46, undefined, "FAST");

  y = 98;
  pdf.setFillColor(...BLUE);
  pdf.rect(0, y, W, 44, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Study Permit — Document Checklist", 40, y + 18);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Outside Canada · SDS & Non-SDS · Future Link Consultants", 40, y + 34);
  y += 54;

  pdf.setFillColor(232, 244, 252);
  pdf.rect(40, y, W - 80, 52, "F");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  const meta = [
    ["Client:", "_________________________", "File ID:", "_________________________"],
    ["Residence:", "_______________________", "Pathway:", "☐ SDS   ☐ Non-SDS"],
  ];
  let my = y + 14;
  for (const row of meta) {
    pdf.text(row[0], 48, my);
    pdf.setTextColor(...INK);
    pdf.text(row[1], 88, my);
    pdf.setTextColor(...MUTED);
    pdf.text(row[2], 300, my);
    pdf.setTextColor(...INK);
    pdf.text(row[3], 345, my);
    pdf.setTextColor(...MUTED);
    my += 16;
  }
  y += 62;

  const sections = [
    [
      "A · Identity & travel",
      [
        "Valid passport (bio + visa pages if requested)",
        "Digital photo — IRCC specs (420×540 px, white background)",
        "IMM 5257 / online profile complete",
        "Family info form IMM 5707 or IMM 5645 if applicable",
      ],
    ],
    [
      "B · LOA & DLI",
      [
        "Letter of acceptance — program, dates, tuition",
        "DLI number verified on IRCC official list",
        "Program start allows realistic processing time",
      ],
    ],
    [
      "C · Financial proof",
      [
        "[SDS] GIC from participating institution (verify current amount)",
        "[SDS] Proof of upfront tuition payment",
        "[Non-SDS] Bank statements 4–6 months + LICO + tuition calc",
        "[If sponsored] Sponsor letter, ID, ITR, salary proof",
      ],
    ],
    [
      "D · Language & academics",
      [
        "Language TRF — IELTS / CELPIP / PTE / TEF per stream",
        "Transcripts, degrees, certified translations",
        "SOP / study plan — genuine student intent",
      ],
    ],
    [
      "E · Medical, biometrics & police",
      [
        "[SDS] Upfront medical where required",
        "Biometrics booked within 30 days of BIL if issued",
        "Police certificate(s) per visa office checklist",
      ],
    ],
    [
      "F · Fees & submission",
      [
        "Study permit + biometrics fees paid; receipts saved",
        "Client signed checklist before IRCC upload",
        "Quality review sign-off completed",
        "Submitted in IRCC account; confirmation saved",
      ],
    ],
  ];

  for (const [title, lines] of sections) {
    y = newPageIfNeeded(pdf, y, 30 + lines.length * 14);
    y = section(pdf, y, title);
    for (const line of lines) {
      y = newPageIfNeeded(pdf, y, 16);
      y = item(pdf, y, line);
    }
    y += 6;
  }

  y = newPageIfNeeded(pdf, y, 80);
  pdf.setDrawColor(212, 220, 232);
  pdf.line(40, y, W - 40, y);
  y += 20;
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("Client signature / date", 40, y);
  pdf.text("Counselor / QA sign-off", 300, y);
  pdf.line(40, y + 28, 260, y + 28);
  pdf.line(300, y + 28, W - 40, y + 28);

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 800, W, 42, "F");
  pdf.setFontSize(6.5);
  pdf.setTextColor(148, 163, 184);
  const footerLines = pdf.splitTextToSize(
    "Future Link Consultants · Internal checklist · Not an official government form · Verify canada.ca · v2.0 Jun 2026 · www.futurelinkconsultants.com · Regulated Canadian Immigration Consultants | 25+ Years in Study Abroad & Immigration | 19+ Countries Option | Expertise in Student | Visitor | Spouse | Immigration | Refusal Cases.",
    W - 80,
  );
  pdf.text(footerLines, W / 2, 812, { align: "center" });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const buf = Buffer.from(pdf.output("arraybuffer", { compress: true }));
  fs.writeFileSync(OUT, buf);
  console.log(`✓ Wrote ${OUT} (${(buf.length / 1024).toFixed(1)} KB)`);
  console.log(`  HTML preview: public/specimens/canada-student-visa-outside-canada-checklist.html`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
