import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Globe, Briefcase, BookOpen, Download, HelpCircle, Link2 } from "lucide-react";
import { listArticles } from "@/knowledge-centre/repositories/kcRepo";

export default function KnowledgeCentreDashboardPage() {
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof listArticles>>>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    listArticles({ status: "published", limit: 8 })
      .then(setRecent)
      .finally(() => setLoading(false));
  }, []);

  const tiles = [
    { to: "/knowledge-centre/countries", icon: Globe, label: "Countries" },
    { to: "/knowledge-centre/services", icon: Briefcase, label: "Services" },
    { to: "/knowledge-centre/articles", icon: BookOpen, label: "Shared Knowledge" },
    { to: "/knowledge-centre/downloads", icon: Download, label: "Downloads" },
    { to: "/knowledge-centre/faqs", icon: HelpCircle, label: "FAQs" },
    { to: "/knowledge-centre/official-sources", icon: Link2, label: "Official Resources" },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Knowledge Centre"
        description="Single source of counselling knowledge — countries, services, topics, FAQs, quizzes, and official sources."
      />
      <div className="p-8 space-y-8 max-w-6xl">
        <form
          className="flex gap-2 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) window.location.href = `/knowledge-centre/search?q=${encodeURIComponent(q.trim())}`;
          }}
        >
          <Input placeholder="Search topics, keywords, tags…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit">Search</Button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <Link key={t.to} to={t.to}>
              <Card className="p-4 hover:bg-muted/50 transition-colors flex items-center gap-3">
                <t.icon className="size-5 text-primary" />
                <span className="font-medium">{t.label}</span>
              </Card>
            </Link>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Recent published topics</h3>
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published topics yet. Use Admin to create content or import a guide.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((a) => (
                <Link
                  key={a.id}
                  to={`/knowledge-centre/articles/${a.slug}`}
                  className="block text-sm text-primary hover:underline"
                >
                  {a.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
