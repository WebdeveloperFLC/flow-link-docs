import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { listArticles } from "@/knowledge-centre/repositories/kcRepo";
import { kcRoutes } from "@/knowledge-centre/lib/kcRoutes";

export default function QuizIndexPage() {
  const [articles, setArticles] = useState<Awaited<ReturnType<typeof listArticles>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listArticles({ status: "published" })
      .then((rows) => setArticles(rows.filter((a) => a.article_kind === "service" || a.article_kind === "quiz")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <PageHeader title="Quiz" description="Counsellor self-test quizzes attached to knowledge topics." />
      <div className="p-8 space-y-2">
        {loading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quiz topics published yet.</p>
        ) : (
          articles.map((a) => (
            <Link key={a.id} to={kcRoutes.quizRun(a.slug)}>
              <Card className="p-4 hover:bg-muted/50">{a.title}</Card>
            </Link>
          ))
        )}
      </div>
    </AppLayout>
  );
}
