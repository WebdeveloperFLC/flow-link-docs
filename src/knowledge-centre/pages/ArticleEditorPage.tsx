import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import {
  getArticleById,
  getDraftOrLatestVersion,
  updateArticle,
  updateVersion,
  publishVersion,
  createNewVersionDraft,
  listArticleVersions,
  getVersionSatellites,
  upsertFaqItem,
  deleteFaqItem,
  upsertQuizQuestion,
  deleteQuizQuestion,
  upsertDownloadAsset,
  deleteDownloadAsset,
  uploadDownloadFile,
  listOfficialSources,
  upsertSourceRef,
  deleteSourceRef,
  listArticles,
  upsertInternalLink,
  deleteInternalLink,
} from "../repositories/kcRepo";
import { KnowledgeGuideReader } from "../components/KnowledgeGuideReader";
import { DEFAULT_GUIDE_SECTIONS, parseStructuredContent, resolveGuideSections, serializeStructuredContent } from "../lib/guideSections";
import type { KcArticle, KcArticleVersion, StructuredSectionBlock } from "../types/kc";
import { toast } from "sonner";
import { KcStatusBadge } from "../components/KcStatusBadge";

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<KcArticle | null>(null);
  const [version, setVersion] = useState<KcArticleVersion | null>(null);
  const [versions, setVersions] = useState<KcArticleVersion[]>([]);
  const [satellites, setSatellites] = useState<Awaited<ReturnType<typeof getVersionSatellites>> | null>(null);
  const [sections, setSections] = useState<StructuredSectionBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<Awaited<ReturnType<typeof listOfficialSources>>>([]);
  const [allArticles, setAllArticles] = useState<KcArticle[]>([]);

  const reload = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const a = await getArticleById(id);
      if (!a) throw new Error("Not found");
      const v = await getDraftOrLatestVersion(id);
      const vers = await listArticleVersions(id);
      setArticle(a);
      setVersion(v);
      setVersions(vers);
      if (v) {
        const parsed = parseStructuredContent(v.content_body);
        if (parsed.sections.length) {
          setSections(parsed.sections);
        } else {
          setSections(
            resolveGuideSections(a.metadata)
              .filter((s) => s.type === "narrative")
              .map((s) => ({ id: s.id, title: s.title })),
          );
        }
        setSatellites(await getVersionSatellites(v.id));
      }
      setSources(await listOfficialSources());
      setAllArticles(await listArticles());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [id]);

  const saveMeta = async () => {
    if (!article) return;
    try {
      await updateArticle(article.id, {
        title: article.title,
        slug: article.slug,
        status: article.status,
        metadata: article.metadata,
      });
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveBody = async () => {
    if (!version) return;
    try {
      await updateVersion(version.id, {
        content_body: serializeStructuredContent(sections),
        content_format: "structured",
        version_label: version.version_label,
        change_summary: version.change_summary ?? undefined,
        status: version.status,
      });
      toast.success("Content saved");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handlePublish = async () => {
    if (!version) return;
    try {
      await saveBody();
      await publishVersion(version.id);
      toast.success("Published");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    }
  };

  const newVersion = async () => {
    if (!article || !version) return;
    try {
      await createNewVersionDraft(article.id, version.id);
      toast.success("New draft version created");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (loading || !article) {
    return (
      <AppLayout>
        <div className="p-8 flex justify-center"><Loader2 className="size-8 animate-spin" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={`Edit: ${article.title}`}
        description={article.slug}
        actions={
          <div className="flex gap-2 flex-wrap">
            <KcStatusBadge status={article.status} />
            <Button size="sm" variant="outline" onClick={saveMeta}>Save meta</Button>
            <Button size="sm" variant="outline" onClick={saveBody}>Save content</Button>
            <Button size="sm" variant="outline" onClick={newVersion}>New version</Button>
            <Button size="sm" onClick={handlePublish}>Publish</Button>
          </div>
        }
      />
      <div className="p-8 space-y-6 max-w-6xl">
        <Tabs defaultValue="meta">
          <TabsList>
            <TabsTrigger value="meta">Meta</TabsTrigger>
            <TabsTrigger value="sections">Sections 1–9</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
            <TabsTrigger value="downloads">Downloads</TabsTrigger>
            <TabsTrigger value="sources">Official refs</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
          </TabsList>

          <TabsContent value="meta" className="space-y-3 mt-4">
            <Input value={article.title} onChange={(e) => setArticle({ ...article, title: e.target.value })} />
            <Input value={article.slug} onChange={(e) => setArticle({ ...article, slug: e.target.value })} />
            <Input
              placeholder="Tags (comma-separated)"
              value={(article.metadata.tags ?? []).join(", ")}
              onChange={(e) =>
                setArticle({
                  ...article,
                  metadata: { ...article.metadata, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) },
                })
              }
            />
            <Input
              placeholder="Categories (comma-separated)"
              value={(article.metadata.categories ?? []).join(", ")}
              onChange={(e) =>
                setArticle({
                  ...article,
                  metadata: { ...article.metadata, categories: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) },
                })
              }
            />
            <Input
              type="number"
              placeholder="Estimated reading minutes"
              value={article.metadata.estimated_reading_minutes ?? ""}
              onChange={(e) =>
                setArticle({
                  ...article,
                  metadata: { ...article.metadata, estimated_reading_minutes: Number(e.target.value) || undefined },
                })
              }
            />
            {version && (
              <Input
                value={version.version_label}
                onChange={(e) => setVersion({ ...version, version_label: e.target.value })}
                placeholder="Version label"
              />
            )}
          </TabsContent>

          <TabsContent value="sections" className="space-y-4 mt-4">
            {sections.map((s, idx) => (
              <div key={s.id} className="border rounded-md p-4 space-y-2">
                <div className="font-medium">{s.title || s.id}</div>
                <Textarea
                  className="min-h-[80px]"
                  value={s.body_md ?? ""}
                  onChange={(e) => {
                    const next = [...sections];
                    next[idx] = { ...s, body_md: e.target.value };
                    setSections(next);
                  }}
                  placeholder="Section body (markdown/plain)"
                />
                <Input
                  value={s.counselling_objective ?? ""}
                  onChange={(e) => {
                    const next = [...sections];
                    next[idx] = { ...s, counselling_objective: e.target.value };
                    setSections(next);
                  }}
                  placeholder="Counselling objective"
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="faqs" className="mt-4 space-y-2">
            {satellites?.faqs.map((f) => (
              <div key={f.id} className="border p-3 space-y-2">
                <Input value={f.question} readOnly />
                <Textarea value={f.answer} readOnly className="min-h-[60px]" />
                <Button size="sm" variant="destructive" onClick={() => deleteFaqItem(f.id).then(reload)}>Delete</Button>
              </div>
            ))}
            <Button
              size="sm"
              onClick={async () => {
                if (!article || !version) return;
                await upsertFaqItem({
                  article_id: article.id,
                  version_id: version.id,
                  sort_order: (satellites?.faqs.length ?? 0) + 1,
                  question: "New question",
                  answer: "",
                });
                reload();
              }}
            >
              Add FAQ
            </Button>
          </TabsContent>

          <TabsContent value="quiz" className="mt-4 space-y-2">
            {satellites?.quiz.map((q) => (
              <div key={q.id} className="border p-3">
                <div className="text-sm">{q.question}</div>
                <Button size="sm" variant="destructive" className="mt-2" onClick={() => deleteQuizQuestion(q.id).then(reload)}>Delete</Button>
              </div>
            ))}
            <Button
              size="sm"
              onClick={async () => {
                if (!article || !version) return;
                await upsertQuizQuestion({
                  article_id: article.id,
                  version_id: version.id,
                  sort_order: (satellites?.quiz.length ?? 0) + 1,
                  question: "New question",
                  options: ["A", "B", "C"],
                  correct_index: 0,
                  level: 1,
                });
                reload();
              }}
            >
              Add question
            </Button>
          </TabsContent>

          <TabsContent value="downloads" className="mt-4 space-y-2">
            {satellites?.downloads.map((d) => (
              <div key={d.id} className="border p-3 flex justify-between">
                <span>{d.title}</span>
                <Button size="sm" variant="destructive" onClick={() => deleteDownloadAsset(d.id).then(reload)}>Delete</Button>
              </div>
            ))}
            <input
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !article || !version) return;
                const path = `${article.slug}/${Date.now()}-${file.name}`;
                await uploadDownloadFile(path, file);
                await upsertDownloadAsset({
                  article_id: article.id,
                  version_id: version.id,
                  title: file.name,
                  storage_path: path,
                  download_type: "other",
                  mime_type: file.type,
                  file_size_bytes: file.size,
                });
                reload();
              }}
            />
          </TabsContent>

          <TabsContent value="sources" className="mt-4 space-y-2">
            <select
              className="border rounded px-2 py-1 text-sm"
              onChange={async (e) => {
                if (!version || !e.target.value) return;
                await upsertSourceRef({
                  version_id: version.id,
                  official_source_id: e.target.value,
                  sort_order: (satellites?.sourceRefs.length ?? 0) + 1,
                });
                reload();
              }}
            >
              <option value="">Link official source…</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            {satellites?.sourceRefs.map((r) => (
              <div key={r.id} className="flex justify-between border p-2 text-sm">
                <span>{r.anchor_label || r.official_source_id}</span>
                <Button size="sm" variant="destructive" onClick={() => deleteSourceRef(r.id).then(reload)}>Remove</Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="related" className="mt-4 space-y-2">
            <select
              className="border rounded px-2 py-1 text-sm"
              onChange={async (e) => {
                if (!version || !e.target.value) return;
                await upsertInternalLink({
                  from_version_id: version.id,
                  to_article_id: e.target.value,
                  link_type: "related",
                });
                reload();
              }}
            >
              <option value="">Link article…</option>
              {allArticles.filter((a) => a.id !== article.id).map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            {satellites?.internalLinks.map((l) => (
              <div key={l.id} className="flex justify-between border p-2 text-sm">
                <span>{l.anchor_text || l.to_article?.title || l.to_article_id}</span>
                <Button size="sm" variant="destructive" onClick={() => deleteInternalLink(l.id).then(reload)}>Remove</Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {version && <KnowledgeGuideReader article={article} version={version} showQuizAnswers />}
          </TabsContent>

          <TabsContent value="versions" className="mt-4 space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="border p-3 text-sm flex justify-between">
                <span>#{v.version_number} {v.version_label} — {v.status}</span>
                <span>{v.published_at ? new Date(v.published_at).toLocaleString() : "—"}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
