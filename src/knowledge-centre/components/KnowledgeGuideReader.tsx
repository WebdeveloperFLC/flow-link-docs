import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { KcArticle, KcArticleVersion } from "@/knowledge-centre/types/kc";
import { resolveGuideSections, parseStructuredContent } from "@/knowledge-centre/lib/guideSections";
import { getVersionSatellites } from "@/knowledge-centre/repositories/kcRepo";
import { GuideSectionNavigator } from "./GuideSectionNavigator";
import { StructuredSectionPanel } from "./StructuredSectionPanel";
import { FaqSectionPanel } from "./FaqSectionPanel";
import { QuizSectionPanel } from "./QuizSectionPanel";
import { DownloadsSectionPanel } from "./DownloadsSectionPanel";
import { OfficialSourcesSectionPanel } from "./OfficialSourcesSectionPanel";
import { RelatedKnowledgePanel } from "./RelatedKnowledgePanel";
import { ArticleVersionBadge } from "./KcStatusBadge";

type Props = {
  article: KcArticle;
  version: KcArticleVersion;
  initialSectionId?: string;
  showQuizAnswers?: boolean;
};

export function KnowledgeGuideReader({ article, version, initialSectionId, showQuizAnswers }: Props) {
  const sections = resolveGuideSections(article.metadata);
  const [activeId, setActiveId] = useState(initialSectionId ?? sections[0]?.id ?? "overview");
  const [loading, setLoading] = useState(true);
  const [satellites, setSatellites] = useState<Awaited<ReturnType<typeof getVersionSatellites>> | null>(null);

  const structured = useMemo(() => parseStructuredContent(version.content_body), [version.content_body]);
  const activeManifest = sections.find((s) => s.id === activeId);
  const narrativeBlock = structured.sections.find((s) => s.id === activeId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getVersionSatellites(version.id)
      .then((data) => {
        if (!cancelled) setSatellites(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [version.id]);

  useEffect(() => {
    if (initialSectionId) setActiveId(initialSectionId);
  }, [initialSectionId]);

  const meta = article.metadata;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{article.title}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <ArticleVersionBadge label={version.version_label} publishedAt={version.published_at} />
            {meta.estimated_reading_minutes && (
              <Badge variant="outline">{meta.estimated_reading_minutes} min read</Badge>
            )}
            {meta.tags?.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </div>
      </div>

      {meta.external_module_refs?.length && (
        <Card className="p-3 flex flex-wrap gap-2">
          {meta.external_module_refs.map((ref) => (
            <Link key={ref.module} to={ref.route} className="text-sm text-primary hover:underline">
              {ref.label} ↗
            </Link>
          ))}
        </Card>
      )}

      <GuideSectionNavigator sections={sections} activeId={activeId} onSelect={setActiveId} />

      <Card className="p-6">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && activeManifest?.type === "narrative" && (
          <StructuredSectionPanel section={narrativeBlock} />
        )}
        {!loading && activeManifest?.type === "faq" && satellites && (
          <FaqSectionPanel items={satellites.faqs} />
        )}
        {!loading && activeManifest?.type === "quiz" && satellites && (
          <QuizSectionPanel questions={satellites.quiz} showAnswers={showQuizAnswers} />
        )}
        {!loading && activeManifest?.type === "downloads" && satellites && (
          <DownloadsSectionPanel assets={satellites.downloads} />
        )}
        {!loading && activeManifest?.type === "sources" && satellites && (
          <OfficialSourcesSectionPanel refs={satellites.sourceRefs} />
        )}
        {!loading && activeManifest?.type === "related" && satellites && (
          <RelatedKnowledgePanel links={satellites.internalLinks} />
        )}
      </Card>
    </div>
  );
}
