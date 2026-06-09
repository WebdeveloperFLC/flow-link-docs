#!/usr/bin/env node
/**
 * Seed workflow_templates from branded HTML document checklists.
 * Links each template to service_library via category = `{library_id}::{country}`.
 *
 *   node scripts/generate-workflow-template-sql.mjs
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const CHECKLIST_DIR = path.join(process.cwd(), "public/specimens/checklists");
const OUT = path.join(process.cwd(), "supabase/migrations/20260610250000_seed_workflow_templates_from_checklists.sql");

const COUNTRY_BY_PREFIX = {
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
  coaching: "Coaching",
};

function slugKey(text, i) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || `item_${i}`
  );
}

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseChecklistHtml(html) {
  const sections = [];
  const sectionBlocks = html.split(/<section class="section">/i).slice(1);
  for (const block of sectionBlocks) {
    const titleMatch = block.match(/class="section-title"[^>]*>([^<]+)</i);
    const sectionTitle = titleMatch ? decodeHtml(titleMatch[1]) : "Documents";
    const items = [];
    const itemRegex =
      /<div class="check-item">[\s\S]*?<div class="check-title">([^<]+)<\/div>(?:[\s\S]*?<div class="check-note">([^<]*)<\/div>)?[\s\S]*?(badge-req|badge-ok)/gi;
    let m;
    let i = 0;
    while ((m = itemRegex.exec(block)) !== null) {
      const name = decodeHtml(m[1]);
      const notes = m[2] ? decodeHtml(m[2]) : undefined;
      const mandatory = m[3] === "badge-req";
      items.push({
        id: slugKey(name, ++i),
        name,
        mandatory,
        notes: notes || undefined,
      });
    }
    if (items.length) sections.push({ title: sectionTitle, items });
  }
  return sections;
}

function countryForSlug(slug) {
  const prefix = slug.split("-")[0];
  return COUNTRY_BY_PREFIX[prefix] ?? "International";
}

function sqlJson(obj) {
  return JSON.stringify(obj).replace(/'/g, "''");
}

function buildTemplate(slug, libraryId, sections) {
  const country = countryForSlug(slug);
  const category = `${libraryId}::${country}`;
  const titleMatch = slug.replace(/-/g, " ");
  const name = titleMatch.replace(/\b\w/g, (c) => c.toUpperCase()) + " — Document binder";

  const allItems = [];
  const groups = [];
  let sort = 0;
  for (const sec of sections) {
    const groupId = slugKey(sec.title, sort);
    const itemIds = [];
    for (const it of sec.items) {
      if (!allItems.some((x) => x.id === it.id)) {
        allItems.push(it);
      }
      itemIds.push(it.id);
    }
    groups.push({
      id: groupId,
      section_key: groupId,
      label: sec.title,
      sort_order: sort++,
      item_ids: itemIds,
    });
  }

  return { name, country, category, items: allItems, groups };
}

const htmlFiles = fs
  .readdirSync(CHECKLIST_DIR)
  .filter((f) => f.endsWith(".html") && f !== "index.html");

const templates = [];
for (const file of htmlFiles.sort()) {
  const slug = file.replace(/\.html$/, "");
  const jsonKey = `${slug}.json`;
  const libraryId = LIBRARY_IDS[jsonKey];
  if (!libraryId) {
    console.warn(`skip ${file} — no library id`);
    continue;
  }
  const html = fs.readFileSync(path.join(CHECKLIST_DIR, file), "utf8");
  const sections = parseChecklistHtml(html);
  if (!sections.length) {
    console.warn(`skip ${file} — no sections parsed`);
    continue;
  }
  templates.push(buildTemplate(slug, libraryId, sections));
}

const lines = [
  "-- Document binder templates seeded from branded HTML checklists.",
  "-- Links workflow_templates.category to service_library id (library_id::country).",
  "",
];

for (const t of templates) {
  const escName = t.name.replace(/'/g, "''");
  lines.push(`DELETE FROM public.workflow_templates WHERE category = '${t.category}';`);
  lines.push(
    `INSERT INTO public.workflow_templates (name, country, category, version, items, groups)`,
  );
  lines.push(
    `VALUES ('${escName}', '${t.country}', '${t.category}', 1, '${sqlJson(t.items)}'::jsonb, '${sqlJson(t.groups)}'::jsonb);`,
  );
  lines.push("");
}

fs.writeFileSync(OUT, lines.join("\n"));
console.log(`Wrote ${templates.length} templates → ${OUT}`);
