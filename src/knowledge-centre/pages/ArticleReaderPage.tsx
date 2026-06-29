import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Loader2 } from "lucide-react";
import { resolveLiveArticle } from "../repositories/kcRepo";
import { KnowledgeGuideReader } from "../components/KnowledgeGuideReader";
import { KcEmptyState } from "../components/KcEmptyState";
import { useModulePermission } from "@/hooks/useModulePermission";

export default function ArticleReaderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const section = params.get("section") ?? undefined;
  const { canEdit } = useModulePermission("knowledge_centre");
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof resolveLiveArticle>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    resolveLiveArticle(slug)
      .then(setPayload)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <AppLayout>
      <PageHeader title="Knowledge Topic" description="Live published counselling knowledge." />
      <div className="p-8 max-w-5xl">
        {loading && <Loader2 className="size-6 animate-spin" />}
        {error && <KcEmptyState title="Unable to load topic" description={error} />}
        {!loading && !payload?.article && (
          <KcEmptyState title="Topic not found" description="This topic may be unpublished or does not exist." />
        )}
        {payload?.article && payload.version && (
          <KnowledgeGuideReader
            article={payload.article}
            version={payload.version}
            initialSectionId={section}
            showQuizAnswers={canEdit}
          />
        )}
        {payload?.article && !payload.version && (
          <KcEmptyState title="No published version" description="An editor must publish a version before this topic is readable." />
        )}
      </div>
    </AppLayout>
  );
}
