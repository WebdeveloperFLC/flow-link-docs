#!/usr/bin/env node
/**
 * Compare manual document binder (workflow_templates / document_structure) vs JSON documentBinder.
 *
 * Usage:
 *   node scripts/compare-document-binders.mjs --library-id UUID --country Canada
 *   node scripts/compare-document-binders.mjs --all
 *   node scripts/compare-document-binders.mjs --all --csv
 *   node scripts/compare-document-binders.mjs --json-only --library-id UUID
 *   node scripts/compare-document-binders.mjs --manual-export path/to/template.json
 *
 * Env (optional live Supabase):
 *   SUPABASE_URL or VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "../content/service-library");

function parseArgs(argv) {
  const out = {
    libraryId: null,
    country: null,
    all: false,
    csv: false,
    jsonOnly: false,
    manualExport: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") out.all = true;
    else if (a === "--csv") out.csv = true;
    else if (a === "--json-only") out.jsonOnly = true;
    else if (a === "--library-id") out.libraryId = argv[++i] ?? null;
    else if (a === "--country") out.country = argv[++i] ?? null;
    else if (a === "--manual-export") out.manualExport = argv[++i] ?? null;
  }
  return out;
}

function normalizeItem(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildServiceCode(libraryId, country) {
  const c = country?.trim();
  return c ? `${libraryId}::${c}` : libraryId;
}

/** @returns {{ section: string, item: string, norm: string }[]} */
function flattenJsonBinder(meta) {
  const binder = meta?.documentBinder;
  if (!binder?.categories?.length) return [];
  const out = [];
  for (const cat of binder.categories) {
    for (const item of cat.items ?? []) {
      const text = String(item).trim();
      if (!text) continue;
      out.push({ section: cat.category, item: text, norm: normalizeItem(text) });
    }
  }
  return out;
}

/** @returns {{ section: string, item: string, norm: string }[]} */
function flattenDocumentStructure(meta) {
  const sections = meta?.document_structure?.sections;
  if (!Array.isArray(sections)) return [];
  const out = [];
  for (const sec of sections) {
    for (const doc of sec.documents ?? []) {
      const text = String(doc.label ?? doc.master_item_code ?? "").trim();
      if (!text) continue;
      out.push({
        section: sec.label ?? sec.section_key,
        item: text,
        norm: normalizeItem(text),
      });
    }
  }
  return out;
}

/** @returns {{ section: string, item: string, norm: string }[]} */
function flattenWorkflowTemplate(template) {
  const out = [];
  const items = template.items ?? [];
  const groups = template.groups ?? [];

  if (groups.length) {
    for (const g of groups) {
      for (const itemId of g.item_ids ?? []) {
        const item = items.find((i) => i.id === itemId);
        if (!item || item.requirement_kind === "milestone") continue;
        const text = String(item.name ?? item.label ?? "").trim();
        if (!text) continue;
        out.push({ section: g.label ?? g.id, item: text, norm: normalizeItem(text) });
      }
    }
  } else {
    for (const item of items) {
      if (item.requirement_kind === "milestone") continue;
      const text = String(item.name ?? item.label ?? "").trim();
      if (!text) continue;
      out.push({ section: template.name ?? "Documents", item: text, norm: normalizeItem(text) });
    }
  }
  return out;
}

function matchScore(manual, jsonItems) {
  const manualNorms = new Set(manual.map((m) => m.norm));
  const jsonNorms = new Set(jsonItems.map((j) => j.norm));
  if (manualNorms.size === 0 && jsonNorms.size === 0) return { score: 100, matched: 0 };

  let matched = 0;
  for (const n of jsonNorms) {
    if (manualNorms.has(n)) matched++;
    else {
      for (const m of manualNorms) {
        if (m.includes(n) || n.includes(m)) {
          matched += 0.5;
          break;
        }
      }
    }
  }
  const union = new Set([...manualNorms, ...jsonNorms]).size;
  const score = union === 0 ? 0 : Math.round((matched / union) * 100);
  return { score, matched: Math.round(matched) };
}

