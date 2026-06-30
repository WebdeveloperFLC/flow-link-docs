#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(ROOT, "content/service-library");
const publicRoot = path.join(ROOT, "public/content/service-library");

function copyDownloadsDir(srcDir, rel = "") {
  if (!fs.existsSync(srcDir)) return 0;
  let copied = 0;
  for (const name of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, name);
    const relPath = rel ? `${rel}/${name}` : name;
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copied += copyDownloadsDir(srcPath, relPath);
    } else if (relPath.includes("/downloads/") || relPath.includes("\\downloads\\")) {
      const dest = path.join(publicRoot, relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(srcPath, dest);
      copied++;
    }
  }
  return copied;
}

if (!fs.existsSync(contentRoot)) {
  console.warn(`[sync-service-library-downloads] Content root not found, skipping: ${contentRoot}`);
  process.exit(0);
}

const count = copyDownloadsDir(contentRoot);
console.log(`[sync-service-library-downloads] Copied ${count} file(s) → public/content/service-library/`);
