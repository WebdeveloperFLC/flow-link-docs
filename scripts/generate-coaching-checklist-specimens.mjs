#!/usr/bin/env node
/**
 * Generate HTML enrollment checklists for coaching programs.
 * Usage: node scripts/generate-coaching-checklist-specimens.mjs
 */
import fs from "fs";
import path from "path";

const CHECKLIST_DIR = path.join(process.cwd(), "content/checklists");
const OUT_DIR = path.join(process.cwd(), "public/specimens/coaching");
const LOGO_CANDIDATES = [
  path.join(process.cwd(), "public/specimens/flc-logo.png"),
  path.join(process.cwd(), "src/assets/flc-logo.png"),
];

const SPECS = [
  "ielts-academic-regular.json",
  "ielts-academic-crash.json",
  "ielts-gt-regular.json",
];

function logoDataUri() {
  for (const p of LOGO_CANDIDATES) {
    if (fs.existsSync(p)) {
      return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    }
  }
  throw new Error("flc-logo.png not found");
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function badgeClass(badge) {
  const map = {
    REQUIRED: "badge-req",
    RECOMMENDED: "badge-ok",
    "IF APPLICABLE": "badge-neutral",
  };
  return map[badge] ?? "badge-neutral";
}

function countItems(spec) {
  return spec.sections.reduce((n, s) => n + s.items.length, 0);
}

function renderHtml(spec, logoSrc) {
  const total = countItems(spec);
  const metaHtml = (spec.metaFields ?? [])
    .map(
      (f) => `      <div class="meta-cell">
        <label>${esc(f.label)}</label>
        <div class="meta-value" data-meta-key="${esc(f.key)}">${esc(f.placeholder ?? "")}</div>
      </div>`,
    )
    .join("\n");

  const sectionsHtml = spec.sections
    .map((section) => {
      const items = section.items
        .map(
          (item) => `        <div class="check-item">
          <div class="check-box"></div>
          <div class="check-body">
            <div class="check-title">${esc(item.title)}</div>
            ${item.note ? `<div class="check-note">${esc(item.note)}</div>` : ""}
            <span class="badge ${badgeClass(item.badge)}">${esc(item.badge)}</span>
          </div>
        </div>`,
        )
        .join("\n");
      return `      <section class="section">
        <div class="section-head">
          <span class="section-id">${esc(section.id)}</span>
          <span class="section-title">${esc(section.title)}</span>
          <span class="section-count">0/${section.items.length}</span>
        </div>
        ${items}
      </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(spec.displayName)} — Document Checklist | Future Link Consultants</title>
  <style>
    :root {
      --blue: #1a4f8c;
      --blue-dark: #0f2d52;
      --red: #c41e3a;
      --ink: #1e293b;
      --muted: #64748b;
      --line: #e2e8f0;
      --amber-bg: #fffbeb;
      --amber-border: #f59e0b;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; color: var(--ink); background: #f1f5f9; font-size: 13px; line-height: 1.5; }
    @media print { body { background: #fff; } .no-print { display: none !important; } .page { box-shadow: none; margin: 0; } .section { break-inside: avoid; } }
    .no-print { text-align: center; padding: 12px; color: var(--muted); font-size: 12px; }
    .page { max-width: 880px; margin: 16px auto 32px; background: #fff; box-shadow: 0 4px 24px rgba(15,45,82,.1); }
    .logo-bar { background: linear-gradient(135deg, #0f172a, var(--blue-dark)); padding: 16px 24px; text-align: center; }
    .logo-bar img { height: 64px; max-width: 100%; object-fit: contain; }
    .hero { background: linear-gradient(90deg, var(--blue), #4f46e5); color: #fff; padding: 16px 24px; }
    .hero h1 { margin: 0; font-size: 1.35rem; font-weight: 700; }
    .hero .sub { margin: 4px 0 0; opacity: .92; font-size: .85rem; }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-top: 10px; font-size: .75rem; opacity: .9; }
    .policy { background: var(--amber-bg); border-left: 4px solid var(--amber-border); padding: 12px 20px; font-size: .8rem; color: #92400e; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 20px; padding: 18px 24px; background: #f8fafc; border-bottom: 2px solid var(--line); }
    .meta-cell label { display: block; font-size: .68rem; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
    .meta-value { border-bottom: 1px dashed var(--line); min-height: 22px; font-size: .85rem; color: var(--ink); }
    .meta-value.is-placeholder { color: var(--muted); font-style: italic; }
    .meta-note { padding: 10px 24px; font-size: .75rem; color: var(--muted); background: #fff; border-bottom: 1px solid var(--line); }
    .progress-bar { display: flex; justify-content: space-between; padding: 10px 24px; background: #eef2ff; font-size: .75rem; font-weight: 700; color: var(--blue); }
    .section { padding: 0 24px 8px; }
    .section-head { display: flex; align-items: center; gap: 10px; padding: 14px 0 8px; border-bottom: 2px solid var(--line); margin-bottom: 8px; }
    .section-id { background: var(--blue); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .75rem; }
    .section-title { font-weight: 700; flex: 1; }
    .section-count { font-size: .75rem; color: var(--muted); }
    .check-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .check-box { width: 18px; height: 18px; border: 2px solid var(--blue); border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
    .check-title { font-weight: 600; font-size: .85rem; }
    .check-note { font-size: .75rem; color: var(--muted); margin-top: 3px; }
    .badge { display: inline-block; font-size: .62rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-top: 6px; text-transform: uppercase; }
    .badge-req { background: #fee2e2; color: #991b1b; }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-neutral { background: #e2e8f0; color: #475569; }
    .signoff { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 20px 24px; border-top: 2px solid var(--line); }
    .signoff label { font-size: .72rem; font-weight: 700; color: var(--muted); display: block; margin-bottom: 8px; }
    .sign-line { border-bottom: 1px solid var(--ink); height: 32px; }
    .footer { background: #0f172a; color: #94a3b8; text-align: center; padding: 14px 24px; font-size: .68rem; line-height: 1.6; }
    .footer strong { color: #e2e8f0; display: block; margin-bottom: 4px; }
  </style>
</head>
<body>
  <p class="no-print">Print → Save as PDF · <a href="ielts-test-reference.html">IELTS test reference</a> · <a href="index.html">All coaching specimens</a></p>
  <article class="page">
    <header class="logo-bar">
      <img src="${logoSrc}" alt="Future Link Consultants" />
    </header>
    <div class="hero">
      <h1>${esc(spec.subtitle ?? spec.title)}</h1>
      <p class="sub">${esc(spec.displayName)} · ${esc(spec.streamLabel)}</p>
      <div class="hero-meta">
        <span>${esc(spec.updatedLabel)}</span>
        <span>${esc(spec.website)}</span>
        <span>Verify at ieltsidpindia.com</span>
      </div>
    </div>
    <div class="policy">${esc(spec.policyBanner)}</div>
    <div class="meta-grid">
${metaHtml}
    </div>
    <p class="meta-note"><strong>Note:</strong> When this checklist is attached to a client file in Future Link DMS, client name, file ID, and enrollment date are filled automatically from the applicant profile. (Print specimens show placeholders until linked.)</p>
    <div class="progress-bar">
      <span>COMPLETION</span>
      <span>0 / ${total} items</span>
    </div>
${sectionsHtml}
    <div class="signoff">
      <div><label>Client signature &amp; date</label><div class="sign-line"></div></div>
      <div><label>Counselor / QA sign-off &amp; date</label><div class="sign-line"></div></div>
    </div>
    <footer class="footer">
      <strong>Future Link Consultants — Internal Working Document · Not an official government form</strong>
      Verify exam booking at ieltsidpindia.com · ${esc(spec.updatedLabel)}<br />
      www.futurelinkconsultants.com<br />
      ${esc(spec.footerTagline)}
    </footer>
  </article>
</body>
</html>`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const logoSrc = logoDataUri();
  for (const file of SPECS) {
    const spec = JSON.parse(fs.readFileSync(path.join(CHECKLIST_DIR, file), "utf8"));
    const out = path.join(OUT_DIR, `${spec.slug}-checklist.html`);
    fs.writeFileSync(out, renderHtml(spec, logoSrc));
    console.log(`✓ ${path.basename(out)} (${countItems(spec)} items)`);
  }
}

main();
