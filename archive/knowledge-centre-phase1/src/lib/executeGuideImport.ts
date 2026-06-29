import {
  buildArticleMetadataFromImport,
  buildStructuredBodyFromImport,
  parseGuideImportJson,
  validateImportAgainstGoldStandard,
  type GuideImportPayload,
} from "./guideImport";
import { parseStructuredContent } from "./guideSections";
import { supabase } from "@/integrations/supabase/client";
import {
  createArticle,
  getArticleBySlug,
  getVersionSatellites,
  resolveLiveArticle,
  upsertFaqItem,
  upsertQuizQuestion,
  upsertOfficialSource,
  upsertSourceRef,
  upsertInternalLink,
  upsertDownloadAsset,
  listOfficialSources,
  publishVersion,
  importGuideViaRpc,
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

function isRpcUnavailableError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("kc_import_guide") &&
    (m.includes("does not exist") || m.includes("could not find") || m.includes("not found"))
  );
}

async function findOfficialSourceByUrl(url: string) {
  const rows = await listOfficialSources();
  return rows.find((r) => r.official_url === url) ?? null;
}

async function importSharedStub(shared: NonNullable<GuideImportPayload["shared_articles"]>[number]) {
  const existing = await getArticleBySlug(shared.slug);
  if (existing) return existing.id;

  const body = JSON.stringify({ sections: shared.narrative_sections ?? [] });
  const { article } = await createArticle({
    slug: shared.slug,
    title: shared.title,
    article_kind: shared.article_kind ?? "shared",
    metadata: { tags: ["shared", "related-knowledge"], categories: ["counselling"] },
    countryCodes: shared.country_codes,
    initialContentBody: body,
    initialVersionLabel: "1.0.0",
  });
  return article.id;
}

async function deleteArticleBySlug(slug: string) {
  const existing = await getArticleBySlug(slug);
  if (!existing) return false;
  const { error } = await supabase.from("kc_articles" as any).delete().eq("id", existing.id);
  if (error) throw new Error(error.message ?? "Delete failed");
  return true;
}

async function verifyImportSatellites(
  versionId: string,
  payload: GuideImportPayload,
): Promise<void> {
  const sats = await getVersionSatellites(versionId);
  const expected = {
    faqs: payload.faqs?.length ?? 0,
    quiz: payload.quiz?.length ?? 0,
    downloads: payload.downloads?.length ?? 0,
    sourceRefs: payload.official_sources?.length ?? 0,
  };
  const mismatches: string[] = [];
  if (sats.faqs.length !== expected.faqs) mismatches.push(`FAQs ${sats.faqs.length}/${expected.faqs}`);
  if (sats.quiz.length !== expected.quiz) mismatches.push(`Quiz ${sats.quiz.length}/${expected.quiz}`);
  if (sats.downloads.length !== expected.downloads) mismatches.push(`Downloads ${sats.downloads.length}/${expected.downloads}`);
  if (sats.sourceRefs.length !== expected.sourceRefs) {
    mismatches.push(`Official refs ${sats.sourceRefs.length}/${expected.sourceRefs}`);
  }
  if (mismatches.length) {
    throw new Error(`Import incomplete — ${mismatches.join("; ")}`);
  }
}

async function verifyImportedContent(articleId: string, versionId: string, payload: GuideImportPayload): Promise<boolean> {
  const live = await resolveLiveArticle(undefined, articleId);
  if (!live?.version) return false;

  const expectedNarrative = payload.narrative_sections?.length ?? 0;
  if (expectedNarrative > 0) {
    const parsed = parseStructuredContent(live.version.content_body);
    const withBody = parsed.sections.filter((s) => (s.body_md ?? "").trim().length > 0).length;
    if (parsed.sections.length < expectedNarrative || withBody === 0) return false;
  }

  const sats = await getVersionSatellites(versionId);
  if ((payload.faqs?.length ?? 0) > 0 && sats.faqs.length < payload.faqs!.length) return false;
  if ((payload.quiz?.length ?? 0) > 0 && sats.quiz.length < payload.quiz!.length) return false;
  if ((payload.downloads?.length ?? 0) > 0 && sats.downloads.length < payload.downloads!.length) return false;
  if ((payload.official_sources?.length ?? 0) > 0 && sats.sourceRefs.length < payload.official_sources!.length) {
    return false;
  }

  return true;
}

