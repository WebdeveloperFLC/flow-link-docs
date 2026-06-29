import { supabase } from "@/integrations/supabase/client";
import type {
  KcArticle,
  KcArticleMetadata,
  KcArticleVersion,
  KcDownloadAsset,
  KcFaqItem,
  KcInternalLink,
  KcOfficialSource,
  KcQuizQuestion,
  KcSearchResult,
  KcSourceRef,
} from "../types/kc";
import { DEFAULT_GUIDE_SECTIONS } from "../lib/guideSections";

const err = (e: { message?: string } | null) => e?.message ?? "Request failed";

export async function listArticles(opts?: {
  kind?: string;
  status?: string;
  countryCode?: string;
  serviceLibraryId?: string;
  limit?: number;
}) {
  let q = supabase.from("kc_articles" as any).select("*").order("title");
  if (opts?.kind) q = q.eq("article_kind", opts.kind);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(err(error));

  let rows = (data ?? []) as KcArticle[];
  if (opts?.countryCode) {
    const { data: links } = await supabase
      .from("kc_article_countries" as any)
      .select("article_id")
      .eq("country_code", opts.countryCode);
    const ids = new Set((links ?? []).map((r: { article_id: string }) => r.article_id));
    rows = rows.filter((a) => ids.has(a.id));
  }
  if (opts?.serviceLibraryId) {
    const { data: links } = await supabase
      .from("kc_article_services" as any)
      .select("article_id")
      .eq("service_library_id", opts.serviceLibraryId);
    const ids = new Set((links ?? []).map((r: { article_id: string }) => r.article_id));
    rows = rows.filter((a) => ids.has(a.id));
  }
  return rows;
}

export async function getArticleBySlug(slug: string) {
  const { data, error } = await supabase.from("kc_articles" as any).select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(err(error));
  return data as KcArticle | null;
}

export async function getArticleById(id: string) {
  const { data, error } = await supabase.from("kc_articles" as any).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(err(error));
  return data as KcArticle | null;
}

export async function resolveLiveArticle(slug?: string, articleId?: string) {
  const { data, error } = await supabase.rpc("kc_resolve_live_article" as any, {
    p_slug: slug ?? null,
    p_article_id: articleId ?? null,
  });
  if (error) throw new Error(err(error));
  if (!data) return null;
  const payload = data as { article: KcArticle; version: KcArticleVersion | null };
  return payload;
}

export async function searchArticles(params: {
  query?: string;
  countryCode?: string;
  serviceLibraryId?: string;
  articleKind?: string;
  status?: string;
  tags?: string[];
  limit?: number;
}) {
  const { data, error } = await supabase.rpc("kc_search_articles" as any, {
    p_query: params.query ?? null,
    p_country_code: params.countryCode ?? null,
    p_service_library_id: params.serviceLibraryId ?? null,
    p_article_kind: params.articleKind ?? null,
    p_status: params.status ?? null,
    p_tags: params.tags ?? null,
    p_limit: params.limit ?? 50,
  });
  if (error) throw new Error(err(error));
  return (data ?? []) as KcSearchResult[];
}

export async function listCountriesWithCounts() {
  const { data: countries, error } = await supabase.from("countries").select("code, name").order("name");
  if (error) throw new Error(err(error));
  const { data: counts } = await supabase.from("kc_article_countries" as any).select("country_code");
  const map = new Map<string, number>();
  for (const row of counts ?? []) {
    const c = (row as { country_code: string }).country_code;
    map.set(c, (map.get(c) ?? 0) + 1);
  }
  return (countries ?? []).map((c) => ({
    code: c.code,
    name: c.name,
    articleCount: map.get(c.code) ?? 0,
  }));
}

export async function listServicesWithCounts() {
  const { data: services, error } = await supabase
    .from("service_library")
    .select("id, service, sub_service, service_category")
    .eq("is_active", true)
    .order("service");
  if (error) throw new Error(err(error));
  const { data: links } = await supabase.from("kc_article_services" as any).select("service_library_id");
  const map = new Map<string, number>();
  for (const row of links ?? []) {
    const id = (row as { service_library_id: string }).service_library_id;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return (services ?? []).map((s) => ({
    id: s.id,
    label: [s.service, s.sub_service].filter(Boolean).join(" — "),
    category: s.service_category,
    articleCount: map.get(s.id) ?? 0,
  }));
}

export async function listOfficialSources(filters?: { countryCode?: string; status?: string }) {
  let q = supabase.from("kc_official_sources" as any).select("*").order("title");
  if (filters?.countryCode) q = q.eq("country_code", filters.countryCode);
  if (filters?.status) q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) throw new Error(err(error));
  return (data ?? []) as KcOfficialSource[];
}

