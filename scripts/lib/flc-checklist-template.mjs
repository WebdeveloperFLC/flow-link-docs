const BADGE_STYLES = {
  REQUIRED: "badge-req",
  "IF APPLICABLE": "badge-neutral",
  "IF REQUIRED": "badge-neutral",
  "IF REQUIRED BY DLI": "badge-neutral",
  "IF SPONSORED": "badge-teal",
  RECOMMENDED: "badge-ok",
  "UPDATED 2025": "badge-warn",
  "2024 RULE": "badge-rule",
  "EXEMPT (2026)": "badge-violet",
  "PER VISA OFFICE": "badge-amber",
  "REQUIRED CHECK": "badge-req",
};

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function badgeClass(badge) {
  return BADGE_STYLES[badge] ?? "badge-neutral";
}

/** Standard footer tagline — shown on every branded checklist. */
export const FLC_CHECKLIST_FOOTER_TAGLINE =
  "Regulated Canadian Immigration Consultants | 25+ Years in Study Abroad & Immigration | 19+ Countries Option | Expertise in Student | Visitor | Spouse | Immigration | Refusal Cases.";

function metaKey(field) {
  if (field.key) return field.key;
  return String(field.label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** URL query keys used when a checklist is opened from a linked client file. */
const META_QUERY_ALIASES = {
  client_name: ["client", "clientName", "client_name", "name"],
  file_id: ["fileId", "file_id", "applicationId", "application_id", "regNumber"],
  country_of_application: ["country", "countryOfApplication", "country_of_application", "residence"],
  country_of_residence: ["country", "countryOfResidence", "country_of_residence", "residence"],
  service_pathway: ["pathway", "service", "servicePathway", "service_pathway"],
  program_level: ["programLevel", "program_level", "level"],
  dli_type: ["dliType", "dli_type"],
  key_authority: ["authority", "keyAuthority", "key_authority"],
  submission_date: ["date", "submissionDate", "submission_date"],
};

function countItems(spec) {
  return spec.sections.reduce((n, s) => n + s.items.length, 0);
}

export function renderChecklistHtml(spec, logoHref = "./flc-logo.png") {
  const total = countItems(spec);
  const displayTitle = spec.displayName ?? spec.title;

  const metaHtml = (spec.metaFields ?? [])
    .map(
      (f) => `
      <div class="meta-cell">
        <label>${esc(f.label)}</label>
        <div class="meta-value" data-meta-key="${esc(metaKey(f))}">${esc(f.value ?? f.placeholder ?? "")}</div>
      </div>`,
    )
    .join("");

  const sectionsHtml = spec.sections
    .map((sec) => {
      const itemsHtml = sec.items
        .map(
          (it) => `
        <div class="check-item">
          <div class="check-box"></div>
          <div class="check-body">
            <div class="check-title">${esc(it.title)}</div>
            ${it.note ? `<div class="check-note">${esc(it.note)}</div>` : ""}
            ${it.badge ? `<span class="badge ${badgeClass(it.badge)}">${esc(it.badge)}</span>` : ""}
          </div>
        </div>`,
        )
        .join("");
      return `
      <section class="section">
        <div class="section-head">
          <span class="section-id">${esc(sec.id)}</span>
          <span class="section-title">${esc(sec.title)}</span>
          <span class="section-count">0/${sec.items.length}</span>
        </div>
        ${itemsHtml}
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(displayTitle)} — Document Checklist | Future Link Consultants</title>
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
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: var(--ink);
      background: #f1f5f9;
      font-size: 13px;
      line-height: 1.5;
    }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page { box-shadow: none; margin: 0; }
      .section { break-inside: avoid; }
    }
    .no-print {
      text-align: center;
      padding: 12px;
      color: var(--muted);
      font-size: 12px;
    }
    .page {
      max-width: 880px;
      margin: 16px auto 32px;
      background: #fff;
      box-shadow: 0 4px 24px rgba(15,45,82,.1);
    }
    .logo-bar {
      background: linear-gradient(135deg, #0f172a, var(--blue-dark));
      padding: 16px 24px;
      text-align: center;
    }
    .logo-bar img { height: 64px; max-width: 100%; object-fit: contain; }
    .hero {
      background: linear-gradient(90deg, var(--blue), #4f46e5);
      color: #fff;
      padding: 16px 24px;
    }
    .hero h1 { margin: 0; font-size: 1.35rem; font-weight: 700; }
    .hero .sub { margin: 4px 0 0; opacity: .92; font-size: .85rem; }
    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 24px;
      margin-top: 10px;
      font-size: .75rem;
      opacity: .9;
    }
    .policy {
      background: var(--amber-bg);
      border-left: 4px solid var(--amber-border);
      padding: 12px 20px;
      font-size: .8rem;
      color: #92400e;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px 20px;
      padding: 18px 24px;
      background: #f8fafc;
      border-bottom: 2px solid var(--line);
    }
    @media (max-width: 640px) { .meta-grid { grid-template-columns: 1fr 1fr; } }
    .meta-cell label {
      display: block;
      font-size: .6rem;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--blue);
      margin-bottom: 4px;
    }
    .meta-value {
      border-bottom: 1.5px solid var(--blue);
      min-height: 22px;
      color: var(--ink);
      font-size: .8rem;
    }
    .meta-value.is-placeholder { color: var(--muted); }
    .meta-note {
      margin: 0;
      padding: 10px 24px 14px;
      background: #eff6ff;
      border-bottom: 1px solid var(--line);
      font-size: .72rem;
      color: #1e40af;
      line-height: 1.5;
    }
    .meta-note strong { color: var(--blue); }
    .progress-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 24px;
      background: #eef2ff;
      border-bottom: 1px solid var(--line);
      font-size: .75rem;
      font-weight: 700;
      color: var(--blue);
    }
    .section { border-bottom: 1px solid var(--line); }
    .section-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 24px;
      background: #f1f5f9;
      border-bottom: 1px solid var(--line);
      font-weight: 700;
      font-size: .72rem;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--blue);
    }
    .section-id {
      background: var(--blue);
      color: #fff;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: .7rem;
    }
    .section-title { flex: 1; }
    .section-count { color: var(--muted); font-weight: 600; }
    .check-item {
      display: flex;
      gap: 12px;
      padding: 14px 24px;
      border-bottom: 1px solid #f1f5f9;
    }
    .check-item:last-child { border-bottom: none; }
    .check-box {
      width: 18px;
      height: 18px;
      border: 2px solid var(--blue);
      border-radius: 3px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .check-title { font-weight: 600; color: var(--ink); margin-bottom: 4px; }
    .check-note { font-size: .78rem; color: var(--muted); margin-bottom: 6px; }
    .badge {
      display: inline-block;
      font-size: .58rem;
      font-weight: 800;
      letter-spacing: .06em;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-req { background: #dbeafe; color: #1d4ed8; }
    .badge-neutral { background: #f1f5f9; color: #475569; }
    .badge-teal { background: #ccfbf1; color: #0f766e; }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-warn { background: #ffedd5; color: #c2410c; }
    .badge-rule { background: #ede9fe; color: #6d28d9; }
    .badge-violet { background: #f3e8ff; color: #7e22ce; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    .signoff {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      padding: 24px;
    }
    .signoff label {
      font-size: .65rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--muted);
    }
    .sign-line {
      border-bottom: 1.5px solid var(--ink);
      min-height: 36px;
      margin-top: 28px;
    }
    .footer {
      background: #0f172a;
      color: #94a3b8;
      text-align: center;
      padding: 14px 24px;
      font-size: .68rem;
      line-height: 1.6;
    }
    .footer strong { color: #e2e8f0; display: block; margin-bottom: 4px; }
  </style>
</head>
<body>
  <p class="no-print">Print → Save as PDF · Future Link internal checklist specimen</p>
  <article class="page">
    <header class="logo-bar">
      <img src="${esc(logoHref)}" alt="Future Link Consultants" />
    </header>
    <div class="hero">
      <h1>${esc(spec.subtitle ?? spec.title)}</h1>
      <p class="sub">${esc(displayTitle)}${spec.streamLabel ? ` · ${esc(spec.streamLabel)}` : ""}</p>
      <div class="hero-meta">
        <span>${esc(spec.updatedLabel ?? "Updated 2026")}</span>
        <span>${esc(spec.website ?? "futurelinkconsultants.com")}</span>
        <span>Verify at ${esc(spec.verifyUrl ?? "official government site")}</span>
      </div>
    </div>
    ${spec.policyBanner ? `<div class="policy">${esc(spec.policyBanner)}</div>` : ""}
    <div class="meta-grid">${metaHtml}</div>
    <p class="meta-note"><strong>Note:</strong> When this checklist is attached to a client file in Future Link DMS, client name, file ID, country, pathway, and submission date are filled automatically from the applicant profile. (Print specimens show placeholders until linked.)</p>
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
      Always verify requirements at ${esc(spec.verifyUrl ?? "official sources")} before submission · v2.0 Jun 2026<br />
      www.futurelinkconsultants.com<br />
      ${esc(FLC_CHECKLIST_FOOTER_TAGLINE)}
    </footer>
  </article>
  <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var aliases = ${JSON.stringify(META_QUERY_ALIASES)};
      function pick(key) {
        var keys = aliases[key] || [key];
        for (var i = 0; i < keys.length; i++) {
          var v = params.get(keys[i]);
          if (v) return v;
        }
        return null;
      }
      document.querySelectorAll("[data-meta-key]").forEach(function (el) {
        var key = el.getAttribute("data-meta-key");
        var value = pick(key);
        if (!value) return;
        el.textContent = value;
        el.classList.remove("is-placeholder");
      });
    })();
  </script>
</body>
</html>`;
}

export { countItems, BADGE_STYLES };
