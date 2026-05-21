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
import { Sparkles, Image as ImageIcon, MessageSquareQuote, Wand2, Save, Loader2, Download, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { usePromoStudio, type PosterBrief, type CopyPack } from "./usePromoStudio";
import { useBranches, useServiceCatalogueOptions } from "../hooks/useDshMedia";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  });

  const [images, setImages] = useState<{ path: string; url: string }[]>([]);
  const [pack, setPack] = useState<CopyPack | null>(null);

  // Reference image state (shared with poster tab)
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refDataUrl, setRefDataUrl] = useState<string>("");
  const [refMode, setRefMode] = useState<"match" | "inspire" | "edit">("match");

  async function onPickRef(file: File | null) {
    if (!file) { setRefFile(null); setRefDataUrl(""); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8 MB)"); return; }
    setRefFile(file);
    const dataUrl = await studio.fileToDataUrl(file);
    setRefDataUrl(dataUrl);
  }

  const update = (p: Partial<PosterBrief>) => setBrief((b) => ({ ...b, ...p }));

  async function onGeneratePoster() {
    try {
      const payload: PosterBrief = {
        ...brief,
        reference_image_data_url: refDataUrl || undefined,
        reference_mode: refDataUrl ? refMode : undefined,
      };
      const res = await studio.generatePoster(payload);
      const urls = await Promise.all(res.image_paths.map(async (p) => ({ path: p, url: await studio.getSignedUrl(p) })));
      setImages(urls);
      toast.success(`Generated ${urls.length} variation(s)`);
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

  // Edit image
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [editedUrl, setEditedUrl] = useState<string | null>(null);
  const [editedPath, setEditedPath] = useState<string | null>(null);
  async function onEditImage() {
    if (!editFile) return toast.error("Upload a base image first");
    if (!editInstruction.trim()) return toast.error("Describe what to change");
    const reader = new FileReader();
    const dataUrl: string = await new Promise((res, rej) => {
      reader.onload = () => res(reader.result as string);
      reader.onerror = () => rej(reader.error);
      reader.readAsDataURL(editFile);
    });
    try {
      const out = await studio.editImage(dataUrl, editInstruction);
      const url = await studio.getSignedUrl(out.image_path);
      setEditedPath(out.image_path);
      setEditedUrl(url);
      toast.success("Edited");
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
          </TabsList>

          {/* Shared brief */}
          <TabsContent value="poster" className="space-y-4">
            <BriefForm brief={brief} update={update} branches={branches} serviceKeys={serviceKeys} languages={LANGS} />

            <ReferenceImageCard
              file={refFile}
              dataUrl={refDataUrl}
              mode={refMode}
              onMode={setRefMode}
              onPick={onPickRef}
            />

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-2">Presets:</span>
              {PRESETS.map((p) => (
                <Button key={p.label} size="sm" variant="outline" onClick={() => update(p.patch as any)}>{p.label}</Button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className={`grid gap-1 ${refDataUrl && refMode === "edit" ? "opacity-50 pointer-events-none" : ""}`}>
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
              <div className={`grid gap-1 ${refDataUrl && refMode === "edit" ? "opacity-50 pointer-events-none" : ""}`}>
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
              <Button className="ml-auto mt-5" onClick={onGeneratePoster} disabled={studio.loading}>
                {studio.loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
                {refDataUrl && refMode === "edit" ? "Apply edits" : "Generate poster"}
              </Button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {images.map((img, i) => (
                  <Card key={img.path}>
                    <CardContent className="p-2 space-y-2">
                      <img src={img.url} alt={`Variation ${i + 1}`} className="w-full rounded-md border" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild className="flex-1">
                          <a href={img.url} download={`flc-poster-${i + 1}.png`}><Download className="size-3 mr-1" />Download</a>
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => onSave(img.path)}>
                          <Save className="size-3 mr-1" />Save
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
                {editedUrl && (
                  <div className="space-y-2">
                    <img src={editedUrl} alt="Edited" className="max-w-md rounded-md border" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={editedUrl} download="flc-edited.png"><Download className="size-3 mr-1" />Download</a>
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
        </Tabs>
      </div>
    </AppLayout>
  );
}

function BriefForm({ brief, update, branches, serviceKeys, languages }: any) {
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

function ReferenceImageCard({
  file, dataUrl, mode, onMode, onPick,
}: {
  file: File | null;
  dataUrl: string;
  mode: "match" | "inspire" | "edit";
  onMode: (m: "match" | "inspire" | "edit") => void;
  onPick: (f: File | null) => void;
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="size-4" /> Reference image (optional)
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-[180px_1fr]">
        <div className="space-y-2">
          {dataUrl ? (
            <div className="relative">
              <img src={dataUrl} alt="Reference" className="w-full rounded-md border" />
              <Button
                size="icon" variant="secondary"
                className="absolute top-1 right-1 size-6"
                onClick={() => onPick(null)}
              ><X className="size-3" /></Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-md cursor-pointer text-xs text-muted-foreground hover:bg-muted/50">
              <Upload className="size-5 mb-1" />
              <span>Upload image</span>
              <span className="text-[10px]">PNG/JPG ≤ 8 MB</span>
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs">How should the AI use this image?</Label>
          <RadioGroup value={mode} onValueChange={(v) => onMode(v as any)} className="grid gap-2" disabled={!dataUrl}>
            <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${mode === "match" ? "border-primary bg-primary/5" : ""}`}>
              <RadioGroupItem value="match" />
              <div>
                <div className="text-sm font-medium">Match theme</div>
                <div className="text-xs text-muted-foreground">Generate a brand-new poster from the Brief, using this image only as a style / colour / typography reference.</div>
              </div>
            </label>
            <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${mode === "inspire" ? "border-primary bg-primary/5" : ""}`}>
              <RadioGroupItem value="inspire" />
              <div>
                <div className="text-sm font-medium">Inspire layout</div>
                <div className="text-xs text-muted-foreground">Keep this image's composition and colour story, but replace all text with the Brief content.</div>
              </div>
            </label>
            <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${mode === "edit" ? "border-primary bg-primary/5" : ""}`}>
              <RadioGroupItem value="edit" />
              <div>
                <div className="text-sm font-medium">Edit this image</div>
                <div className="text-xs text-muted-foreground">Modify the uploaded image directly (change dates, swap campus, restyle, translate, add logo). Uses "Extra instructions" from the Brief.</div>
              </div>
            </label>
          </RadioGroup>
          {file && <p className="text-[11px] text-muted-foreground">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
        </div>
      </CardContent>
    </Card>
  );
}