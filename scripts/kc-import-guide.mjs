#!/usr/bin/env node
/**
 * Import a Knowledge Centre guide JSON bundle via Supabase (service role).
 *
 * Requires: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env or environment)
 *
 * Usage:
 *   node scripts/kc-import-guide.mjs content/knowledge-centre/imports/canada-student-visa-outside-canada.json
 *   node scripts/kc-import-guide.mjs <json> --publish
 *   node scripts/kc-import-guide.mjs <json> --publish --replace   # delete existing slug first
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const publish = process.argv.includes("--publish");
const replace = process.argv.includes("--replace");

if (!file) {
  console.error("Usage: node scripts/kc-import-guide.mjs <import.json> [--publish] [--replace]");
  process.exit(1);
}

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
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(file, "utf8"));
const supabase = createClient(url, key);

const DEFAULT_GUIDE_SECTIONS = [
  { id: "overview", title: "Overview", type: "narrative", sort_order: 1 },
  { id: "eligibility", title: "Eligibility Summary", type: "narrative", sort_order: 2 },
  { id: "cost-planning", title: "Cost Planning", type: "narrative", sort_order: 3 },
  { id: "family-guide", title: "Family Guide", type: "narrative", sort_order: 4 },
  { id: "future-link-services", title: "Future Link Services", type: "narrative", sort_order: 5 },
  { id: "counselling-journey", title: "Complete Counselling Journey", type: "narrative", sort_order: 6 },
  { id: "future-applications", title: "Future Applications", type: "narrative", sort_order: 7 },
  { id: "settlement-guide", title: "Settlement Guide", type: "narrative", sort_order: 8 },
  { id: "common-mistakes", title: "Common Mistakes", type: "narrative", sort_order: 9 },
  { id: "faqs", title: "FAQs", type: "faq", sort_order: 10 },
  { id: "quiz", title: "Self-Test Quiz", type: "quiz", sort_order: 11 },
  { id: "downloads", title: "Downloads", type: "downloads", sort_order: 12 },
  { id: "official-sources", title: "Official Sources", type: "sources", sort_order: 13 },
  { id: "related-knowledge", title: "Related Knowledge", type: "links", sort_order: 14 },
];

function buildMetadata(p) {
  return {
    tags: p.tags ?? [],
    categories: p.categories ?? [],
    guide_sections: p.guide_sections ?? DEFAULT_GUIDE_SECTIONS,
    external_module_refs: p.external_module_refs ?? [],
    estimated_reading_minutes: p.estimated_reading_minutes,
  };
}

async function findOfficialSourceByUrl(officialUrl) {
  const { data } = await supabase.from("kc_official_sources").select("*").eq("official_url", officialUrl).maybeSingle();
  return data;
}

async function importSharedStub(shared) {
  const { data: existing } = await supabase.from("kc_articles").select("id").eq("slug", shared.slug).maybeSingle();
  if (existing) return existing.id;

  const { data: article, error } = await supabase
    .from("kc_articles")
    .insert({
      slug: shared.slug,
      title: shared.title,
      article_kind: shared.article_kind ?? "shared",
      status: "draft",
      metadata: { tags: ["shared", "related-knowledge"], categories: ["counselling"] },
    })
    .select("*")
    .single();
  if (error) throw error;

  const { data: version, error: vErr } = await supabase
    .from("kc_article_versions")
    .insert({
      article_id: article.id,
      version_number: 1,
      version_label: "1.0.0",
      status: "draft",
      content_format: "structured",
      content_body: JSON.stringify({ sections: shared.narrative_sections ?? [] }),
    })
    .select("*")
    .single();
  if (vErr) throw vErr;

  if (shared.country_codes?.length) {
    await supabase.from("kc_article_countries").insert(
      shared.country_codes.map((code) => ({ article_id: article.id, country_code: code })),
    );
  }
  return article.id;
}

async function deleteArticleBySlug(slug) {
  const { data: existing } = await supabase.from("kc_articles").select("id").eq("slug", slug).maybeSingle();
  if (!existing) return false;
  const { error } = await supabase.from("kc_articles").delete().eq("id", existing.id);
  if (error) throw error;
  return true;
}

async function runImport() {
  if (!payload.slug?.trim() || !payload.title?.trim()) throw new Error("Import JSON requires slug and title");

  console.log("Importing:", payload.slug, payload.title);
  console.log("Counts:", {
    narrative: payload.narrative_sections?.length,
    faqs: payload.faqs?.length,
    quiz: payload.quiz?.length,
    downloads: payload.downloads?.length,
    sources: payload.official_sources?.length,
    shared: payload.shared_articles?.length,
  });

  if (replace) {
    const removed = await deleteArticleBySlug(payload.slug);
    if (removed) console.log("Replaced: deleted existing article", payload.slug);
  }

  const { data: dup } = await supabase.from("kc_articles").select("id").eq("slug", payload.slug).maybeSingle();
  if (dup) {
    throw new Error(`Article already exists: ${payload.slug}. Use --replace to delete and re-import.`);
  }

  for (const shared of payload.shared_articles ?? []) {
    await importSharedStub(shared);
  }

  const { data: article, error: aErr } = await supabase
    .from("kc_articles")
    .insert({
      slug: payload.slug,
      title: payload.title,
      article_kind: payload.article_kind ?? "service",
      status: "draft",
      metadata: buildMetadata(payload),
    })
    .select("*")
    .single();
  if (aErr) throw aErr;

  const { data: version, error: vErr } = await supabase
    .from("kc_article_versions")
    .insert({
      article_id: article.id,
      version_number: 1,
      version_label: payload.version_label ?? "1.0.0",
      status: "draft",
      content_format: "structured",
      content_body: JSON.stringify({ sections: payload.narrative_sections ?? [] }),
    })
    .select("*")
    .single();
  if (vErr) throw vErr;

  if (payload.country_codes?.length) {
    await supabase.from("kc_article_countries").insert(
      payload.country_codes.map((code) => ({ article_id: article.id, country_code: code })),
    );
  }
  if (payload.service_library_ids?.length) {
    await supabase.from("kc_article_services").insert(
      payload.service_library_ids.map((id) => ({ article_id: article.id, service_library_id: id })),
    );
  }

  for (const [i, faq] of (payload.faqs ?? []).entries()) {
    await supabase.from("kc_faq_items").insert({
      article_id: article.id,
      version_id: version.id,
      sort_order: faq.sort_order ?? i + 1,
      question: faq.question,
      answer: faq.answer,
    });
  }

  for (const [i, q] of (payload.quiz ?? []).entries()) {
    await supabase.from("kc_quiz_questions").insert({
      article_id: article.id,
      version_id: version.id,
      sort_order: q.sort_order ?? i + 1,
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
      level: q.level,
    });
  }

  let sourceSort = 0;
  for (const src of payload.official_sources ?? []) {
    let row = await findOfficialSourceByUrl(src.official_url);
    if (!row) {
      const { data: inserted, error } = await supabase
        .from("kc_official_sources")
        .insert({
          title: src.title,
          official_url: src.official_url,
          authority: src.authority,
          category: src.category,
          country_code: src.country_code ?? null,
          metadata: src.reason ? { reason: src.reason } : {},
        })
        .select("*")
        .single();
      if (error) throw error;
      row = inserted;
    }
    sourceSort += 1;
    await supabase.from("kc_article_source_refs").insert({
      version_id: version.id,
      official_source_id: row.id,
      anchor_label: src.title,
      sort_order: sourceSort,
    });
  }

  for (const [i, d] of (payload.downloads ?? []).entries()) {
    await supabase.from("kc_download_assets").insert({
      article_id: article.id,
      version_id: version.id,
      title: d.title,
      storage_path: d.storage_path ?? `${payload.slug}/templates/${i + 1}.pdf`,
      download_type: d.download_type,
      sort_order: d.sort_order ?? i + 1,
      metadata: {
        ...(d.journey_stage ? { journey_stage: d.journey_stage } : {}),
        ...(d.subtype ? { subtype: d.subtype } : {}),
      },
    });
  }

  for (const relSlug of payload.related_article_slugs ?? []) {
    const { data: target } = await supabase.from("kc_articles").select("id, title").eq("slug", relSlug).maybeSingle();
    if (target) {
      await supabase.from("kc_internal_links").insert({
        from_version_id: version.id,
        to_article_id: target.id,
        link_type: "related",
        anchor_text: target.title,
      });
    } else {
      console.warn("Related article not found:", relSlug);
    }
  }

  if (publish) {
    const { error: pubErr } = await supabase.rpc("kc_publish_version", { p_version_id: version.id });
    if (pubErr) throw pubErr;
    console.log("Published version", version.id);
  }

  const { data: verify } = await supabase
    .from("kc_articles")
    .select("id, slug, title, status, current_version_id")
    .eq("slug", payload.slug)
    .single();

  console.log("\n✓ Import complete");
  console.log("Article:", verify?.id, verify?.status);
  console.log("Reader URL path: /knowledge-centre/articles/" + payload.slug);
  if (payload.service_library_ids?.[0]) {
    console.log("Service hub: /knowledge-centre/services/" + payload.service_library_ids[0]);
  }
  if (!publish) console.log("Note: status is draft — re-run with --publish or publish in KC Admin.");
}

runImport().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
