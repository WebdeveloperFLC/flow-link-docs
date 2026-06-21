/**
 * Build checklist spec from service-library JSON (auto layout matching Claude style).
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const CHECKLIST_OVERRIDE = path.join(process.cwd(), "content/checklists");

const VERIFY_URLS = {
  canada: "canada.ca",
  uk: "gov.uk",
  usa: "uscis.gov / travel.state.gov",
  australia: "homeaffairs.gov.au",
  germany: "make-it-in-germany.com",
  nz: "immigration.govt.nz",
};

const WORKFLOW_ITEMS = [
  {
    title: "Government visa fee paid; official receipt saved",
    note: "Separate consultancy fee on invoice. Never commingle with government payment.",
    badge: "REQUIRED",
  },
  {
    title: "Client reviewed, signed, and dated this checklist",
    badge: "REQUIRED",
  },
  {
    title: "Quality review / QA sign-off — all documents cross-checked",
    note: "Verify expiry dates, translations, and consistency across forms.",
    badge: "REQUIRED",
  },
  {
    title: "Application lodged; confirmation / reference number saved on file",
    note: "Screenshot portal confirmation and note tracking details for client.",
    badge: "REQUIRED",
  },
];

function slugFromFile(file) {
  return file.replace(".json", "");
}

function countryFromSlug(slug) {
  const c = slug.split("-")[0];
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function verifyUrl(slug) {
  const c = slug.split("-")[0];
  return VERIFY_URLS[c] ?? "official embassy website";
}

function serviceKind(slug) {
  if (/student|study|pgwp|graduate-route|post-study|subclass-485/i.test(slug)) return "student";
  if (/visitor|super-visa|visitor-record|trv/i.test(slug)) return "visitor";
  if (/spouse|partner|dependent/i.test(slug)) return "spouse";
  if (/skilled|express|work|bowp|green-card|opportunity|job-seeker|migration|caips/i.test(slug))
    return "work";
  return "general";
}

function identityItems(slug, kind) {
  const country = countryFromSlug(slug);
  const base = [
    {
      title: "Valid passport — bio page and relevant visa/stamp pages",
      note: "Must meet validity rules for destination country; colour scans, no glare.",
      badge: "REQUIRED",
    },
    {
      title: "Passport-size photographs per embassy / online portal specifications",
      badge: "REQUIRED",
    },
    {
      title: "Visa application form complete, signed, and reviewed for consistency",
      note: 'Use "N/A" where applicable; answers must match supporting documents.',
      badge: "REQUIRED",
    },
  ];
  if (kind === "student") {
    base.push({
      title: "Letter of acceptance / enrollment from recognised institution",
      note: "Program name, dates, and tuition must match financial evidence.",
      badge: "REQUIRED",
    });
  }
  if (kind === "visitor") {
    base.push({
      title: "Travel itinerary / invitation letter (if visiting family or business)",
      badge: "IF APPLICABLE",
    });
  }
  if (kind === "spouse") {
    base.push({
      title: "Relationship evidence — marriage certificate, photos, communication history",
      badge: "REQUIRED",
    });
  }
  if (country === "Germany") {
    base.push({
      title: "Blocked account (Sperrkonto) or alternative financial proof per embassy checklist",
      badge: "IF REQUIRED",
    });
  }
  return base;
}

function eligibilityItems(meta) {
  return (meta.eligibility ?? []).map((row) => ({
    title: row.criterion,
    note: row.note ?? undefined,
    badge: row.met === false ? "IF APPLICABLE" : "REQUIRED",
  }));
}

function redFlagReminders(meta) {
  return (meta.redFlags ?? []).slice(0, 4).map((r) => ({
    title: r.title,
    note: r.fix ? `Fix: ${r.fix}` : r.description,
    badge: "RECOMMENDED",
  }));
}

/** document_manifest[] → printable HTML sections (uploadable docs only). */
function manifestChecklistSections(meta) {
  const manifest = meta.document_manifest;
  if (!Array.isArray(manifest) || manifest.length === 0) return null;

  /** @type {Map<string, { title: string, items: Array<{ title: string, note?: string, badge: string }> }>} */
  const byLabel = new Map();
  const sorted = [...manifest].sort(
    (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0),
  );

  for (const row of sorted) {
    const title = row.section_label ?? "Identity & travel documents";
    if (!byLabel.has(title)) {
      byLabel.set(title, { title, items: [] });
    }
    byLabel.get(title).items.push({
      title: row.label,
      note: row.notes ?? undefined,
      badge: row.mandatory === false ? "IF APPLICABLE" : "REQUIRED",
    });
  }

  return [...byLabel.values()];
}

export function buildFromService(file) {
  const slug = slugFromFile(file);
  const overridePath = path.join(CHECKLIST_OVERRIDE, `${slug}.json`);
  if (fs.existsSync(overridePath)) {
    const spec = JSON.parse(fs.readFileSync(overridePath, "utf8"));
    return { ...spec, slug, displayName: spec.displayName };
  }

  const fp = path.join(ROOT, file);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const kind = serviceKind(slug);
  const country = countryFromSlug(slug);

  const sections = [];
  let letter = "A";

  const manifestSections = manifestChecklistSections(meta);
  if (manifestSections?.length) {
    for (const sec of manifestSections) {
      sections.push({ id: letter++, title: sec.title, items: sec.items });
    }
  } else {
    sections.push({
      id: letter++,
      title: "Identity & travel documents",
      items: identityItems(slug, kind),
    });
  }

  const elig = eligibilityItems(meta);
  if (elig.length) {
    sections.push({
      id: letter++,
      title: "Eligibility & core documents",
      items: elig,
    });
  }

  const reminders = redFlagReminders(meta);
  if (reminders.length) {
    sections.push({
      id: letter++,
      title: "Common issues to verify before submit",
      items: reminders,
    });
  }

  sections.push({
    id: letter++,
    title: "Fees & submission",
    items: WORKFLOW_ITEMS,
  });

  const aboutDesc = meta.about?.find((a) => a.label === "Description")?.value;
  const authority = meta.about?.find((a) => a.label === "Key authority")?.value;

  return {
    slug,
    displayName: meta.displayName,
    title: "Document Checklist",
    subtitle: `${country} · ${meta.displayName?.split("–").pop()?.trim() ?? "Visa application"}`,
    streamLabel: meta.shortDescription?.split("·")[0]?.trim(),
    updatedLabel: meta.updatedLabel ?? "Updated Jun 2026",
    verifyUrl: verifyUrl(slug),
    website: "futurelinkconsultants.com",
    policyBanner:
      meta.policyAlert?.active !== false && meta.policyAlert?.summary
        ? meta.policyAlert.summary
        : aboutDesc?.slice(0, 220) ?? undefined,
    metaFields: [
      { key: "client_name", label: "Client name", placeholder: "Full name as on passport" },
      { key: "file_id", label: "File ID", placeholder: "FLC-2026-XXXX" },
      { key: "country_of_application", label: "Country of application", placeholder: "Country of residence / application" },
      { key: "service_pathway", label: "Service pathway", placeholder: meta.displayName?.split("–").pop()?.trim() ?? "" },
      { key: "key_authority", label: "Key authority", placeholder: authority?.slice(0, 40) ?? country },
      { key: "submission_date", label: "Submission date", placeholder: "yyyy-mm-dd" },
    ],
    sections,
  };
}

export function listServiceFiles() {
  return fs
    .readdirSync(ROOT)
    .filter(
      (f) =>
        f.endsWith(".json") &&
        !f.includes("template") &&
        !f.includes("bulk") &&
        f !== "metadata-template.json",
    );
}

export { slugFromFile };
