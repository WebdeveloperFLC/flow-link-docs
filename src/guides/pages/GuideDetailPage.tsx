import { Link, useParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getGuideBySlug, getGuideContent } from "../lib/guideRegistry";
import { GuideMarkdown } from "../components/GuideMarkdown";
import { useVisibleGuides } from "../hooks/useVisibleGuides";

export default function GuideDetailPage() {
  const { slug = "" } = useParams();
  const { guides, loading } = useVisibleGuides();
  const guide = getGuideBySlug(slug);
  const content = guide ? getGuideContent(slug) : null;
  const allowed = !!guide && guides.some((g) => g.slug === slug);

  if (!loading && !guide) {
    return (
      <AppLayout>
        <div className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">Guide not found.</p>
          <Button asChild variant="outline">
            <Link to="/guides">Back to Staff Guides</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!loading && guide && !allowed) {
    return (
      <AppLayout>
        <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
          <p className="text-muted-foreground">
            You don&apos;t have access to this guide. It requires permissions for the related module.
          </p>
          <Button asChild variant="outline">
            <Link to="/guides">Back to Staff Guides</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (loading || !guide || !content) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">Loading guide…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={guide.title} description={guide.description} />
      <div className="flex min-h-0">
        <aside className="hidden lg:block w-64 shrink-0 border-r bg-muted/20 p-4 space-y-2 sticky top-0 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
            Staff Guides
          </div>
          <nav className="space-y-1">
            {guides.map((g) => (
              <Link
                key={g.slug}
                to={`/guides/${g.slug}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                  g.slug === slug
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <BookOpen className="size-3.5 shrink-0" />
                <span className="truncate">{g.navLabel}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <Card className="m-6 md:m-8 p-6 md:p-10 border-0 shadow-none bg-transparent">
            <GuideMarkdown content={content} />
          </Card>
        </main>
      </div>
    </AppLayout>
  );
}