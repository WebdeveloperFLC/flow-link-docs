#!/usr/bin/env node
/**
 * Upload branded HTML checklists to service_library_checklist_files (Admin → Checklist tab).
 *
 *   node scripts/generate-all-service-checklist-specimens.mjs   # regenerate HTML first
 *   export VITE_SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/upload-all-checklist-files.mjs
 *
 * Single service:
 *   node scripts/upload-all-checklist-files.mjs canada-student-visa
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { LIBRARY_IDS, slugFromJsonFile } from "./lib/service-library-ids.mjs";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const CHECKLIST_DIR = path.join(process.cwd(), "public/specimens/checklists");
const META_ROOT = path.join(process.cwd(), "content/service-library");
const BUCKET = "service-library-files";
const filter = process.argv[2]?.toLowerCase();
const sb = createClient(url, key);

function checklistFileName(slug) {
  const metaPath = path.join(META_ROOT, `${slug}.json`);
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      const label = meta.displayName ?? slug;
      return `${label} — Document Checklist.html`;
    } catch {
      /* fall through */
    }
  }
  return `${slug} — Document Checklist.html`;
}

async function uploadOne(jsonFile, libraryId) {
  const slug = slugFromJsonFile(jsonFile);
  const htmlPath = path.join(CHECKLIST_DIR, `${slug}.html`);
  if (!fs.existsSync(htmlPath)) {
    return { ok: false, slug, msg: `Missing ${htmlPath} — run generate-all-service-checklist-specimens.mjs` };
  }

  const fileName = checklistFileName(slug);
  const buf = fs.readFileSync(htmlPath);
  const size = buf.length;

  const { data: existing, error: listErr } = await sb
    .from("service_library_checklist_files")
    .select("id, file_name, version, file_path, is_current")
    .eq("library_id", libraryId)
    .eq("file_name", fileName);

  if (listErr) return { ok: false, slug, msg: listErr.message };

  const nextVersion =
    existing?.length ? Math.max(...existing.map((r) => r.version ?? 1)) + 1 : 1;
  const storagePath = `checklist/${libraryId}/${nextVersion}-${Date.now()}-${slug}.html`;

  const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: "text/html; charset=utf-8",
    upsert: false,
  });
  if (upErr) return { ok: false, slug, msg: upErr.message };

  if (existing?.length) {
    await sb
      .from("service_library_checklist_files")
      .update({ is_current: false })
      .in(
        "id",
        existing.filter((r) => r.is_current).map((r) => r.id),
      );
  }

  const { error: insErr } = await sb.from("service_library_checklist_files").insert({
    library_id: libraryId,
    country: null,
    file_name: fileName,
    file_path: storagePath,
    mime_type: "text/html",
    size_bytes: size,
    version: nextVersion,
    is_current: true,
    notes: "Future Link branded checklist — auto-filled when linked to client file",
  });

  if (insErr) {
    await sb.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, slug, msg: insErr.message };
  }

  return { ok: true, slug, fileName, size, version: nextVersion };
}

async function main() {
  let list = Object.entries(LIBRARY_IDS);
  if (filter) {
    list = list.filter(([f, id]) => slugFromJsonFile(f).includes(filter) || id.includes(filter));
    if (!list.length) {
      console.error(`No service matching "${filter}"`);
      process.exit(1);
    }
  }

  let ok = 0;
  let fail = 0;
  for (const [jsonFile, libraryId] of list) {
    const r = await uploadOne(jsonFile, libraryId);
    if (r.ok) {
      console.log(`✓ ${r.slug} → v${r.version} (${Math.round(r.size / 1024)} KB) ${r.fileName}`);
      ok++;
    } else {
      console.log(`✗ ${r.slug ?? jsonFile}: ${r.msg}`);
      fail++;
    }
  }
  console.log(`\nDone: ${ok} uploaded, ${fail} failed of ${list.length}`);
  console.log("Verify in Admin → Service Library → Checklist tab → Checklist files");
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