async function executeGuideImportClient(
  payload: GuideImportPayload,
  opts?: { publish?: boolean; replace?: boolean },
): Promise<GuideImportResult> {
  const warnings = validateImportAgainstGoldStandard(payload);
  const sharedCreated: string[] = [];

  if (opts?.replace) {
    await deleteArticleBySlug(payload.slug);
  }

  for (const shared of payload.shared_articles ?? []) {
    await importSharedStub(shared);
    sharedCreated.push(shared.slug);
  }

  const existing = await getArticleBySlug(payload.slug);
  if (existing) {
    throw new Error(`Article already exists: ${payload.slug}. Use replace in Admin or delete before re-import.`);
  }

  const { article, version } = await createArticle({
    slug: payload.slug,
    title: payload.title,
    article_kind: payload.article_kind ?? "service",
    metadata: buildArticleMetadataFromImport(payload),
    countryCodes: payload.country_codes,
    serviceLibraryIds: payload.service_library_ids,
    initialContentBody: buildStructuredBodyFromImport(payload),
    initialVersionLabel: payload.version_label ?? "1.0.0",
  });

  const versionId = version.id;

  for (const [i, faq] of (payload.faqs ?? []).entries()) {
    await upsertFaqItem({
      article_id: article.id,
      version_id: versionId,
      sort_order: faq.sort_order ?? i + 1,
      question: faq.question,
      answer: faq.answer,
    });
  }

  for (const [i, q] of (payload.quiz ?? []).entries()) {
    await upsertQuizQuestion({
      article_id: article.id,
      version_id: versionId,
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
      version_id: versionId,
      official_source_id: row.id,
      anchor_label: src.title,
      sort_order: sourceSort,
    });
  }

  for (const [i, d] of (payload.downloads ?? []).entries()) {
    await upsertDownloadAsset({
      article_id: article.id,
      version_id: versionId,
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
        from_version_id: versionId,
        to_article_id: target.id,
        link_type: "related",
        anchor_text: target.title,
      });
      relatedCount += 1;
    } else {
      warnings.push(`Related article not found: ${relSlug}`);
    }
  }

  await verifyImportSatellites(versionId, payload);

  if (opts?.publish) {
    await publishVersion(versionId);
  }

  return {
    articleId: article.id,
    versionId,
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

export async function executeGuideImport(
  payload: GuideImportPayload,
  opts?: { publish?: boolean; serviceLibraryId?: string; replace?: boolean },
): Promise<GuideImportResult> {
  if (payload.service_library_ids?.length === 0 && opts?.serviceLibraryId) {
    payload.service_library_ids = [opts.serviceLibraryId];
  }

  const warnings = validateImportAgainstGoldStandard(payload);

  try {
    const rpc = await importGuideViaRpc(payload as Record<string, unknown>, {
      replace: opts?.replace,
      publish: opts?.publish,
    });
    const contentOk = await verifyImportedContent(rpc.article_id, rpc.version_id, payload);
    if (!contentOk) {
      await deleteArticleBySlug(payload.slug);
      return executeGuideImportClient(payload, opts);
    }
    return {
      articleId: rpc.article_id,
      versionId: rpc.version_id,
      slug: rpc.slug,
      warnings,
      sharedCreated: (payload.shared_articles ?? []).map((s) => s.slug),
      counts: rpc.counts,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!isRpcUnavailableError(message)) {
      throw e;
    }
  }

  return executeGuideImportClient(payload, opts);
}

export async function executeGuideImportFromJson(
  raw: string,
  opts?: { publish?: boolean; serviceLibraryId?: string; replace?: boolean },
) {
  const payload = parseGuideImportJson(raw);
  return executeGuideImport(payload, opts);
}
