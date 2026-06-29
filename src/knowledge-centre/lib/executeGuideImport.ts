import {
  buildArticleMetadataFromImport,
  buildStructuredBodyFromImport,
  parseGuideImportJson,
  validateImportAgainstGoldStandard,
  type GuideImportPayload,
} from "./guideImport";
import {
  createArticle,
  getArticleBySlug,
  getDraftOrLatestVersion,
  updateVersion,
  upsertFaqItem,
  upsertQuizQuestion,
  upsertOfficialSource,
  upsertSourceRef,
  upsertInternalLink,
  upsertDownloadAsset,
  listOfficialSources,
  publishVersion,
} from "@/knowledge-centre/repositories/kcRepo";

export interface GuideImportResult {
  articleId: string;
  versionId: string;
  slug: string;
  warnings: string[];
  sharedCreated: string[];
  counts: {
    narrative_sections: number;
    faqs: number;
    quiz: number;
    downloads: number;
    official_sources: number;
    related_links: number;
  };
}

async function findOfficialSourceByUrl(url: string) {
  const rows = await listOfficialSources();
  return rows.find((r) => r.official_url === url) ?? null;
}

async function importSharedStub(shared: NonNullable<GuideImportPayload["shared_articles"]>[number]) {
  const existing = await getArticleBySlug(shared.slug);
  if (existing) return existing.id;

  const { article, version } = await createArticle({
    slug: shared.slug,
    title: shared.title,
    article_kind: shared.article_kind ?? "shared",
    metadata: { tags: ["shared", "related-knowledge"], categories: ["counselling"] },
    countryCodes: shared.country_codes,
  });
  await updateVersion(version.id, {
    content_body: JSON.stringify({ sections: shared.narrative_sections ?? [] }),
    content_format: "structured",
    version_label: "1.0.0",
  });
  return article.id;
}

export async function executeGuideImport(
  payload: GuideImportPayload,
  opts?: { publish?: boolean; serviceLibraryId?: string },
): Promise<GuideImportResult> {
  const warnings = validateImportAgainstGoldStandard(payload);
  const sharedCreated: string[] = [];

  if (payload.service_library_ids?.length === 0 && opts?.serviceLibraryId) {
    payload.service_library_ids = [opts.serviceLibraryId];
  }

  for (const shared of payload.shared_articles ?? []) {
    const id = await importSharedStub(shared);
    sharedCreated.push(shared.slug);
    void id;
  }

  const existing = await getArticleBySlug(payload.slug);
  if (existing) {
    throw new Error(`Article already exists: ${payload.slug}. Use editor or delete before re-import.`);
  }

  const { article, version } = await createArticle({
    slug: payload.slug,
    title: payload.title,
    article_kind: payload.article_kind ?? "service",
    metadata: buildArticleMetadataFromImport(payload),
    countryCodes: payload.country_codes,
    serviceLibraryIds: payload.service_library_ids,
  });

  await updateVersion(version.id, {
    content_body: buildStructuredBodyFromImport(payload),
    content_format: "structured",
    version_label: payload.version_label ?? "1.0.0",
  });

  const v = await getDraftOrLatestVersion(article.id);
  if (!v) throw new Error("Version missing after import");

  for (const [i, faq] of (payload.faqs ?? []).entries()) {
    await upsertFaqItem({
      article_id: article.id,
      version_id: v.id,
      sort_order: faq.sort_order ?? i + 1,
      question: faq.question,
      answer: faq.answer,
    });
  }

  for (const [i, q] of (payload.quiz ?? []).entries()) {
    await upsertQuizQuestion({
      article_id: article.id,
      version_id: v.id,
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
      row = await upsertOfficialSource({
        title: src.title,
        official_url: src.official_url,
        authority: src.authority,
        category: src.category,
        country_code: src.country_code ?? null,
        metadata: src.reason ? { reason: src.reason } : {},
      });
    }
    sourceSort += 1;
    await upsertSourceRef({
      version_id: v.id,
      official_source_id: row.id,
      anchor_label: src.title,
      sort_order: sourceSort,
    });
  }

  for (const [i, d] of (payload.downloads ?? []).entries()) {
    await upsertDownloadAsset({
      article_id: article.id,
      version_id: v.id,
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

  let relatedCount = 0;
  for (const relSlug of payload.related_article_slugs ?? []) {
    const target = await getArticleBySlug(relSlug);
    if (target) {
      await upsertInternalLink({
        from_version_id: v.id,
        to_article_id: target.id,
        link_type: "related",
        anchor_text: target.title,
      });
      relatedCount += 1;
    } else {
      warnings.push(`Related article not found: ${relSlug}`);
    }
  }

  if (opts?.publish) {
    await publishVersion(v.id);
  }

  return {
    articleId: article.id,
    versionId: v.id,
    slug: article.slug,
    warnings,
    sharedCreated,
    counts: {
      narrative_sections: payload.narrative_sections?.length ?? 0,
      faqs: payload.faqs?.length ?? 0,
      quiz: payload.quiz?.length ?? 0,
      downloads: payload.downloads?.length ?? 0,
      official_sources: payload.official_sources?.length ?? 0,
      related_links: relatedCount,
    },
  };
}

export async function executeGuideImportFromJson(raw: string, opts?: { publish?: boolean; serviceLibraryId?: string }) {
  const payload = parseGuideImportJson(raw);
  return executeGuideImport(payload, opts);
}
