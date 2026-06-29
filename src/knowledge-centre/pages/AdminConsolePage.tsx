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
import { listArticles, createArticle, getDraftOrLatestVersion, updateVersion, publishVersion, upsertFaqItem, upsertQuizQuestion, upsertOfficialSource, upsertSourceRef, getArticleBySlug, upsertInternalLink } from "../repositories/kcRepo";
import { KcStatusBadge } from "../components/KcStatusBadge";
import { toast } from "sonner";
import {
  parseGuideImportJson,
  buildArticleMetadataFromImport,
  buildStructuredBodyFromImport,
  validateImportAgainstGoldStandard,
} from "../lib/guideImport";
import { DEFAULT_GUIDE_SECTIONS } from "../lib/guideSections";

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
      const payload = parseGuideImportJson(importJson);
      const warnings = validateImportAgainstGoldStandard(payload);
      const { article, version } = await createArticle({
        slug: payload.slug,
        title: payload.title,
        article_kind: payload.article_kind ?? "service",
        metadata: buildArticleMetadataFromImport(payload),
        countryCodes: payload.country_codes,
        serviceLibraryIds: payload.service_library_ids,
      });
      await updateVersion(version.id, {
        content_body: buildStructuredBodyFromImport(payload),
        content_format: "structured",
        version_label: payload.version_label ?? "1.0.0",
      });
      const v = await getDraftOrLatestVersion(article.id);
      if (!v) throw new Error("Version missing");

      for (const [i, faq] of (payload.faqs ?? []).entries()) {
        await upsertFaqItem({
          article_id: article.id,
          version_id: v.id,
          sort_order: faq.sort_order ?? i + 1,
          question: faq.question,
          answer: faq.answer,
        });
      }
      for (const [i, q] of (payload.quiz ?? []).entries()) {
        await upsertQuizQuestion({
          article_id: article.id,
          version_id: v.id,
          sort_order: q.sort_order ?? i + 1,
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation,
          level: q.level,
        });
      }
      for (const src of payload.official_sources ?? []) {
        const row = await upsertOfficialSource({
          title: src.title,
          official_url: src.official_url,
          authority: src.authority,
          category: src.category,
          country_code: src.country_code ?? null,
          metadata: src.reason ? { reason: src.reason } : {},
        });
        await upsertSourceRef({
          version_id: v.id,
          official_source_id: row.id,
          anchor_label: src.title,
          sort_order: 0,
        });
      }
      for (const relSlug of payload.related_article_slugs ?? []) {
        const target = await getArticleBySlug(relSlug);
        if (target) {
          await upsertInternalLink({
            from_version_id: v.id,
            to_article_id: target.id,
            link_type: "related",
            anchor_text: target.title,
          });
        }
      }
      toast.success(warnings.length ? `Imported with warnings: ${warnings.join("; ")}` : "Guide imported");
      setImportOpen(false);
      window.location.href = `/knowledge-centre/admin/articles/${article.id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Knowledge Centre Admin"
        description="Create, edit, publish, and import knowledge topics."
        actions={
          <div className="flex gap-2">
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
