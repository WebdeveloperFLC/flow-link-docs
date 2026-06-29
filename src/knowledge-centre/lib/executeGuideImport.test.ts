import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { executeGuideImport } from "./executeGuideImport";
import * as kcRepo from "@/knowledge-centre/repositories/kcRepo";

import { CANADA_GUIDE_IMPORT_REPO_PATH } from "./guideImport";

const FIXTURE = JSON.parse(
  readFileSync(CANADA_GUIDE_IMPORT_REPO_PATH, "utf8"),
);

describe("executeGuideImport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps narrative_sections into initial version content_body on client fallback", async () => {
    vi.spyOn(kcRepo, "importGuideViaRpc").mockRejectedValue(
      new Error("function kc_import_guide does not exist"),
    );
    vi.spyOn(kcRepo, "getArticleBySlug").mockResolvedValue(null);
    vi.spyOn(kcRepo, "listOfficialSources").mockResolvedValue([]);

    const createSpy = vi.spyOn(kcRepo, "createArticle").mockResolvedValue({
      article: { id: "art-1", slug: FIXTURE.slug, current_version_id: "ver-1" } as any,
      version: { id: "ver-1", content_body: "" } as any,
    });
    const faqSpy = vi.spyOn(kcRepo, "upsertFaqItem").mockResolvedValue({ id: "f1" } as any);
    const quizSpy = vi.spyOn(kcRepo, "upsertQuizQuestion").mockResolvedValue({ id: "q1" } as any);
    const dlSpy = vi.spyOn(kcRepo, "upsertDownloadAsset").mockResolvedValue({ id: "d1" } as any);
    const srcSpy = vi.spyOn(kcRepo, "upsertOfficialSource").mockResolvedValue({ id: "s1" } as any);
    vi.spyOn(kcRepo, "upsertSourceRef").mockResolvedValue({ id: "sr1" } as any);
    vi.spyOn(kcRepo, "upsertInternalLink").mockResolvedValue({ id: "l1" } as any);
    vi.spyOn(kcRepo, "getVersionSatellites").mockResolvedValue({
      faqs: Array(FIXTURE.faqs.length).fill({ id: "f" }),
      quiz: Array(FIXTURE.quiz.length).fill({ id: "q" }),
      downloads: Array(FIXTURE.downloads.length).fill({ id: "d" }),
      sourceRefs: Array(FIXTURE.official_sources.length).fill({ id: "sr" }),
      internalLinks: [],
    } as any);

    const result = await executeGuideImport(FIXTURE);

    const mainCreateCall = createSpy.mock.calls.find((c) => c[0].slug === FIXTURE.slug);
    expect(mainCreateCall).toBeDefined();
    const bodyArg = mainCreateCall![0].initialContentBody!;
    const parsed = JSON.parse(bodyArg);
    expect(parsed.sections.length).toBe(FIXTURE.narrative_sections.length);
    expect(parsed.sections[0].body_md).toContain("Overview");

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: FIXTURE.slug,
        initialContentBody: expect.stringContaining("sections"),
      }),
    );

    expect(faqSpy).toHaveBeenCalledTimes(FIXTURE.faqs.length);
    expect(quizSpy).toHaveBeenCalledTimes(FIXTURE.quiz.length);
    expect(dlSpy).toHaveBeenCalledTimes(FIXTURE.downloads.length);
    expect(srcSpy).toHaveBeenCalledTimes(FIXTURE.official_sources.length);
    expect(result.counts.faqs).toBe(FIXTURE.faqs.length);
  });

  it("uses RPC result when kc_import_guide is available", async () => {
    vi.spyOn(kcRepo, "importGuideViaRpc").mockResolvedValue({
      article_id: "rpc-art",
      version_id: "rpc-ver",
      slug: FIXTURE.slug,
      counts: {
        narrative_sections: 9,
        faqs: 25,
        quiz: 30,
        downloads: 6,
        official_sources: 15,
        related_links: 12,
      },
    });
    vi.spyOn(kcRepo, "resolveLiveArticle").mockResolvedValue({
      article: { id: "rpc-art", slug: FIXTURE.slug, status: "published" } as any,
      version: {
        id: "rpc-ver",
        content_body: JSON.stringify({ sections: FIXTURE.narrative_sections }),
      } as any,
    });
    vi.spyOn(kcRepo, "getVersionSatellites").mockResolvedValue({
      faqs: Array(FIXTURE.faqs.length).fill({ id: "f" }),
      quiz: Array(FIXTURE.quiz.length).fill({ id: "q" }),
      downloads: Array(FIXTURE.downloads.length).fill({ id: "d" }),
      sourceRefs: Array(FIXTURE.official_sources.length).fill({ id: "sr" }),
      internalLinks: [],
    } as any);

    const result = await executeGuideImport(FIXTURE);
    expect(result.articleId).toBe("rpc-art");
    expect(result.versionId).toBe("rpc-ver");
    expect(result.counts.faqs).toBe(25);
  });

  it("falls back to client import when RPC stores empty narrative content", async () => {
    vi.spyOn(kcRepo, "importGuideViaRpc").mockResolvedValue({
      article_id: "rpc-art",
      version_id: "rpc-ver",
      slug: FIXTURE.slug,
      counts: {
        narrative_sections: 9,
        faqs: 25,
        quiz: 30,
        downloads: 6,
        official_sources: 15,
        related_links: 12,
      },
    });
    vi.spyOn(kcRepo, "resolveLiveArticle").mockResolvedValue({
      article: { id: "rpc-art", slug: FIXTURE.slug, status: "draft" } as any,
      version: {
        id: "rpc-ver",
        content_body: JSON.stringify({
          sections: FIXTURE.narrative_sections.map((s: { id: string; title: string }) => ({
            id: s.id,
            title: s.title,
          })),
        }),
      } as any,
    });
    vi.spyOn(kcRepo, "getArticleBySlug").mockResolvedValue(null);
    vi.spyOn(kcRepo, "listOfficialSources").mockResolvedValue([]);
    const createSpy = vi.spyOn(kcRepo, "createArticle").mockResolvedValue({
      article: { id: "art-1", slug: FIXTURE.slug, current_version_id: "ver-1" } as any,
      version: { id: "ver-1", content_body: "" } as any,
    });
    vi.spyOn(kcRepo, "upsertFaqItem").mockResolvedValue({ id: "f1" } as any);
    vi.spyOn(kcRepo, "upsertQuizQuestion").mockResolvedValue({ id: "q1" } as any);
    vi.spyOn(kcRepo, "upsertDownloadAsset").mockResolvedValue({ id: "d1" } as any);
    vi.spyOn(kcRepo, "upsertOfficialSource").mockResolvedValue({ id: "s1" } as any);
    vi.spyOn(kcRepo, "upsertSourceRef").mockResolvedValue({ id: "sr1" } as any);
    vi.spyOn(kcRepo, "upsertInternalLink").mockResolvedValue({ id: "l1" } as any);
    vi.spyOn(kcRepo, "getVersionSatellites").mockResolvedValue({
      faqs: Array(FIXTURE.faqs.length).fill({ id: "f" }),
      quiz: Array(FIXTURE.quiz.length).fill({ id: "q" }),
      downloads: Array(FIXTURE.downloads.length).fill({ id: "d" }),
      sourceRefs: Array(FIXTURE.official_sources.length).fill({ id: "sr" }),
      internalLinks: [],
    } as any);

    const result = await executeGuideImport(FIXTURE, { replace: true });
    expect(createSpy).toHaveBeenCalled();
    expect(result.articleId).toBe("art-1");
  });
});