function diffSets(manual, jsonItems) {
  const manualNorms = manual.map((m) => m.norm);
  const jsonNorms = jsonItems.map((j) => j.norm);

  const onlyManual = manual.filter(
    (m) => !jsonNorms.some((j) => j === m.norm || j.includes(m.norm) || m.norm.includes(j)),
  );
  const onlyJson = jsonItems.filter(
    (j) => !manualNorms.some((m) => m === j.norm || m.includes(j.norm) || j.norm.includes(m)),
  );
  return { onlyManual, onlyJson };
}

function fileForLibraryId(libraryId) {
  for (const [file, id] of Object.entries(LIBRARY_IDS)) {
    if (id === libraryId) return file;
  }
  return null;
}

function inferCountry(file, meta, override) {
  if (override) return override;
  if (meta?.country) return meta.country;
  const slug = file.replace(/\.json$/, "");
  const parts = slug.split("-");
  const map = {
    canada: "Canada",
    uk: "United Kingdom",
    usa: "United States",
    australia: "Australia",
    germany: "Germany",
  };
  return map[parts[0]] ?? null;
}

async function fetchManualFromSupabase(sb, libraryId, country) {
  const codes = [buildServiceCode(libraryId, country), libraryId];
  const { data, error } = await sb
    .from("workflow_templates")
    .select("*")
    .in("category", codes)
    .order("name");
  if (error) throw error;
  if (data?.length) {
    return data.flatMap((t) => flattenWorkflowTemplate(t));
  }
  if (country) {
    const { data: legacy } = await sb
      .from("workflow_templates")
      .select("*")
      .eq("category", libraryId)
      .eq("country", country)
      .order("name");
    if (legacy?.length) return legacy.flatMap((t) => flattenWorkflowTemplate(t));
  }
  return [];
}

function loadManualExport(exportPath) {
  const raw = JSON.parse(fs.readFileSync(exportPath, "utf8"));
  if (Array.isArray(raw)) return raw.flatMap((t) => flattenWorkflowTemplate(t));
  return flattenWorkflowTemplate(raw);
}

async function compareOne(ctx) {
  const { file, libraryId, country, sb, args } = ctx;
  const fp = path.join(CONTENT_DIR, file);
  if (!fs.existsSync(fp)) {
    return { file, libraryId, country, error: "missing_json" };
  }

  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const jsonItems = flattenJsonBinder(meta);
  if (!jsonItems.length) {
    return { file, libraryId, country, skipped: "no_json_binder" };
  }

  let manual = flattenDocumentStructure(meta);
  let manualSource = manual.length ? "document_structure" : null;

  if (args.manualExport) {
    manual = loadManualExport(args.manualExport);
    manualSource = "manual_export";
  } else if (!args.jsonOnly && sb) {
    const fromDb = await fetchManualFromSupabase(sb, libraryId, country);
    if (fromDb.length) {
      manual = fromDb;
      manualSource = "workflow_templates";
    }
  }

  const { score, matched } = matchScore(manual, jsonItems);
  const { onlyManual, onlyJson } = diffSets(manual, jsonItems);

  const sectionsManual = [...new Set(manual.map((m) => m.section))];
  const sectionsJson = [...new Set(jsonItems.map((j) => j.section))];

  return {
    file,
    libraryId,
    country,
    service: meta.displayName ?? file,
    manualSource: manualSource ?? "none",
    manualCount: manual.length,
    jsonCount: jsonItems.length,
    matchScore: score,
    matched,
    sectionsManual,
    sectionsJson,
    onlyManual: onlyManual.map((m) => `${m.section}: ${m.item}`),
    onlyJson: onlyJson.map((j) => `${j.section}: ${j.item}`),
  };
}