export async function listFaqsForArticles(articleIds: string[]) {
  if (!articleIds.length) return [] as KcFaqItem[];
  const { data, error } = await supabase
    .from("kc_faq_items" as any)
    .select("*")
    .in("article_id", articleIds)
    .order("sort_order");
  if (error) throw new Error(err(error));
  return (data ?? []) as KcFaqItem[];
}

export async function listPublishedFaqs(opts?: { countryCode?: string; serviceLibraryId?: string }) {
  const articles = await listArticles({ status: "published" });
  let ids = articles.map((a) => a.id);
  if (opts?.countryCode) {
    const scoped = await listArticles({ status: "published", countryCode: opts.countryCode });
    ids = scoped.map((a) => a.id);
  }
  if (opts?.serviceLibraryId) {
    const scoped = await listArticles({ status: "published", serviceLibraryId: opts.serviceLibraryId });
    ids = scoped.map((a) => a.id);
  }
  const faqs = await listFaqsForArticles(ids);
  const articleMap = new Map(articles.map((a) => [a.id, a]));
  return faqs.map((f) => ({ ...f, article: articleMap.get(f.article_id) }));
}

export async function listDownloads(opts?: {
  countryCode?: string;
  serviceLibraryId?: string;
  downloadType?: string;
}) {
  const articles = await listArticles({ status: "published", ...opts });
  const ids = articles.map((a) => a.id);
  if (!ids.length) return [] as KcDownloadAsset[];
  let q = supabase.from("kc_download_assets" as any).select("*").in("article_id", ids).order("sort_order");
  if (opts?.downloadType) q = q.eq("download_type", opts.downloadType);
  const { data, error } = await q;
  if (error) throw new Error(err(error));
  return (data ?? []) as KcDownloadAsset[];
}

export async function getVersionSatellites(versionId: string) {
  const [faqsRes, quizRes, downloadsRes, refsRes, linksRes] = await Promise.all([
    supabase.from("kc_faq_items" as any).select("*").eq("version_id", versionId).order("sort_order"),
    supabase.from("kc_quiz_questions" as any).select("*").eq("version_id", versionId).order("sort_order"),
    supabase.from("kc_download_assets" as any).select("*").eq("version_id", versionId).order("sort_order"),
    supabase.from("kc_article_source_refs" as any).select("*").eq("version_id", versionId).order("sort_order"),
    supabase.from("kc_internal_links" as any).select("*").eq("from_version_id", versionId),
  ]);

  const sourceRefs = (refsRes.data ?? []) as KcSourceRef[];
  const sourceIds = sourceRefs.map((r) => r.official_source_id);
  let sourcesMap = new Map<string, KcOfficialSource>();
  if (sourceIds.length) {
    const { data: sources } = await supabase.from("kc_official_sources" as any).select("*").in("id", sourceIds);
    for (const s of (sources ?? []) as KcOfficialSource[]) sourcesMap.set(s.id, s);
  }

  const internalLinks = (linksRes.data ?? []) as KcInternalLink[];
  const articleIds = internalLinks.map((l) => l.to_article_id);
  let articleMap = new Map<string, Pick<KcArticle, "id" | "slug" | "title">>();
  if (articleIds.length) {
    const { data: arts } = await supabase.from("kc_articles" as any).select("id, slug, title").in("id", articleIds);
    for (const a of (arts ?? []) as Pick<KcArticle, "id" | "slug" | "title">[]) articleMap.set(a.id, a);
  }

  return {
    faqs: (faqsRes.data ?? []) as KcFaqItem[],
    quiz: ((quizRes.data ?? []) as KcQuizQuestion[]).map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    })),
    downloads: (downloadsRes.data ?? []) as KcDownloadAsset[],
    sourceRefs: sourceRefs.map((r) => ({ ...r, source: sourcesMap.get(r.official_source_id) })),
    internalLinks: internalLinks.map((l) => ({ ...l, to_article: articleMap.get(l.to_article_id) })),
  };
}

