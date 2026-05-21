import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Image as ImageIcon, MessageSquareQuote, Wand2, Save, Loader2, Download, Library as LibraryIcon, History, Zap } from "lucide-react";
import { toast } from "sonner";
import { usePromoStudio, type PosterBrief, type CopyPack, type RefImage, type BrandAsset, type RecentGeneration } from "./usePromoStudio";
import { useBranches, useServiceCatalogueOptions } from "../hooks/useDshMedia";
import { ReferenceTray } from "./ReferenceTray";
import { BrandLibraryPanel } from "./BrandLibraryPanel";

const PRESETS = [
  { label: "September intake flyer", patch: { intake: "September 2026", tone: "energetic", highlights: "Applications open, fast offer letter, scholarships available" } },
  { label: "Scholarship announcement", patch: { tone: "celebratory", highlights: "Scholarship up to $4,000, on select programs, limited seats" } },
  { label: "Trade programs (Canada)", patch: { country: "Canada", service: "Study Abroad", highlights: "Mechanical, Electrical, Plumbing, Welding, HVAC. PGWP eligible." } },
  { label: "PGWP-eligible programs", patch: { country: "Canada", highlights: "PGWP eligible, no GMAT/GRE, downtown campus, fast offer letter" } },
  { label: "Bursary update", patch: { tone: "professional", highlights: "Bursary update for Indian & diversity students, updated tuition deposit" } },
];

const LANGS = ["English", "Hindi", "Punjabi", "Gujarati", "Tamil", "Telugu", "Marathi", "Bengali", "Arabic"];

