#!/usr/bin/env node
/**
 * Pilot validation — document_manifest integrity + template document-only output.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";
import {
  buildWorkflowTemplateFromManifest,
  validateDocumentManifest,
} from "./lib/document-manifest.mjs";
import { isValidMasterItemCode } from "./lib/document-master-codes.mjs";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PILOT = "canada-spouse-dependent-visitor";
const jsonPath = path.join(REPO, "content/service-library", `${PILOT}.json`);

let failed = 0;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed++;
}

const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const manifest = validateDocumentManifest(meta.document_manifest, PILOT);

for (const row of manifest) {
  if (!isValidMasterItemCode(row.master_item_code)) {
    fail(`invalid master_item_code: ${row.master_item_code}`);
  }
}

const template = buildWorkflowTemplateFromManifest({
  slug: PILOT,
  displayName: meta.displayName,
  libraryId: LIBRARY_IDS[`${PILOT}.json`],
  country: "Canada",
  manifest,
});

const docItems = template.items.filter((i) => i.requirement_kind === "document");
const milestoneItems = template.items.filter((i) => i.requirement_kind === "milestone");

if (docItems.length !== manifest.length) {
  fail(`expected ${manifest.length} document template items, got ${docItems.length}`);
}

if (milestoneItems.length !== 4) {
  fail(`expected 4 milestone items, got ${milestoneItems.length}`);
}

for (const item of docItems) {
  if (!item.master_item_code) fail(`document item missing master_item_code: ${item.id}`);
}

const htmlPath = path.join(REPO, "public/specimens/checklists", `${PILOT}.html`);
if (!fs.existsSync(htmlPath)) {
  fail(`missing generated HTML: ${htmlPath}`);
} else {
  const html = fs.readFileSync(htmlPath, "utf8");
  for (const row of manifest) {
    if (!html.includes(row.label)) {
      fail(`HTML missing manifest label: ${row.label}`);
    }
  }
  // Print handout still includes eligibility/red-flag sections — not CRM upload rows.
  if (!html.includes("Eligibility &amp; core documents") && !html.includes("Eligibility & core documents")) {
    fail("HTML print handout should retain eligibility section for counselors");
  }
  const identityBlock = html.split("Identity & travel documents")[1]?.split("Eligibility")[0] ?? "";
  if (identityBlock.includes("Principal applicant has clear Canadian pathway")) {
    fail("Identity section must not include eligibility criteria");
  }
}

if (failed > 0) {
  console.error(`\n${failed} pilot validation failure(s).`);
  process.exit(1);
}

console.log(`OK pilot ${PILOT}: ${manifest.length} manifest docs, ${milestoneItems.length} milestones`);
