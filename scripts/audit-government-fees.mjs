#!/usr/bin/env node
/**
 * Audit government fees: content JSON vs expected structured data.
 * Usage: node scripts/audit-government-fees.mjs [--csv]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "../content/service-library");

const STALE = {};

function parseGovtFromKpi(json) {
  const kpi = (json.kpis ?? []).find((k) =>
    String(k.label ?? "").toLowerCase().includes("government"),
  );
  if (!kpi) return null;
  return { value: kpi.value ?? "", sub: kpi.sub ?? "" };
}

function isVisaFile(file) {
  return (
    file.includes("-visa") ||
    file.includes("-visitor") ||
    file.includes("-spouse") ||
    file.includes("-skilled") ||
    file.includes("-graduate") ||
    file.includes("-green-card") ||
    file.includes("-pgwp") ||
    file.includes("-work-permit") ||
    file.includes("-bowp") ||
    file.includes("-super-visa") ||
    file.includes("-express-entry") ||
    file.includes("-caips") ||
    file.includes("-visitor-record") ||
    file.includes("-subclass") ||
    file.includes("-work-holiday") ||
    file.includes("-opportunity") ||
    file.includes("-job-seeker") ||
    file.includes("-post-study") ||
    file.includes("-skilled-migrant") ||
    file.includes("-dependent")
  );
}

const rows = [];
for (const [file, libraryId] of Object.entries(LIBRARY_IDS)) {
  if (!isVisaFile(file)) continue;
  const fp = path.join(CONTENT_DIR, file);
  if (!fs.existsSync(fp)) {
    rows.push({ file, libraryId, jsonGovt: "MISSING FILE", gap: "no_json" });
    continue;
  }
  const json = JSON.parse(fs.readFileSync(fp, "utf8"));
  const govt = parseGovtFromKpi(json);
  const stale = STALE[file];
  const gap = !govt ? "no_kpi" : stale ? `stale:${stale.was}→${stale.expected}` : "ok";
  rows.push({
    file,
    libraryId,
    service: json.displayName ?? file,
    jsonGovt: govt?.value ?? "—",
    jsonSub: govt?.sub ?? "",
    gap,
  });
}

const csv = process.argv.includes("--csv");
if (csv) {
  console.log("file,library_id,service,json_govt,json_sub,gap");
  for (const r of rows) {
    console.log(
      [r.file, r.libraryId, `"${r.service}"`, r.jsonGovt, `"${r.jsonSub}"`, r.gap].join(","),
    );
  }
} else {
  console.log(`Government fee audit — ${rows.length} visa services\n`);
  const gaps = rows.filter((r) => r.gap !== "ok");
  console.log(`Gaps / stale: ${gaps.length}`);
  for (const r of gaps) {
    console.log(`  ${r.file}: ${r.jsonGovt} (${r.gap})`);
  }
  console.log(`\nOK: ${rows.length - gaps.length}`);
}
