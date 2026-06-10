#!/usr/bin/env node
/** Verify workingRights + fullCostBreakdown on all visa JSON files. */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const visaFiles = Object.keys(LIBRARY_IDS).filter((f) => !f.startsWith("coaching-"));

let ok = 0;
const gaps = [];

for (const file of visaFiles) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    gaps.push({ file, issue: "missing JSON" });
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const wrA = meta.workingRights?.applicant?.summary;
  const wrS = meta.workingRights?.spouse?.summary;
  const sections = meta.fullCostBreakdown?.sections?.length ?? 0;
  if (!wrA || !wrS || sections < 4) {
    gaps.push({
      file,
      issue: [
        !wrA && "no applicant rights",
        !wrS && "no spouse rights",
        sections < 4 && `cost sections=${sections}`,
      ]
        .filter(Boolean)
        .join(", "),
    });
  } else {
    ok++;
  }
}

console.log(`Visa services with full country insights: ${ok}/${visaFiles.length}`);
if (gaps.length) {
  console.log("\nGaps:");
  for (const g of gaps) console.log(`  ✗ ${g.file}: ${g.issue}`);
  process.exit(1);
}
console.log("All visa services ready for DB sync.");
