#!/usr/bin/env node
/**
 * Generate Claude-style HTML checklists for all visa services.
 *
 *   node scripts/generate-all-service-checklist-specimens.mjs
 *   → public/specimens/checklists/*.html
 *   → public/specimens/checklists/index.html
 *
 * Canada Student Visa uses full override: content/checklists/canada-student-visa.json
 */
import fs from "fs";
import path from "path";
import { renderChecklistHtml, countItems } from "./lib/flc-checklist-template.mjs";
import { buildFromService, listServiceFiles, slugFromFile } from "./lib/build-checklist-from-service.mjs";

const OUT_DIR = path.join(process.cwd(), "public/specimens/checklists");
const LOGO_CANDIDATES = [
  path.join(process.cwd(), "public/specimens/flc-logo.png"),
  path.join(process.cwd(), "src/assets/flc-logo.png"),
];
const LOGO_DEST = path.join(OUT_DIR, "flc-logo.png");

function resolveLogoPath() {
  for (const p of LOGO_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("flc-logo.png not found in public/specimens or src/assets");
}

function logoDataUri(logoPath) {
  const b64 = fs.readFileSync(logoPath).toString("base64");
  return `data:image/png;base64,${b64}`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const logoPath = resolveLogoPath();
  fs.copyFileSync(logoPath, LOGO_DEST);
  const logoSrc = logoDataUri(logoPath);

  const files = listServiceFiles();
  const indexRows = [];

  for (const file of files.sort()) {
    const spec = buildFromService(file);
    const slug = spec.slug ?? slugFromFile(file);
    const html = renderChecklistHtml(spec, logoSrc);
    const outPath = path.join(OUT_DIR, `${slug}.html`);
    fs.writeFileSync(outPath, html);
    if (slug === "canada-student-visa") {
      fs.writeFileSync(
        path.join(process.cwd(), "public/specimens/canada-student-visa-outside-canada-checklist.html"),
        html,
      );
    }
    const items = countItems(spec);
    indexRows.push({ slug, name: spec.displayName ?? slug, items, file: `${slug}.html` });
    console.log(`✓ ${slug}.html (${items} items)`);
  }

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Future Link — Service Checklists</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1 { color: #1a4f8c; }
    ul { line-height: 2; }
    a { color: #1d4ed8; }
    .note { color: #64748b; font-size: 14px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>Future Link Consultants — Document Checklists</h1>
  <p class="note">Open any checklist → Print → Save as PDF. Each checklist includes the Future Link logo (embedded for reliable printing).</p>
  <p class="note"><img src="${logoSrc.replace(/"/g, "&quot;")}" alt="Future Link" style="height:48px;margin:12px 0" /></p>
  <ul>
${indexRows
  .map((r) => `    <li><a href="${r.file}">${r.name}</a> <span style="color:#64748b">(${r.items} items)</span></li>`)
  .join("\n")}
  </ul>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), indexHtml);
  console.log(`\n✓ index.html (${indexRows.length} checklists)`);
  console.log(`\nOpen: public/specimens/checklists/index.html`);
}

main();
