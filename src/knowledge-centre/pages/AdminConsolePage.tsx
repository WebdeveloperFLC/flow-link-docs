import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Upload } from "lucide-react";
import { listArticles, createArticle } from "@/knowledge-centre/repositories/kcRepo";
import { KcStatusBadge } from "@/knowledge-centre/components/KcStatusBadge";
import { toast } from "sonner";
import { DEFAULT_GUIDE_SECTIONS } from "@/knowledge-centre/lib/guideSections";

export default function AdminConsolePage() {
  const [articles, setArticles] = useState<Awaited<ReturnType<typeof listArticles>>>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [importJson, setImportJson] = useState("");

  const reload = () => {
    setLoading(true);
    listArticles().then(setArticles).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const handleCreate = async () => {
    try {
      const { article } = await createArticle({
        slug: slug.trim(),
        title: title.trim(),
        article_kind: "service",
        metadata: { guide_sections: DEFAULT_GUIDE_SECTIONS, tags: [], categories: [] },
      });
      toast.success("Article created");
      setCreateOpen(false);
      window.location.href = `/knowledge-centre/admin/articles/${article.id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  };

  const handleImport = async () => {
    try {
      const { executeGuideImportFromJson } = await import("@/knowledge-centre/lib/executeGuideImport");
      const result = await executeGuideImportFromJson(importJson);
      toast.success(
        result.warnings.length
          ? `Imported with warnings: ${result.warnings.join("; ")}`
          : `Imported ${result.counts.faqs} FAQs, ${result.counts.quiz} quiz, ${result.counts.downloads} downloads`,
      );
      setImportOpen(false);
      window.location.href = `/knowledge-centre/admin/articles/${result.articleId}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  };

  const loadCanadaTemplate = async () => {
    try {
      const res = await fetch("/content/knowledge-centre/imports/canada-student-visa-outside-canada.json");
      if (!res.ok) throw new Error("Template file not found — run npm run kc:build-canada-import");
      setImportJson(await res.text());
      setImportOpen(true);
      toast.success("Canada template loaded — review and click Import");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Knowledge Centre Admin"
        description="Create, edit, publish, and import knowledge topics."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadCanadaTemplate}>
              Load Canada template
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4 mr-1" /> Import JSON
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4 mr-1" /> New topic
            </Button>
          </div>
        }
      />
      <div className="p-8">
        {loading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <div className="space-y-2">
            {articles.map((a) => (
              <Link key={a.id} to={`/knowledge-centre/admin/articles/${a.id}`}>
                <Card className="p-4 flex justify-between hover:bg-muted/50">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.slug}</div>
                  </div>
                  <KcStatusBadge status={a.status} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New knowledge topic</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="slug (e.g. canada-student-visa-outside-canada)" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Import guide JSON</DialogTitle></DialogHeader>
          <Textarea className="min-h-[240px] font-mono text-xs" value={importJson} onChange={(e) => setImportJson(e.target.value)} placeholder='{"slug":"...","title":"...", ...}' />
          <DialogFooter>
            <Button onClick={handleImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
