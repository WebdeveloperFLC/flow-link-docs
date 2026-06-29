#!/usr/bin/env node
/**
 * Diagnose KC guide ↔ service_library linkage (service role).
 * Usage: node scripts/kc-diagnose-guide-linkage.mjs [service_library_id]
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CANONICAL_ID = "c35e6051-f40f-47bf-9cac-0a386c47a336";
const CANADA_SLUG = "canada-student-visa-outside-canada";
const libraryId = process.argv[2] ?? CANONICAL_ID;

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const val = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

loadEnvFile(".env");

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  const { data: svc } = await sb
    .from("service_library")
    .select("id, service, sub_service, academy_metadata, is_active")
    .eq("id", libraryId)
    .maybeSingle();

  const { data: canadaServices } = await sb
    .from("service_library")
    .select("id, service, sub_service, academy_metadata, is_active")
    .eq("service", "Canada")
    .eq("service_category", "visa_immigration")
    .ilike("sub_service", "%student%")
    .order("is_active", { ascending: false });

  const { data: article } = await sb
    .from("kc_articles")
    .select("id, slug, title, status, current_version_id, article_kind")
    .eq("slug", CANADA_SLUG)
    .maybeSingle();

  let version = null;
  if (article?.current_version_id) {
    const { data: v } = await sb
      .from("kc_article_versions")
      .select("id, status, version_label, published_at")
      .eq("id", article.current_version_id)
      .maybeSingle();
    version = v;
  }

  const { data: links } = await sb
    .from("kc_article_services")
    .select("article_id, service_library_id")
    .or(`service_library_id.eq.${libraryId},article_id.eq.${article?.id ?? "00000000-0000-0000-0000-000000000000"}`);

  const { data: publishedForService } = await sb
    .from("kc_articles")
    .select("id, slug, status")
    .eq("status", "published");

  const serviceArticleIds = new Set((links ?? []).map((l) => l.article_id));
  const publishedLinked = (publishedForService ?? []).filter((a) => serviceArticleIds.has(a.id));

  console.log(JSON.stringify({
    queriedLibraryId: libraryId,
    serviceRow: svc,
    canadaStudentRows: canadaServices,
    canadaArticle: article,
    currentVersion: version,
    kc_article_services: links,
    publishedArticlesLinkedToQueriedService: publishedLinked,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
