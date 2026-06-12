/** Stage pipeline definitions — matched by country + keyword overlap on name/service_category. */
import { createHash } from "crypto";
import { LIBRARY_IDS } from "./service-library-ids.mjs";
import { CEE_SINGAPORE_SERVICES } from "./cee-singapore-visa-registry.mjs";

const COUNTRY_FROM_PREFIX = {
  canada: "Canada",
  uk: "United Kingdom",
  usa: "United States",
  australia: "Australia",
  germany: "Germany",
  nz: "New Zealand",
  france: "France",
  italy: "Italy",
  netherlands: "Netherlands",
  ireland: "Ireland",
  spain: "Spain",
  malta: "Malta",
  finland: "Finland",
  sweden: "Sweden",
  austria: "Austria",
  belgium: "Belgium",
  denmark: "Denmark",
  portugal: "Portugal",
  cyprus: "Cyprus",
  lithuania: "Lithuania",
  uae: "UAE",
  poland: "Poland",
  hungary: "Hungary",
  latvia: "Latvia",
  singapore: "Singapore",
};

const STAGE_SETS = {
  study: [
    { key: "enrolled", label: "Enrolled", client_label: "Enrolled", color: "#6366f1", sort: 10 },
    { key: "payment_pending", label: "Payment pending", client_label: "Payment pending", color: "#f59e0b", sort: 20 },
    { key: "payment_received", label: "Payment received", client_label: "Payment received", color: "#22c55e", sort: 30 },
    { key: "docs_collection", label: "Docs collection", client_label: "Collecting documents", color: "#3b82f6", sort: 40 },
    { key: "docs_complete", label: "Docs complete", client_label: "Documents ready", color: "#06b6d4", sort: 50 },
    { key: "offer_letter", label: "Offer letter applied", client_label: "Offer / LOA secured", color: "#8b5cf6", sort: 60 },
    { key: "application_submitted", label: "Application submitted", client_label: "Application lodged", color: "#0ea5e9", sort: 70 },
    { key: "decision_received", label: "Decision received", client_label: "Decision received", color: "#64748b", sort: 80 },
  ],
  default: [
    { key: "enrolled", label: "Enrolled", client_label: "Enrolled", color: "#6366f1", sort: 10 },
    { key: "payment_pending", label: "Payment pending", client_label: "Payment pending", color: "#f59e0b", sort: 20 },
    { key: "payment_received", label: "Payment received", client_label: "Payment received", color: "#22c55e", sort: 30 },
    { key: "docs_collection", label: "Docs collection", client_label: "Collecting documents", color: "#3b82f6", sort: 40 },
    { key: "docs_complete", label: "Docs complete", client_label: "Documents ready", color: "#06b6d4", sort: 50 },
    { key: "application_submitted", label: "Application submitted", client_label: "Application lodged", color: "#0ea5e9", sort: 60 },
    { key: "decision_received", label: "Decision received", client_label: "Decision received", color: "#64748b", sort: 70 },
  ],
};

function pipelineUuid(country, slug) {
  const hex = createHash("md5").update(`${country}::${slug}`).digest("hex").slice(0, 12);
  return `c3000001-0001-4000-8000-${hex}`;
}

function slugFromFile(file) {
  return file.replace(/\.json$/, "").replace(/-/g, "_");
}

function inferKind(file) {
  if (file.includes("student")) return "study";
  if (file.includes("bowp") || file.includes("work") || file.includes("employment") || file.includes("blue-card") || file.includes("pgwp") || file.includes("skilled") || file.includes("opportunity") || file.includes("job-seeker") || file.includes("ausbildung") || file.includes("graduate") || file.includes("express-entry") || file.includes("green-card") || file.includes("oinp") || file.includes("pnp") || file.includes("tr-to-pr")) {
    if (file.includes("student")) return "study";
    return "default";
  }
  return "default";
}

function inferCategory(file, country) {
  if (file.includes("student-visa")) return "Study Visa";
  const name = inferName(file, country);
  if (name.startsWith(`${country} `)) return name.slice(country.length + 1);
  return name;
}

function inferName(file, country) {
  const base = file.replace(/\.json$/, "");
  const parts = base.split("-");
  parts.shift(); // country prefix
  const label = parts
    .map((p) => p.replace(/^./, (c) => c.toUpperCase()))
    .join(" ")
    .replace(/\bVisa\b/i, "Visa")
    .replace(/\bOwp\b/i, "OWP")
    .replace(/\bPgwp\b/i, "PGWP")
    .replace(/\bBowp\b/i, "BOWP");
  if (base.includes("canada-student")) return "Canada Study Visa";
  if (base.includes("canada-bowp")) return "Canada BOWP Work Permit";
  if (base.includes("canada-pgwp")) return "Canada PGWP Work Permit";
  if (base.includes("canada-express-entry")) return "Canada Express Entry PR";
  if (base.includes("australia-visitor")) return "Australia Visitor Visa Subclass 600";
  if (base.includes("germany-opportunity")) return "Germany Opportunity Card Chancenkarte";
  if (base.includes("singapore-employment")) return "Singapore Employment Pass S Pass";
  if (base.includes("singapore-student")) return "Singapore Student Pass STP";
  return `${country} ${label}`;
}

/** Build pipeline rows from service library filenames + CEE registry overrides. */
export function buildStagePipelineDefinitions() {
  const seen = new Set();
  const pipelines = [];

  const add = (def) => {
    const key = `${def.country}::${def.slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    pipelines.push({
      ...def,
      id: pipelineUuid(def.country, def.slug),
      stages: STAGE_SETS[def.stageSet] ?? STAGE_SETS.default,
    });
  };

  for (const [file] of Object.entries(LIBRARY_IDS)) {
    if (file.startsWith("coaching-") || file.startsWith("mbbs-")) continue;
    const prefix = file.split("-")[0];
    const country = COUNTRY_FROM_PREFIX[prefix];
    if (!country) continue;
    const slug = slugFromFile(file);
    add({
      slug,
      country,
      name: inferName(file, country),
      service_category: inferCategory(file, country),
      stageSet: inferKind(file),
      description: `Auto-seeded pipeline for ${file.replace(/\.json$/, "")}`,
    });
  }

  for (const svc of CEE_SINGAPORE_SERVICES) {
    const slug = slugFromFile(svc.file);
    add({
      slug,
      country: svc.country,
      name: `${svc.country} ${svc.subService.split("(")[0].trim()}`,
      service_category: svc.subService.split("(")[0].trim(),
      stageSet: inferKind(svc.file),
      description: `CEE/Singapore pipeline for ${svc.file}`,
    });
  }

  return pipelines.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
}
