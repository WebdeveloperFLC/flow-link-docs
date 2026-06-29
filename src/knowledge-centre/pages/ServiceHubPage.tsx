import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { listArticles, resolveLiveArticle } from "../repositories/kcRepo";
import { KnowledgeGuideReader } from "../components/KnowledgeGuideReader";
import { supabase } from "@/integrations/supabase/client";

export default function ServiceHubPage() {
  const { libraryId } = useParams<{ libraryId: string }>();
  const [label, setLabel] = useState("Service");
  const [master, setMaster] = useState<Awaited<ReturnType<typeof resolveLiveArticle>>>(null);
  const [related, setRelated] = useState<Awaited<ReturnType<typeof listArticles>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!libraryId) return;
    supabase
      .from("service_library")
      .select("service, sub_service")
      .eq("id", libraryId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLabel([data.service, data.sub_service].filter(Boolean).join(" — "));
      });

    listArticles({ serviceLibraryId: libraryId, status: "published" })
      .then(async (articles) => {
        setRelated(articles);
        const masterArticle = articles.find((a) => a.article_kind === "service") ?? articles[0];
        if (masterArticle) {
          const live = await resolveLiveArticle(undefined, masterArticle.id);
          setMaster(live);
        }
      })
      .finally(() => setLoading(false));
  }, [libraryId]);

  return (
    <AppLayout>
      <PageHeader title={label} description="Service knowledge hub — master guide and related topics." />
      <div className="p-8 space-y-8 max-w-5xl">
        {loading && <Loader2 className="size-6 animate-spin" />}
        {!loading && master?.article && master.version && (
          <KnowledgeGuideReader article={master.article} version={master.version} />
        )}
        {!loading && !master?.version && (
          <p className="text-sm text-muted-foreground">No published master guide for this service yet.</p>
        )}
        {related.length > 1 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">All topics for this service</h3>
            <div className="space-y-2">
              {related.map((a) => (
                <Link key={a.id} to={`/knowledge-centre/articles/${a.slug}`} className="text-sm text-primary hover:underline">
                  {a.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
