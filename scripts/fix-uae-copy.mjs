#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const FILES = [
  "uae-student-visa.json",
  "uae-spouse-dependent-visa.json",
  "uae-visitor-visa.json",
  "uae-work-permit.json",
  "uae-golden-visa.json",
];

const PAIRS = [
  ["University admission (Zulassung)", "Unconditional admission from licensed UAE institution"],
  ["Zulassung", "university admission letter"],
  ["required living funds for 2026 (12 × €992/month)", "Tuition payment + living support per institution guidelines"],
  ["Typically required living funds (12 months × €992)", "Tuition deposit and sponsor financial proof per institution"],
  ["12 × €992 monthly requirement", "Tuition and living funds per university sponsor guidelines"],
  ["Federal Foreign Office", "ICP UAE / GDRFA (emirate)"],
  ["English Embassy/Consulate in India", "UAE Embassy/Consulate in India"],
  ["admission documentation (India)", "MOFA-attested academic documents"],
  ["Anabin", "KHDA / SPEA / ADEK license list"],
  ["TestDaF", "IELTS/TOEFL"],
  ["Green Card", "Golden Visa"],
  ["USCIS", "ICP UAE"],
  ["Schengen", "UAE"],
  ["€992", "AED living funds"],
];

for (const file of FILES) {
  const fp = path.join(ROOT, file);
  let s = fs.readFileSync(fp, "utf8");
  for (const [from, to] of PAIRS) s = s.split(from).join(to);
  fs.writeFileSync(fp, s);
  console.log("Fixed", file);
}
