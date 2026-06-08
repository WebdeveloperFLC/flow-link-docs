#!/usr/bin/env node
/**
 * Scaffold coaching JSON content from registry (additive).
 * Run: node scripts/scaffold-coaching-content.mjs
 */
import fs from "fs";
import path from "path";
import { buildAcademyMetadata, buildChecklistSpec } from "./lib/coaching-content-builder.mjs";
import { registryNeedingScaffold } from "./lib/coaching-service-registry.mjs";

const CONTENT_ROOT = path.join(process.cwd(), "content/service-library");
const CHECKLIST_ROOT = path.join(process.cwd(), "content/checklists");

let written = 0;
for (const entry of registryNeedingScaffold()) {
  const metaPath = path.join(CONTENT_ROOT, entry.jsonFile);
  if (!fs.existsSync(metaPath)) {
    fs.writeFileSync(metaPath, JSON.stringify(buildAcademyMetadata(entry), null, 2) + "\n");
    written++;
  }

  const checklistFile = `${entry.checklistSlug ?? entry.jsonFile.replace(/^coaching-/, "").replace(/\.json$/, "")}.json`;
  const checklistPath = path.join(CHECKLIST_ROOT, checklistFile);
  if (entry.checklistSlug && !fs.existsSync(checklistPath)) {
    fs.writeFileSync(checklistPath, JSON.stringify(buildChecklistSpec(entry), null, 2) + "\n");
  }
}

console.log(`Scaffolded ${written} new academy metadata JSON files.`);
