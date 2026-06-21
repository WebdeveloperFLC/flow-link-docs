#!/usr/bin/env node
/**
 * Phase 1 pilot publish — JSON-only editing source → HTML + SQL (metadata + workflow_templates).
 *
 *   node scripts/publish-service-library-pilot.mjs
 *   node scripts/publish-service-library-pilot.mjs canada-spouse-dependent-visitor
 *
 * Pilot slugs only until fleet UAT passes.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";
import { buildFromService, slugFromFile } from "./lib/build-checklist-from-service.mjs";
import { renderChecklistHtml } from "./lib/flc-checklist-template.mjs";
import {
  buildWorkflowTemplateFromManifest,
  sqlJson,
  validateDocumentManifest,
} from "./lib/document-manifest.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(ROOT, "..");
const CONTENT_DIR = path.join(REPO, "content/service-library");
const CHECKLIST_DIR = path.join(REPO, "public/specimens/checklists");
const MIGRATIONS_DIR = path.join(REPO, "supabase/migrations");

/** @type {Record<string, { country: string }>} */
const PILOT_SLUGS = {
  "canada-spouse-dependent-visitor": { country: "Canada" },
};

const COUNTRY_BY_PREFIX = {
  canada: "Canada",
  uk: "United Kingdom",
  usa: "United States",
  australia: "Australia",
  germany: "Germany",
  nz: "New Zealand",
  coaching: "Coaching",
  mbbs: "International",
};

function countryForSlug(slug) {
  if (PILOT_SLUGS[slug]?.country) return PILOT_SLUGS[slug].country;
  const prefix = slug.split("-")[0];
  return COUNTRY_BY_PREFIX[prefix] ?? "International";
}

function resolveLogoPath() {
  const candidates = [
    path.join(REPO, "public/specimens/flc-logo.png"),
    path.join(REPO, "src/assets/flc-logo.png"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("flc-logo.png not found");
}

function logoDataUri(logoPath) {
  return `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
}

function migrationTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

/**
 * @param {string} slug
 * @returns {{ migrationPath: string, htmlPath: string, template: object }}
 */
export function publishPilotSlug(slug) {
  if (!PILOT_SLUGS[slug]) {
    throw new Error(`Slug "${slug}" is not in the Phase 1 pilot allowlist.`);
  }

  const jsonFile = `${slug}.json`;
  const libraryId = LIBRARY_IDS[jsonFile];
  if (!libraryId) {
    throw new Error(`No library_id for ${jsonFile}`);
  }

  const jsonPath = path.join(CONTENT_DIR, jsonFile);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Missing ${jsonPath}`);
  }

  const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  delete meta._instructions;

  if (!Array.isArray(meta.document_manifest) || meta.document_manifest.length === 0) {
    throw new Error(`${jsonFile}: document_manifest[] is required for pilot publish`);
  }

  const manifest = validateDocumentManifest(meta.document_manifest, slug);
  const country = countryForSlug(slug);
  const displayName = meta.displayName ?? slug;

  // 1. HTML binder (print handout — not CRM source)
  fs.mkdirSync(CHECKLIST_DIR, { recursive: true });
  const logoPath = resolveLogoPath();
  const spec = buildFromService(jsonFile);
  const html = renderChecklistHtml(spec, logoDataUri(logoPath));
  const htmlPath = path.join(CHECKLIST_DIR, `${slug}.html`);
  fs.writeFileSync(htmlPath, html);

  // 2. workflow_templates payload
  const template = buildWorkflowTemplateFromManifest({
    slug,
    displayName,
    libraryId,
    country,
    manifest,
  });

  // 3. SQL migration (replace prior pilot publish migrations for this slug)
  for (const f of fs.readdirSync(MIGRATIONS_DIR)) {
    if (f.includes("_publish_pilot_") && f.includes(slug.replace(/-/g, "_"))) {
      fs.unlinkSync(path.join(MIGRATIONS_DIR, f));
    }
  }

  const ts = migrationTimestamp();
  const migrationFilename = `${ts}_publish_pilot_${slug.replace(/-/g, "_")}.sql`;
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFilename);

  const metaJson = sqlJson(meta);
  const itemsJson = sqlJson(template.items);
  const groupsJson = sqlJson(template.groups);
  const escName = template.name.replace(/'/g, "''");

  const sql = [
    `-- Pilot publish: ${slug} (document_manifest → academy_metadata + workflow_templates)`,
    `-- Regenerate: node scripts/publish-service-library-pilot.mjs ${slug}`,
    `-- Editor source: content/service-library/${jsonFile}`,
    `-- Upsert only — never DELETE workflow_templates (clients.template_id FK).`,
    "",
    `UPDATE public.service_library`,
    `SET academy_metadata = '${metaJson}'::jsonb,`,
    `    updated_at = now()`,
    `WHERE id = '${libraryId}';`,
    "",
    `UPDATE public.workflow_templates`,
    `SET name = '${escName}',`,
    `    country = '${country}',`,
    `    version = ${template.version},`,
    `    items = '${itemsJson}'::jsonb,`,
    `    groups = '${groupsJson}'::jsonb`,
    `WHERE category = '${template.category}';`,
    "",
    `INSERT INTO public.workflow_templates (name, country, category, version, items, groups)`,
    `SELECT`,
    `  '${escName}',`,
    `  '${country}',`,
    `  '${template.category}',`,
    `  ${template.version},`,
    `  '${itemsJson}'::jsonb,`,
    `  '${groupsJson}'::jsonb`,
    `WHERE NOT EXISTS (`,
    `  SELECT 1 FROM public.workflow_templates WHERE category = '${template.category}'`,
    `);`,
    "",
  ].join("\n");

  fs.writeFileSync(migrationPath, sql);

  return { migrationPath, htmlPath, template, manifestCount: manifest.length };
}

function main() {
  const argSlug = process.argv[2];
  const slugs = argSlug ? [argSlug] : Object.keys(PILOT_SLUGS);

  /** @type {string[]} */
  const migrationPaths = [];

  for (const slug of slugs) {
    const result = publishPilotSlug(slug);
    migrationPaths.push(result.migrationPath);
    console.log(
      `✓ ${slug}: ${result.manifestCount} manifest docs → ${path.relative(REPO, result.htmlPath)}`,
    );
    console.log(`  migration: ${path.relative(REPO, result.migrationPath)}`);
    console.log(
      `  workflow_templates: ${result.template.items.filter((i) => i.requirement_kind === "document").length} documents + ${result.template.items.filter((i) => i.requirement_kind === "milestone").length} milestones`,
    );
  }

  // Drift guard for pilot JSON vs generated HTML
  const test = spawnSync(process.execPath, ["scripts/test-document-manifest-pilot.mjs"], {
    cwd: REPO,
    stdio: "inherit",
  });
  if (test.status !== 0) {
    process.exit(test.status ?? 1);
  }

  console.log("\nPilot publish complete. Ship generated files + JSON via npm run ship.");
  return migrationPaths;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