async function createSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, key);
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv);

  let sb = null;
  if (!args.jsonOnly) {
    sb = await createSupabaseClient();
    if (!sb && !args.all && args.libraryId) {
      console.warn("Supabase unavailable — using JSON document_structure only (--json-only behaviour)");
    }
  }

  /** @type {{ file: string, libraryId: string, country: string | null }[]} */
  let targets = [];

  if (args.all) {
    for (const [file, libraryId] of Object.entries(LIBRARY_IDS)) {
      const fp = path.join(CONTENT_DIR, file);
      if (!fs.existsSync(fp)) continue;
      const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
      if (!meta.documentBinder?.categories?.length) continue;
      targets.push({
        file,
        libraryId,
        country: inferCountry(file, meta, null),
      });
    }
  } else if (args.libraryId) {
    const file = fileForLibraryId(args.libraryId);
    if (!file) {
      console.error(`Unknown library-id: ${args.libraryId}`);
      process.exit(1);
    }
    const meta = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"));
    targets.push({
      file,
      libraryId: args.libraryId,
      country: inferCountry(file, meta, args.country),
    });
  } else {
    console.error(
      "Usage: node scripts/compare-document-binders.mjs --library-id UUID [--country Canada] | --all [--csv] [--json-only]",
    );
    process.exit(1);
  }

  const results = [];
  for (const t of targets) {
    results.push(await compareOne({ ...t, sb, args }));
  }

  if (args.csv) {
    console.log(
      "file,library_id,country,service,manual_source,manual_count,json_count,match_score,only_manual_count,only_json_count",
    );
    for (const r of results) {
      if (r.skipped || r.error) {
        console.log(
          [r.file, r.libraryId, r.country, `"${r.service ?? ""}"`, r.skipped ?? r.error, 0, 0, 0, 0, 0].join(
            ",",
          ),
        );
        continue;
      }
      console.log(
        [
          r.file,
          r.libraryId,
          r.country,
          `"${r.service}"`,
          r.manualSource,
          r.manualCount,
          r.jsonCount,
          r.matchScore,
          r.onlyManual.length,
          r.onlyJson.length,
        ].join(","),
      );
    }
    return;
  }

  console.log(`Document binder comparison — ${results.length} service(s)\n`);
  for (const r of results) {
    if (r.skipped) {
      console.log(`⏭  ${r.file}: ${r.skipped}`);
      continue;
    }
    if (r.error) {
      console.log(`✗  ${r.file}: ${r.error}`);
      continue;
    }
    console.log(`\n${"=".repeat(72)}`);
    console.log(`${r.service} (${r.file})`);
    console.log(`Library: ${r.libraryId} · Country: ${r.country ?? "—"}`);
    console.log(`Manual source: ${r.manualSource} (${r.manualCount} items)`);
    console.log(`JSON binder: ${r.jsonCount} items · Match score: ${r.matchScore}%`);

    console.log("\nSections (manual vs JSON):");
    const allSections = [...new Set([...r.sectionsManual, ...r.sectionsJson])];
    for (const sec of allSections) {
      const inManual = r.sectionsManual.includes(sec) ? "✓" : " ";
      const inJson = r.sectionsJson.includes(sec) ? "✓" : " ";
      console.log(`  [${inManual} manual | ${inJson} json] ${sec}`);
    }

    if (r.onlyManual.length) {
      console.log(`\nMissing from JSON only (${r.onlyManual.length}):`);
      for (const line of r.onlyManual.slice(0, 15)) console.log(`  + ${line}`);
      if (r.onlyManual.length > 15) console.log(`  … +${r.onlyManual.length - 15} more`);
    }
    if (r.onlyJson.length) {
      console.log(`\nMissing from manual only (${r.onlyJson.length}):`);
      for (const line of r.onlyJson.slice(0, 15)) console.log(`  - ${line}`);
      if (r.onlyJson.length > 15) console.log(`  … +${r.onlyJson.length - 15} more`);
    }
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
