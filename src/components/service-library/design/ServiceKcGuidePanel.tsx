import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  listLinkedArticles,
  resolveGuideForServiceLibrary,
  resolveLiveArticle,
} from "@/knowledge-centre/repositories/kcRepo";
import { KnowledgeGuideReader } from "@/knowledge-centre/components/KnowledgeGuideReader";
import { kcRoutes } from "@/knowledge-centre/lib/kcRoutes";

export function ServiceKcGuidePanel({ libraryId }: { libraryId: string }) {
  const [loading, setLoading] = useState(true);
  const [master, setMaster] = useState<Awaited<ReturnType<typeof resolveLiveArticle>>>(null);
  const [related, setRelated] = useState<Awaited<ReturnType<typeof listLinkedArticles>>>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      resolveGuideForServiceLibrary(libraryId),
      listLinkedArticles(libraryId, { status: "published" }),
    ])
      .then(([live, articles]) => {
        if (cancelled) return;
        setMaster(live);
        setRelated(articles);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!master?.article || !master.version) {
    return (
      <Card className="p-5 shadow-elev-sm">
        <p className="text-sm text-muted-foreground">
          No published Knowledge Centre guide for this service yet. Other tabs may still show legacy migration-source
          content until import is complete.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <KnowledgeGuideReader article={master.article} version={master.version} />
      {related.length > 1 && (
        <Card className="p-4 shadow-elev-sm">
          <h3 className="text-sm font-semibold mb-2">All topics for this service</h3>
          <div className="space-y-1">
            {related.map((a) => (
              <Link
                key={a.id}
                to={kcRoutes.article(a.slug)}
                className="text-sm text-primary hover:underline block"
              >
                {a.title}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
