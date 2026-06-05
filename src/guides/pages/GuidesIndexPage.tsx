import { Link } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVisibleGuides } from "../hooks/useVisibleGuides";

export default function GuidesIndexPage() {
  const { guides, loading } = useVisibleGuides();

  const byCategory = guides.reduce<Record<string, typeof guides>>((acc, g) => {
    (acc[g.category] ??= []).push(g);
    return acc;
  }, {});

  return (
    <AppLayout>
      <PageHeader
        title="Staff Guides"
        description="Operational documentation for CRM modules. More guides are added here over time."
      />
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {loading && <p className="text-sm text-muted-foreground">Loading guides…</p>}

        {!loading && guides.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No guides are available for your role yet. Ask an admin to grant module access.
          </Card>
        )}

        {Object.entries(byCategory).map(([category, items]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{category}</h2>
            <div className="grid gap-3">
              {items.map((guide) => (
                <Link key={guide.slug} to={`/guides/${guide.slug}`}>
                  <Card className="p-5 flex items-start gap-4 hover:bg-accent/40 transition-colors group">
                    <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {guide.title}
                        </h3>
                        <Badge variant="secondary" className="text-[10px]">
                          {category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{guide.description}</p>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary" />
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppLayout>
  );
}
