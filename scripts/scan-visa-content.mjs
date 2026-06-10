#!/usr/bin/env node
/**
 * Local scan of visa JSON content before DB sync.
 *   node scripts/scan-visa-content.mjs
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const visaFiles = Object.entries(LIBRARY_IDS).filter(([f]) => !f.startsWith("coaching-"));

const issues = [];
for (const [file, id] of visaFiles) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    issues.push({ file, id, problems: ["missing file"] });
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const quiz = meta.quiz ?? [];
  const byLevel = { 1: 0, 2: 0, 3: 0 };
  quiz.forEach((q) => {
    const l = q.level ?? 1;
    if (byLevel[l] !== undefined) byLevel[l]++;
  });
  const problems = [];
  if (quiz.length < 75) problems.push(`quiz=${quiz.length}<75`);
  if (byLevel[1] < 25) problems.push(`L1=${byLevel[1]}<25`);
  if (byLevel[2] < 25) problems.push(`L2=${byLevel[2]}<25`);
  if (byLevel[3] < 25) problems.push(`L3=${byLevel[3]}<25`);
  if ((meta.eligibility ?? []).length < 5) problems.push(`eligibility<5`);
  if ((meta.redFlags ?? []).length < 5) problems.push(`redFlags<5`);
  if ((meta.faqs ?? []).length < 30) problems.push(`faqs=${(meta.faqs ?? []).length}<30`);
  if (!meta.displayName) problems.push("no displayName");
  if (problems.length) {
    issues.push({ file, id, name: meta.displayName, problems });
  }
}

console.log(`Scanned ${visaFiles.length} visa services`);
if (!issues.length) {
  console.log("✓ All local JSON files pass content checks (75 quiz, 25/level, FAQs, red flags, eligibility)");
  process.exit(0);
}
console.log(`✗ ${issues.length} services need attention:\n`);
for (const i of issues) {
  console.log(`  ${i.name ?? i.file} (${i.id})`);
  console.log(`    ${i.problems.join(", ")}\n`);
}
process.exit(1);
