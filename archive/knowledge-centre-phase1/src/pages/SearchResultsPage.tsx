import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { searchArticles } from "@/knowledge-centre/repositories/kcRepo";
import { KcStatusBadge } from "@/knowledge-centre/components/KcStatusBadge";
import type { KcSearchResult } from "@/knowledge-centre/types/kc";
import { kcRoutes } from "@/knowledge-centre/lib/kcRoutes";

export default function SearchResultsPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<KcSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const run = (query: string) => {
    setLoading(true);
    searchArticles({ query, limit: 100 })
      .then((rows) =>
        rows.map((r) => ({
          ...r,
          tags: Array.isArray(r.tags) ? r.tags : [],
          categories: Array.isArray(r.categories) ? r.categories : [],
        })),
      )
      .then(setResults)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const initial = params.get("q") ?? "";
    if (initial) run(initial);
  }, [params]);

  return (
    <AppLayout>
      <PageHeader title="Search" description="Find knowledge topics by keyword, tag, country, or service." />
      <div className="p-8 space-y-4 max-w-3xl">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ q: q.trim() });
            run(q.trim());
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keyword search…" />
          <Button type="submit">Search</Button>
        </form>
        {loading && <Loader2 className="size-5 animate-spin" />}
        {!loading && results.length === 0 && q && (
          <p className="text-sm text-muted-foreground">No results.</p>
        )}
        <div className="space-y-2">
          {results.map((r) => (
            <Link key={r.article_id} to={kcRoutes.article(r.slug)}>
              <Card className="p-4 hover:bg-muted/50 space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <KcStatusBadge status={r.status as any} />
                </div>
                {r.snippet && <p className="text-xs text-muted-foreground line-clamp-2">{r.snippet}</p>}
                {r.version_label && <span className="text-xs text-muted-foreground">v{r.version_label}</span>}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
