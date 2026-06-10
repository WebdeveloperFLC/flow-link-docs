#!/usr/bin/env node
/**
 * Minimal markdown → print-friendly HTML (no dependencies).
 * Usage: node scripts/md-to-print-html.mjs docs/guides/offers-discounts-wallet-ai-scope.md
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname, basename } from "path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/md-to-print-html.mjs <path/to/file.md>");
  process.exit(1);
}

const md = readFileSync(resolve(input), "utf8");

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function convert(mdText) {
  const lines = mdText.split("\n");
  const out = [];
  let inCode = false;
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;
    out.push("<table>");
    tableRows.forEach((row, i) => {
      const tag = i === 0 ? "th" : "td";
      const cells = row.split("|").filter((c) => c.trim() !== "");
      if (cells.length === 0) return;
      if (i === 1 && cells.every((c) => /^[-:\s]+$/.test(c.trim()))) return;
      out.push("<tr>" + cells.map((c) => `<${tag}>${inline(c.trim())}</${tag}>`).join("") + "</tr>");
    });
    out.push("</table>");
    tableRows = [];
    inTable = false;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        flushTable();
        out.push('<pre class="code"><code>');
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }

    if (line.includes("|") && line.trim().startsWith("|")) {
      inTable = true;
      tableRows.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      out.push(`<h${level}>${inline(line.replace(/^#+\s/, ""))}</h${level}>`);
    } else if (/^---+$/.test(line.trim())) {
      out.push("<hr>");
    } else if (/^[-*]\s/.test(line)) {
      out.push(`<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`);
    } else if (line.trim() === "") {
      out.push("<br>");
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  flushTable();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

const title = basename(input, ".md");
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.5; color: #111; }
    h1 { font-size: 1.75rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h2 { font-size: 1.35rem; margin-top: 2rem; border-bottom: 1px solid #ccc; }
    h3 { font-size: 1.1rem; margin-top: 1.5rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.9rem; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; }
    th { background: #f5f5f5; }
    code, pre.code { background: #f4f4f4; font-size: 0.85rem; }
    pre.code { padding: 1rem; overflow-x: auto; white-space: pre-wrap; }
    hr { margin: 2rem 0; border: none; border-top: 1px solid #ddd; }
    li { margin: 0.25rem 0 0.25rem 1.5rem; }
    .print-hint { background: #e8f4fd; border: 1px solid #b3d9f2; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
    @media print { .print-hint { display: none; } body { margin: 0; max-width: none; } }
  </style>
</head>
<body>
  <div class="print-hint">
    <strong>Print to PDF:</strong> Press <kbd>Cmd + P</kbd> → choose <strong>Save as PDF</strong> (bottom-left on Mac).
  </div>
  ${convert(md)}
</body>
</html>`;

const outPath = resolve(input).replace(/\.md$/i, ".html");
writeFileSync(outPath, html);
console.log("Created:", outPath);
console.log("Open in Chrome/Safari, then Cmd+P → Save as PDF");
