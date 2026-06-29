import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { listArticles } from "../repositories/kcRepo";
import { KcStatusBadge } from "../components/KcStatusBadge";
import { supabase } from "@/integrations/supabase/client";

export default function CountryHubPage() {
  const { code } = useParams<{ code: string }>();
  const [name, setName] = useState(code ?? "");
  const [articles, setArticles] = useState<Awaited<ReturnType<typeof listArticles>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    supabase.from("countries").select("name").eq("code", code).maybeSingle().then(({ data }) => {
      if (data?.name) setName(data.name);
    });
    listArticles({ countryCode: code, status: "published" })
      .then(setArticles)
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <AppLayout>
      <PageHeader title={name} description={`Knowledge topics for ${name}`} />
      <div className="p-8 space-y-4">
        <div className="flex gap-3 text-sm">
          <Link to="/knowledge-centre/official-sources" className="text-primary hover:underline">Official sources</Link>
          <Link to="/knowledge-centre/downloads" className="text-primary hover:underline">Downloads</Link>
        </div>
        {loading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published topics for this country yet.</p>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => (
              <Link key={a.id} to={`/knowledge-centre/articles/${a.slug}`}>
                <Card className="p-4 flex items-center justify-between hover:bg-muted/50">
                  <span className="font-medium">{a.title}</span>
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
