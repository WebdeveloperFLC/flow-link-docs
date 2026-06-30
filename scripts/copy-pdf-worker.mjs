#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  path.join(ROOT, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  path.join(ROOT, "node_modules/pdfjs-dist/build/pdf.worker.mjs"),
];
const src = candidates.find((p) => fs.existsSync(p));
const dest = path.join(ROOT, "public/pdf.worker.min.mjs");

if (!src) {
  console.warn(`[copy-pdf-worker] Source not found, skipping. Tried:\n  ${candidates.join("\n  ")}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[copy-pdf-worker] Copied → public/pdf.worker.min.mjs`);
