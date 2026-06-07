#!/usr/bin/env node
/**
 * Merge 75-question levelled quiz banks into Canada service-library JSON files.
 * Run: node scripts/apply-canada-quizzes.mjs
 */
import fs from "fs";
import path from "path";
import { BANKS as P1 } from "./canada-quiz-data/banks-part1.mjs";
import { BANKS as P2 } from "./canada-quiz-data/banks-part2.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");

const FILE_MAP = {
  "student-outside-canada": "canada-student-visa.json",
  "visitor-trv": "canada-visitor-visa.json",
  "study-permit-extension": "canada-study-permit-extension.json",
  "visitor-record": "canada-visitor-record.json",
  bowp: "canada-bowp.json",
  pgwp: "canada-pgwp.json",
  "work-permit": "canada-work-permit.json",
  "express-entry": "canada-express-entry-pr.json",
  "super-visa": "canada-super-visa.json",
  caips: "canada-caips-notes.json",
  "spouse-dependent-owp": "canada-spouse-dependent-owp.json",
};

const BANKS = { ...P1, ...P2 };

for (const [key, file] of Object.entries(FILE_MAP)) {
  const bank = BANKS[key];
  if (!bank) {
    console.warn("Missing bank:", key);
    continue;
  }
  const fp = path.join(ROOT, file);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const quiz = [1, 2, 3].flatMap((level) =>
    (bank[level] ?? []).map((q) => ({
      ...q,
      level: q.level ?? level,
    })),
  );
  meta.quiz = quiz;
  meta.version = meta.version?.startsWith("v") ? meta.version.replace(/^v[\d.]+/, "v2.0") : "v2.0";
  if (!meta.changelog) meta.changelog = [];
  meta.changelog.unshift({
    version: "v2.0",
    date: "6 Jun 2026",
    author: "Service Library",
    summary: `Added ${quiz.length} levelled quiz questions (Level 1–3, 25+ each) and expanded counselor content.`,
  });
  fs.writeFileSync(fp, JSON.stringify(meta, null, 2) + "\n");
  console.log(`✓ ${file}: ${quiz.length} quiz questions`);
}

console.log("Done.");
