#!/usr/bin/env node
/** Generate HTML checklists for MBBS institutions from content/checklists/mbbs-*.json */
import fs from "fs";
import path from "path";
import { renderChecklistHtml, countItems } from "./lib/flc-checklist-template.mjs";

const CHECKLIST_DIR = path.join(process.cwd(), "content/checklists");
const OUT_DIR = path.join(process.cwd(), "public/specimens/checklists");
const LOGO_CANDIDATES = [
  path.join(process.cwd(), "public/specimens/flc-logo.png"),
  path.join(process.cwd(), "src/assets/flc-logo.png"),
];

function logoDataUri() {
  for (const p of LOGO_CANDIDATES) {
    if (fs.existsSync(p)) {
      return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    }
  }
  throw new Error("flc-logo.png not found");
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const logoSrc = logoDataUri();
  const files = fs.readdirSync(CHECKLIST_DIR).filter((f) => f.startsWith("mbbs-") && f.endsWith(".json"));

  for (const file of files.sort()) {
    const spec = JSON.parse(fs.readFileSync(path.join(CHECKLIST_DIR, file), "utf8"));
    const slug = spec.slug ?? file.replace(".json", "");
    const html = renderChecklistHtml(spec, logoSrc);
    const outPath = path.join(OUT_DIR, `${slug}.html`);
    fs.writeFileSync(outPath, html);
    const size = fs.statSync(outPath).size;
    console.log(`✓ ${slug}.html (${countItems(spec)} items, ${size} bytes)`);
  }
}

main();
