#!/usr/bin/env node
/**
 * Inject workingRights + fullCostBreakdown into all visa service-library JSON files.
 *
 *   node scripts/inject-country-insights.mjs
 * Then regenerate SQL seeds:
 *   node scripts/generate-visa-metadata-sql-split.mjs
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";
import { buildInsightsForFile } from "./lib/country-insights-templates.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const visaFiles = Object.keys(LIBRARY_IDS).filter((f) => !f.startsWith("coaching-"));

let updated = 0;
for (const file of visaFiles) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) continue;
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const insights = buildInsightsForFile(file, meta.displayName);
  if (!insights) {
    console.warn(`Skip (no template): ${file}`);
    continue;
  }
  meta.workingRights = insights.workingRights;
  meta.fullCostBreakdown = insights.fullCostBreakdown;
  fs.writeFileSync(fp, JSON.stringify(meta, null, 2) + "\n");
  updated++;
  console.log(`✓ ${file}`);
}

console.log(`\nUpdated ${updated} visa JSON files with country insights.`);
