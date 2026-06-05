import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getGuideBySlug, getGuideContent } from "../lib/guideRegistry";
import { GuideMarkdown } from "../components/GuideMarkdown";
import { GuideSearchBar, INSTITUTIONS_GUIDE_KEYWORDS } from "../components/GuideSearchBar";
import { WHATSAPP_GUIDE_KEYWORDS } from "../lib/whatsappGuideKeywords";
import { WHATSAPP_META_TEAM_SETUP_KEYWORDS } from "../lib/whatsappMetaTeamSetupKeywords";
import { useVisibleGuides } from "../hooks/useVisibleGuides";
import { filterSections, introMatches, parseGuideSections } from "../lib/parseGuideSections";
import { slugify } from "../lib/slugify";

const GUIDE_KEYWORDS: Record<string, string[]> = {
  "institutions-module": INSTITUTIONS_GUIDE_KEYWORDS,
  "whatsapp-helpline": WHATSAPP_GUIDE_KEYWORDS,
  "whatsapp-meta-team-setup": WHATSAPP_META_TEAM_SETUP_KEYWORDS,
};

export default function GuideDetailPage() {
  const { slug = "" } = useParams();
  const [query, setQuery] = useState("");
  const { guides, loading } = useVisibleGuides();
  const guide = getGuideBySlug(slug);
  const content = guide ? getGuideContent(slug) : null;
  const allowed = !!guide && guides.some((g) => g.slug === slug);

  const { intro, sections } = useMemo(
    () => (content ? parseGuideSections(content) : { intro: "", sections: [] }),
    [content],
  );

  const filteredSections = useMemo(() => filterSections(sections, query), [sections, query]);
  const showIntro = introMatches(intro, query);
  const matchCount = filteredSections.length + (showIntro && query ? 1 : 0);
  const keywords = GUIDE_KEYWORDS[slug] ?? [];

  const scrollTo = (id: string) => {
    setQuery("");
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
      <div className="flex min-h-0 flex-col lg:flex-row">
        <aside className="hidden lg:block w-72 shrink-0 border-r bg-muted/20 p-4 space-y-4 sticky top-0 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 mb-2">
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
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 mb-2">
              On this page
            </div>
            <nav className="space-y-0.5">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className={cn(
                    "w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors truncate",
                    query && !filteredSections.some((f) => f.id === s.id)
                      ? "text-muted-foreground/40 line-through"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {s.title.replace(/^\d+\.\s*/, "")}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          <GuideSearchBar
            query={query}
            onQueryChange={setQuery}
            sections={sections}
            keywords={keywords}
            matchCount={query ? matchCount : sections.length}
          />

          <Card className="m-4 md:m-6 p-6 md:p-10 border-0 shadow-none bg-transparent flex-1">
            {(!query || showIntro) && <GuideMarkdown content={intro} highlightQuery={query} />}

            {query && !showIntro && filteredSections.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                No sections match &ldquo;{query}&rdquo;. Try a quick topic badge above.
              </p>
            )}

            {(query ? filteredSections : sections).map((section) => (
              <div key={section.id} id={slugify(section.title)} className="scroll-mt-32">
                <GuideMarkdown content={section.markdown} highlightQuery={query} />
              </div>
            ))}
          </Card>
        </main>
      </div>
    </AppLayout>
  );
}