export async function listArticleVersions(articleId: string) {
  const { data, error } = await supabase
    .from("kc_article_versions" as any)
    .select("*")
    .eq("article_id", articleId)
    .order("version_number", { ascending: false });
  if (error) throw new Error(err(error));
  return (data ?? []) as KcArticleVersion[];
}

export async function getDraftOrLatestVersion(articleId: string) {
  const { data: draft } = await supabase
    .from("kc_article_versions" as any)
    .select("*")
    .eq("article_id", articleId)
    .in("status", ["draft", "in_review"])
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (draft) return draft as KcArticleVersion;
  const { data, error } = await supabase
    .from("kc_article_versions" as any)
    .select("*")
    .eq("article_id", articleId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(err(error));
  return data as KcArticleVersion | null;
}

export async function createArticle(input: {
  slug: string;
  title: string;
  article_kind: string;
  metadata?: KcArticleMetadata;
  countryCodes?: string[];
  serviceLibraryIds?: string[];
}) {
  const { data: article, error } = await supabase
    .from("kc_articles" as any)
    .insert({
      slug: input.slug,
      title: input.title,
      article_kind: input.article_kind,
      status: "draft",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw new Error(err(error));
  const a = article as KcArticle;

  const { data: version, error: vErr } = await supabase
    .from("kc_article_versions" as any)
    .insert({
      article_id: a.id,
      version_number: 1,
      version_label: "1.0.0",
      status: "draft",
      content_format: "structured",
      content_body: JSON.stringify({
        sections: DEFAULT_GUIDE_SECTIONS.filter((s) => s.type === "narrative").map((s) => ({
          id: s.id,
          title: s.title,
        })),
      }),
    })
    .select("*")
    .single();
  if (vErr) throw new Error(err(vErr));

  if (input.countryCodes?.length) {
    await supabase.from("kc_article_countries" as any).insert(
      input.countryCodes.map((code) => ({ article_id: a.id, country_code: code })),
    );
  }
  if (input.serviceLibraryIds?.length) {
    await supabase.from("kc_article_services" as any).insert(
      input.serviceLibraryIds.map((id) => ({ article_id: a.id, service_library_id: id })),
    );
  }
  return { article: a, version: version as KcArticleVersion };
}

export async function updateArticle(id: string, patch: Partial<{
  slug: string;
  title: string;
  article_kind: string;
  status: string;
  metadata: KcArticleMetadata;
  sort_order: number;
}>) {
  const { data, error } = await supabase.from("kc_articles" as any).update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(err(error));
  return data as KcArticle;
}

export async function updateVersion(id: string, patch: Partial<{
  content_body: string;
  content_format: string;
  version_label: string;
  status: string;
  change_summary: string;
}>) {
  const { data, error } = await supabase.from("kc_article_versions" as any).update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(err(error));
  return data as KcArticleVersion;
}

export async function createNewVersionDraft(articleId: string, fromVersionId?: string) {
  const versions = await listArticleVersions(articleId);
  const nextNum = (versions[0]?.version_number ?? 0) + 1;
  let body = JSON.stringify({ sections: [] });
  if (fromVersionId) {
    const { data } = await supabase.from("kc_article_versions" as any).select("content_body").eq("id", fromVersionId).single();
    if (data) body = (data as { content_body: string }).content_body;
  }
  const { data, error } = await supabase
    .from("kc_article_versions" as any)
    .insert({
      article_id: articleId,
      version_number: nextNum,
      version_label: `${nextNum}.0.0`,
      status: "draft",
      content_format: "structured",
      content_body: body,
    })
    .select("*")
    .single();
  if (error) throw new Error(err(error));
  return data as KcArticleVersion;
}

export async function publishVersion(versionId: string) {
  const { data, error } = await supabase.rpc("kc_publish_version" as any, { p_version_id: versionId });
  if (error) throw new Error(err(error));
  return data;
}

export async function archiveArticle(id: string) {
  return updateArticle(id, { status: "archived" });
}

export async function upsertOfficialSource(input: Partial<KcOfficialSource> & { title: string; official_url: string }) {
  if (input.id) {
    const { data, error } = await supabase.from("kc_official_sources" as any).update(input).eq("id", input.id).select("*").single();
    if (error) throw new Error(err(error));
    return data as KcOfficialSource;
  }
  const { data, error } = await supabase.from("kc_official_sources" as any).insert(input).select("*").single();
  if (error) throw new Error(err(error));
  return data as KcOfficialSource;
}

export async function deleteOfficialSource(id: string) {
  const { error } = await supabase.from("kc_official_sources" as any).delete().eq("id", id);
  if (error) throw new Error(err(error));
}

export async function upsertFaqItem(item: Partial<KcFaqItem> & { article_id: string; version_id: string; question: string }) {
  if (item.id) {
    const { data, error } = await supabase.from("kc_faq_items" as any).update(item).eq("id", item.id).select("*").single();
    if (error) throw new Error(err(error));
    return data as KcFaqItem;
  }
  const { data, error } = await supabase.from("kc_faq_items" as any).insert(item).select("*").single();
  if (error) throw new Error(err(error));
  return data as KcFaqItem;
}

export async function deleteFaqItem(id: string) {
  const { error } = await supabase.from("kc_faq_items" as any).delete().eq("id", id);
  if (error) throw new Error(err(error));
}

export async function upsertQuizQuestion(
  item: Partial<KcQuizQuestion> & { article_id: string; version_id: string; question: string; options: string[] },
) {
  const row = { ...item, options: item.options };
  if (item.id) {
    const { data, error } = await supabase.from("kc_quiz_questions" as any).update(row).eq("id", item.id).select("*").single();
    if (error) throw new Error(err(error));
    return data as KcQuizQuestion;
  }
  const { data, error } = await supabase.from("kc_quiz_questions" as any).insert(row).select("*").single();
  if (error) throw new Error(err(error));
  return data as KcQuizQuestion;
}

export async function deleteQuizQuestion(id: string) {
  const { error } = await supabase.from("kc_quiz_questions" as any).delete().eq("id", id);
  if (error) throw new Error(err(error));
}

export async function upsertDownloadAsset(
  item: Partial<KcDownloadAsset> & { article_id: string; title: string; storage_path: string },
) {
  if (item.id) {
    const { data, error } = await supabase.from("kc_download_assets" as any).update(item).eq("id", item.id).select("*").single();
    if (error) throw new Error(err(error));
    return data as KcDownloadAsset;
  }
  const { data, error } = await supabase.from("kc_download_assets" as any).insert(item).select("*").single();
  if (error) throw new Error(err(error));
  return data as KcDownloadAsset;
}

export async function deleteDownloadAsset(id: string) {
  const { error } = await supabase.from("kc_download_assets" as any).delete().eq("id", id);
  if (error) throw new Error(err(error));
}

export async function upsertSourceRef(ref: Partial<KcSourceRef> & { version_id: string; official_source_id: string }) {
  if (ref.id) {
    const { data, error } = await supabase.from("kc_article_source_refs" as any).update(ref).eq("id", ref.id).select("*").single();
    if (error) throw new Error(err(error));
    return data as KcSourceRef;
  }
  const { data, error } = await supabase.from("kc_article_source_refs" as any).insert(ref).select("*").single();
  if (error) throw new Error(err(error));
  return data as KcSourceRef;
}

export async function deleteSourceRef(id: string) {
  const { error } = await supabase.from("kc_article_source_refs" as any).delete().eq("id", id);
  if (error) throw new Error(err(error));
}

export async function upsertInternalLink(
  link: Partial<KcInternalLink> & { from_version_id: string; to_article_id: string },
) {
  if (link.id) {
    const { data, error } = await supabase.from("kc_internal_links" as any).update(link).eq("id", link.id).select("*").single();
    if (error) throw new Error(err(error));
    return data as KcInternalLink;
  }
  const { data, error } = await supabase.from("kc_internal_links" as any).insert(link).select("*").single();
  if (error) throw new Error(err(error));
  return data as KcInternalLink;
}

export async function deleteInternalLink(id: string) {
  const { error } = await supabase.from("kc_internal_links" as any).delete().eq("id", id);
  if (error) throw new Error(err(error));
}

export async function getSignedDownloadUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from("kc-downloads").createSignedUrl(storagePath, 3600);
  if (error) throw new Error(err(error));
  return data.signedUrl;
}

export async function uploadDownloadFile(path: string, file: File) {
  const { error } = await supabase.storage.from("kc-downloads").upload(path, file, { upsert: true });
  if (error) throw new Error(err(error));
}
