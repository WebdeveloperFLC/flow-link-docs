#!/usr/bin/env node
/**
 * Audit coaching service_library content coverage (local registry + content files).
 * Run: node scripts/audit-coaching-library.mjs
 */
import fs from "fs";
import path from "path";
import { COACHING_REGISTRY } from "./lib/coaching-service-registry.mjs";

const CONTENT_ROOT = path.join(process.cwd(), "content/service-library");
const SPECIMEN_ROOT = path.join(process.cwd(), "public/specimens/coaching");

const rows = COACHING_REGISTRY.map((entry) => {
  const jsonPath = path.join(CONTENT_ROOT, entry.jsonFile);
  const hasJson = fs.existsSync(jsonPath);
  let hasDisplayName = false;
  let quizCount = 0;
  if (hasJson) {
    const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    hasDisplayName = !!meta.displayName;
    quizCount = Array.isArray(meta.quiz) ? meta.quiz.length : 0;
  }
  const specimenPath = entry.checklistHtml
    ? path.join(process.cwd(), "public", entry.checklistHtml.replace(/^\//, ""))
    : null;
  const hasSpecimen = specimenPath ? fs.existsSync(specimenPath) : false;

  const gaps = [];
  if (!hasJson) gaps.push("missing_json");
  if (!hasDisplayName) gaps.push("missing_displayName");
  if (quizCount < 3) gaps.push("thin_quiz");
  if (entry.checklistHtml && !hasSpecimen) gaps.push("missing_specimen");

  return {
    id: entry.id,
    service: entry.service,
    sub_service: entry.sub_service,
    family: entry.family,
    phase: entry.phase,
    gaps,
    ok: gaps.length === 0,
  };
});

const failing = rows.filter((r) => !r.ok);
console.log(`Coaching audit: ${rows.length} registry entries, ${rows.length - failing.length} OK, ${failing.length} gaps\n`);

if (failing.length > 0) {
  console.table(failing);
  process.exitCode = 1;
} else {
  console.log("All coaching registry entries pass local audit.");
}
