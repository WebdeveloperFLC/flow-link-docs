import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { listArticles } from "../repositories/kcRepo";
import { KcStatusBadge } from "../components/KcStatusBadge";

export default function ArticlesIndexPage() {
  const [articles, setArticles] = useState<Awaited<ReturnType<typeof listArticles>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listArticles({ kind: "shared", status: "published" })
      .then(setArticles)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <PageHeader title="Shared Knowledge" description="Cross-cutting counselling articles referenced across services." />
      <div className="p-8">
        {loading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shared articles published yet.</p>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => (
              <Link key={a.id} to={`/knowledge-centre/articles/${a.slug}`}>
                <Card className="p-4 flex justify-between hover:bg-muted/50">
                  <span>{a.title}</span>
                  <KcStatusBadge status={a.status} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
