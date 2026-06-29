#!/usr/bin/env node
/**
 * Verify KC import pipeline against live Supabase using a TEMP slug (never touches Canada guide).
 * Requires: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/kc-verify-import-pipeline.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const TEST_SLUG = "kc-pipeline-verify-temp";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("SKIP_LIVE_DB: missing SUPABASE_SERVICE_ROLE_KEY (local simulation tests cover pipeline)");
  process.exit(0);
}

const sourcePath = "content/service-library/canada-student-visa-outside-canada.json";
const payload = JSON.parse(readFileSync(sourcePath, "utf8"));
payload.slug = TEST_SLUG;
payload.title = "KC Pipeline Verify (temp — safe to delete)";
payload.service_library_ids = [];

const supabase = createClient(url, key);

function parseBody(raw) {
  let parsed = raw;
  if (typeof raw === "string") {
    parsed = JSON.parse(raw.trim() || "{}");
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
  }
  const sections = parsed?.sections ?? parsed?.narrative_sections ?? [];
  return { parsed, sections };
}

async function cleanup() {
  const { data: art } = await supabase.from("kc_articles").select("id").eq("slug", TEST_SLUG).maybeSingle();
  if (art?.id) {
    await supabase.from("kc_articles").delete().eq("id", art.id);
  }
}

async function main() {
  console.log("=== KC import pipeline live verify (temp slug:", TEST_SLUG, ") ===\n");

  await cleanup();

  const { data: rpcData, error: rpcErr } = await supabase.rpc("kc_import_guide", {
    p_payload: payload,
    p_replace: true,
    p_publish: false,
  });

  if (rpcErr) {
    console.error("FAIL: kc_import_guide RPC:", rpcErr.message);
    process.exit(1);
  }

  const versionId = rpcData?.version_id;
  const articleId = rpcData?.article_id;
  console.log("RPC_OK:", { articleId, versionId, counts: rpcData?.counts });

  const { data: version, error: vErr } = await supabase
    .from("kc_article_versions")
    .select("content_body")
    .eq("id", versionId)
    .single();

  if (vErr) {
    console.error("FAIL: read version:", vErr.message);
    await cleanup();
    process.exit(1);
  }

  const { sections } = parseBody(version.content_body);
  const withBody = sections.filter((s) => (s.body_md ?? "").trim().length > 0);
  console.log("CONTENT_BODY:", {
    sectionsCount: sections.length,
    sectionsWithBodyMd: withBody.length,
    sectionIds: sections.map((s) => s.id),
  });

  if (sections[0]) {
    console.log("SAMPLE_SECTION:", {
      id: sections[0].id,
      body_md_len: (sections[0].body_md ?? "").length,
      preview: (sections[0].body_md ?? "").slice(0, 100),
    });
  }

  const expected = {
    narrative: payload.narrative_sections?.length ?? 0,
    faqs: payload.faqs?.length ?? 0,
    quiz: payload.quiz?.length ?? 0,
    downloads: payload.downloads?.length ?? 0,
    sources: payload.official_sources?.length ?? 0,
  };

  const { count: faqCount } = await supabase
    .from("kc_faq_items")
    .select("*", { count: "exact", head: true })
    .eq("version_id", versionId);
  const { count: quizCount } = await supabase
    .from("kc_quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("version_id", versionId);
  const { count: dlCount } = await supabase
    .from("kc_download_assets")
    .select("*", { count: "exact", head: true })
    .eq("version_id", versionId);
  const { count: srcCount } = await supabase
    .from("kc_source_refs")
    .select("*", { count: "exact", head: true })
    .eq("version_id", versionId);

  console.log("SATELLITES:", {
    faqs: faqCount,
    quiz: quizCount,
    downloads: dlCount,
    sourceRefs: srcCount,
    expected,
  });

  const pass =
    sections.length >= expected.narrative &&
    withBody.length === expected.narrative &&
    faqCount === expected.faqs &&
    quizCount === expected.quiz &&
    dlCount === expected.downloads &&
    srcCount === expected.sources;

  await cleanup();
  console.log("\nLIVE_DB_VERIFY:", pass ? "PASS" : "FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