export default function AiStudioPage() {
  const studio = usePromoStudio();
  const { data: branches = [] } = useBranches();
  const { data: services = [] } = useServiceCatalogueOptions();
  const serviceKeys = Array.from(new Set(services.map((s) => s.master_key)));

  const [brief, setBrief] = useState<PosterBrief>({
    institution_name: "",
    country: "",
    service: "Study Abroad",
    intake: "September 2026",
    highlights: "",
    tone: "energetic",
    language: "English",
    format: "portrait",
    variations: 2,
    custom_instructions: "",
    use_brand: true,
    quality: "standard",
  });

  const [images, setImages] = useState<{ path: string; url: string }[]>(() => {
    try {
      const raw = sessionStorage.getItem("dsh-ai-last-images");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [pack, setPack] = useState<CopyPack | null>(null);
  const [recent, setRecent] = useState<RecentGeneration[]>([]);
  const [recentUrls, setRecentUrls] = useState<Record<string, string>>({});
  const [enhancingPath, setEnhancingPath] = useState<string | null>(null);

  // Multi-reference state
  const [refs, setRefs] = useState<RefImage[]>([]);
  const [pickingKind, setPickingKind] = useState<"logo" | "institution_logo" | "reference" | null>(null);
  const [pickerResolve, setPickerResolve] = useState<((a: BrandAsset | null) => void) | null>(null);

  // Seed default Future Link logo and auto-attach when use_brand is on
  useEffect(() => {
    (async () => {
      const def = await studio.ensureDefaultLogo();
      if (def && brief.use_brand && !refs.some((r) => r.asset_id === def.id)) {
        try {
          const dataUrl = await studio.brandAssetToDataUrl(def);
          setRefs((cur) => [...cur, { data_url: dataUrl, role: "logo", source: "library", asset_id: def.id, name: def.title }]);
        } catch {}
      }
    })();
    // eslint-disable-next-line
  }, []);

  // Persist last generated batch so a refresh/navigation doesn't wipe results
  useEffect(() => {
    try { sessionStorage.setItem("dsh-ai-last-images", JSON.stringify(images)); } catch {}
  }, [images]);

  async function refreshRecent() {
    try {
      const rows = await studio.listRecentGenerations(20);
      setRecent(rows);
      // Build signed URLs for all thumbnails
      const entries = await Promise.all(
        rows.flatMap((r) => r.image_paths).map(async (p) => [p, await studio.getSignedUrl(p)] as const),
      );
      setRecentUrls(Object.fromEntries(entries));
    } catch (e: any) {
      console.warn("recent load failed", e);
    }
  }

  useEffect(() => { refreshRecent(); /* eslint-disable-next-line */ }, []);

  async function pickFromLibrary(kind: "logo" | "institution_logo" | "reference"): Promise<BrandAsset | null> {
    setPickingKind(kind);
    return new Promise<BrandAsset | null>((resolve) => {
      setPickerResolve(() => resolve);
    });
  }

  async function onLibraryPicked(asset: BrandAsset) {
    try {
      const dataUrl = await studio.brandAssetToDataUrl(asset);
      const role = pickingKind === "logo" ? "logo"
                  : pickingKind === "institution_logo" ? "institution_logo"
                  : "style";
      setRefs((cur) => [...cur, { data_url: dataUrl, role, source: "library", asset_id: asset.id, name: asset.title }]);
      toast.success(`Added "${asset.title}"`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load asset");
    } finally {
      pickerResolve?.(asset);
      setPickerResolve(null);
      setPickingKind(null);
    }
  }

  function closePicker() {
    pickerResolve?.(null);
    setPickerResolve(null);
    setPickingKind(null);
  }

  const update = (p: Partial<PosterBrief>) => setBrief((b) => ({ ...b, ...p }));

  const hasEditBase = refs.some((r) => r.role === "edit_base");

  async function onGeneratePoster() {
    try {
      const payload: PosterBrief = { ...brief, references: refs };
      const res = await studio.generatePoster(payload);
      const urls = await Promise.all(res.image_paths.map(async (p) => ({ path: p, url: await studio.getSignedUrl(p) })));
      setImages(urls);
      toast.success(`Generated ${urls.length} variation(s)`);
      refreshRecent();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  async function onGenerateCopy() {
    try {
      const { pack } = await studio.generateCopy(brief);
      setPack(pack);
      toast.success("Copy pack ready");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  async function onSave(path: string) {
    try {
      await studio.saveToHub({
        storage_path: path,
        title: brief.institution_name ? `${brief.institution_name} — ${brief.intake}` : `AI Poster ${new Date().toLocaleDateString()}`,
        content_type: "poster",
        content_scope: brief.institution_name ? "institution" : brief.country ? "country" : "common",
        country: brief.country,
        campaign: brief.intake,
        description: brief.highlights,
      });
      toast.success("Saved to Hub");
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  }

  async function onDownload(url: string, filename: string) {
    try { await studio.downloadAsset(url, filename); }
    catch (e: any) { toast.error(e?.message ?? "Download failed"); }
  }

  async function onEnhance(img: { path: string; url: string }, index: number) {
    setEnhancingPath(img.path);
    try {
      const out = await studio.enhanceStored(img.path);
      const newUrl = await studio.getSignedUrl(out.image_path);
      setImages((prev) => prev.map((p, i) => i === index ? { path: out.image_path, url: newUrl } : p));
      toast.success("Enhanced");
      refreshRecent();
    } catch (e: any) { toast.error(e?.message ?? "Enhance failed"); }
    finally { setEnhancingPath(null); }
  }

  // Edit image
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [editedUrl, setEditedUrl] = useState<string | null>(null);
  const [editedPath, setEditedPath] = useState<string | null>(null);
  const [editQuality, setEditQuality] = useState<"standard" | "premium">("standard");
  async function onEditImage() {
    if (!editFile) return toast.error("Upload a base image first");
    if (!editInstruction.trim()) return toast.error("Describe what to change");
    const dataUrl = await studio.fileToDataUrl(editFile);
    try {
      const model = editQuality === "premium" ? "google/gemini-3-pro-image-preview" : "google/gemini-3.1-flash-image-preview";
      const out = await studio.editImage(dataUrl, editInstruction, model);
      const url = await studio.getSignedUrl(out.image_path);
      setEditedPath(out.image_path);
      setEditedUrl(url);
      toast.success("Edited");
      refreshRecent();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="AI Promo Studio"
          description="Generate brand-aligned posters, captions, reels scripts, and email/WhatsApp copy in seconds. Save straight to the Digital Success Hub."
        />

        <Tabs defaultValue="poster">
          <TabsList>
            <TabsTrigger value="poster"><ImageIcon className="size-4 mr-2" />Generate poster</TabsTrigger>
            <TabsTrigger value="copy"><MessageSquareQuote className="size-4 mr-2" />Generate copy</TabsTrigger>
            <TabsTrigger value="edit"><Wand2 className="size-4 mr-2" />Edit image</TabsTrigger>
            <TabsTrigger value="library"><LibraryIcon className="size-4 mr-2" />Brand Library</TabsTrigger>
          </TabsList>

          {/* Shared brief */}
          <TabsContent value="poster" className="space-y-4">
            <BriefForm brief={brief} update={update} branches={branches} serviceKeys={serviceKeys} languages={LANGS} />

            <ReferenceTray
              refs={refs}
              setRefs={setRefs}
              onPickFromLibrary={pickFromLibrary}
              fileToDataUrl={studio.fileToDataUrl}
            />

            {pickingKind && (
              <BrandLibraryPanel pickingKind={pickingKind} onPick={onLibraryPicked} onClosePick={closePicker} />
            )}

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-2">Presets:</span>
              {PRESETS.map((p) => (
                <Button key={p.label} size="sm" variant="outline" onClick={() => update(p.patch as any)}>{p.label}</Button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className={`grid gap-1 ${hasEditBase ? "opacity-50 pointer-events-none" : ""}`}>
                <Label className="text-xs">Format</Label>
                <Select value={brief.format} onValueChange={(v: any) => update({ format: v })}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait 2:3 (poster)</SelectItem>
                    <SelectItem value="square">Square 1:1 (Instagram)</SelectItem>
                    <SelectItem value="story">Story 9:16 (reel/story)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={`grid gap-1 ${hasEditBase ? "opacity-50 pointer-events-none" : ""}`}>
                <Label className="text-xs">Variations</Label>
                <Select value={String(brief.variations)} onValueChange={(v) => update({ variations: Number(v) })}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <Switch checked={brief.use_brand} onCheckedChange={(v) => update({ use_brand: v })} />
                <Label className="text-sm">Apply Future Link branding</Label>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Quality</Label>
                <Select value={brief.quality ?? "standard"} onValueChange={(v: any) => update({ quality: v })}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (fast)</SelectItem>
                    <SelectItem value="premium">Premium ✨</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="ml-auto mt-5" onClick={onGeneratePoster} disabled={studio.loading}>
                {studio.loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
                {hasEditBase ? "Apply edits" : "Generate poster"}
              </Button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {images.map((img, i) => (
                  <Card key={img.path}>
                    <CardContent className="p-2 space-y-2">
                      <img src={img.url} alt={`Variation ${i + 1}`} className="w-full rounded-md border" />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="flex-1 min-w-[88px]" onClick={() => onDownload(img.url, `flc-poster-${i + 1}.png`)}>
                          <Download className="size-3 mr-1" />Download
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 min-w-[88px]" onClick={() => onEnhance(img, i)} disabled={enhancingPath === img.path}>
                          {enhancingPath === img.path ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Zap className="size-3 mr-1" />}
                          Enhance
                        </Button>
                        <Button size="sm" className="flex-1 min-w-[88px]" onClick={() => onSave(img.path)}>
                          <Save className="size-3 mr-1" />Save
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <RecentGenerationsPanel
              rows={recent}
              urls={recentUrls}
              onDownload={onDownload}
              onSave={onSave}
              onRefresh={refreshRecent}
            />
          </TabsContent>

          <TabsContent value="copy" className="space-y-4">
            <BriefForm brief={brief} update={update} branches={branches} serviceKeys={serviceKeys} languages={LANGS} />
            <Button onClick={onGenerateCopy} disabled={studio.loading}>
              {studio.loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
              Generate copy pack
            </Button>
            {pack && <CopyPackView pack={pack} />}
          </TabsContent>

          <TabsContent value="edit" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Edit / restyle existing image</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  <Label>Base image</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
                </div>
                <div className="grid gap-2">
                  <Label>What should the AI change?</Label>
                  <Textarea
                    rows={3}
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    placeholder="e.g. Change intake date to September 2026, add University of Wales logo top-right, translate Hindi headline to English."
                  />
                </div>
                <Button onClick={onEditImage} disabled={studio.loading}>
                  {studio.loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Wand2 className="size-4 mr-2" />}
                  Edit image
                </Button>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Quality</Label>
                  <Select value={editQuality} onValueChange={(v: any) => setEditQuality(v)}>
                    <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (fast)</SelectItem>
                      <SelectItem value="premium">Premium ✨</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editedUrl && (
                  <div className="space-y-2">
                    <img src={editedUrl} alt="Edited" className="max-w-md rounded-md border" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onDownload(editedUrl, "flc-edited.png")}>
                        <Download className="size-3 mr-1" />Download
                      </Button>
                      {editedPath && (
                        <Button size="sm" onClick={() => onSave(editedPath)}>
                          <Save className="size-3 mr-1" />Save to Hub
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <BrandLibraryPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function BriefForm({ brief, update, branches, serviceKeys, languages }: any) {
  return _BriefFormImpl({ brief, update, branches, serviceKeys, languages });
}

function RecentGenerationsPanel({ rows, urls, onDownload, onSave, onRefresh }: {
  rows: RecentGeneration[];
  urls: Record<string, string>;
  onDownload: (url: string, filename: string) => void;
  onSave: (path: string) => void;
  onRefresh: () => void;
}) {
  if (!rows.length) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><History className="size-4" /> Recent generations</CardTitle>
        <Button size="sm" variant="ghost" onClick={onRefresh}>Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r) => (
          <div key={r.id} className="border-t pt-3 first:border-t-0 first:pt-0">
            <div className="text-xs text-muted-foreground mb-2 flex flex-wrap gap-2">
              <span>{new Date(r.created_at).toLocaleString()}</span>
              <span>· {r.kind}</span>
              {r.model && <span>· {r.model.split("/").pop()}</span>}
              {r.brief?.institution_name && <span>· {r.brief.institution_name}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {r.image_paths.map((p, i) => (
                <div key={p} className="space-y-1">
                  {urls[p] ? (
                    <img src={urls[p]} alt={`gen-${i}`} className="w-full rounded border" />
                  ) : (
                    <div className="aspect-square bg-muted rounded animate-pulse" />
                  )}
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs px-2" disabled={!urls[p]} onClick={() => onDownload(urls[p], `flc-${r.id.slice(0,6)}-${i + 1}.png`)}>
                      <Download className="size-3" />
                    </Button>
                    <Button size="sm" className="flex-1 h-7 text-xs px-2" onClick={() => onSave(p)}>
                      <Save className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function _BriefFormImpl({ brief, update, branches, serviceKeys, languages }: any) {
  return (
    <Card>
      <CardHeader><CardTitle>Brief</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>Institution</Label>
            <Input value={brief.institution_name} onChange={(e) => update({ institution_name: e.target.value })} placeholder="e.g. University of Wales Trinity Saint David" />
          </div>
          <div className="grid gap-1">
            <Label>Country</Label>
            <Input value={brief.country} onChange={(e) => update({ country: e.target.value })} placeholder="e.g. United Kingdom" />
          </div>
          <div className="grid gap-1">
            <Label>Service</Label>
            <Select value={brief.service} onValueChange={(v) => update({ service: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Study Abroad">Study Abroad</SelectItem>
                <SelectItem value="Immigration">Immigration</SelectItem>
                <SelectItem value="Visit Visa">Visit Visa</SelectItem>
                <SelectItem value="PR">PR</SelectItem>
                {serviceKeys.map((k: string) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Intake</Label>
            <Input value={brief.intake} onChange={(e) => update({ intake: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label>Tone</Label>
            <Select value={brief.tone} onValueChange={(v) => update({ tone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["energetic", "professional", "celebratory", "urgent", "friendly", "aspirational"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Language</Label>
            <Select value={brief.language} onValueChange={(v) => update({ language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {languages.map((l: string) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1">
          <Label>Key highlights / selling points</Label>
          <Textarea rows={3} value={brief.highlights} onChange={(e) => update({ highlights: e.target.value })}
            placeholder="e.g. MOI accepted, IELTS waiver, PGWP-eligible, scholarship up to CAD $4,000, downtown Toronto campus, fast offer letter" />
        </div>
        <div className="grid gap-1">
          <Label>Extra instructions (optional)</Label>
          <Textarea rows={2} value={brief.custom_instructions} onChange={(e) => update({ custom_instructions: e.target.value })}
            placeholder="Anything specific about layout, colors, campus photos, deadlines, contact info to include…" />
        </div>
      </CardContent>
    </Card>
  );
}

function CopyPackView({ pack }: { pack: CopyPack }) {
  const blocks: { key: keyof CopyPack; label: string }[] = [
    { key: "instagram_caption", label: "Instagram caption" },
    { key: "whatsapp_broadcast", label: "WhatsApp broadcast" },
    { key: "facebook_post", label: "Facebook post" },
    { key: "linkedin_post", label: "LinkedIn post" },
    { key: "email_subject", label: "Email subject" },
    { key: "email_body", label: "Email body" },
    { key: "sms", label: "SMS" },
    { key: "reel_script", label: "Reel script" },
    { key: "counselor_talking_points", label: "Counselor talking points" },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {blocks.map((b) => pack[b.key] ? (
        <Card key={b.key}>
          <CardHeader className="py-3"><CardTitle className="text-sm flex items-center justify-between">
            {b.label}
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(pack[b.key] || ""); toast.success("Copied"); }}>Copy</Button>
          </CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{pack[b.key]}</CardContent>
        </Card>
      ) : null)}
    </div>
  );
}
