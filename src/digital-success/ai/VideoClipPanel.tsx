import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Film, Save, Download, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { usePromoStudio } from "./usePromoStudio";
import { supabase } from "@/integrations/supabase/client";

type Aspect = "9:16" | "16:9" | "1:1";

const SIZE: Record<Aspect, { w: number; h: number }> = {
  "9:16": { w: 720, h: 1280 },
  "16:9": { w: 1280, h: 720 },
  "1:1": { w: 1080, h: 1080 },
};

export function VideoClipPanel() {
  const studio = usePromoStudio();
  const [mode, setMode] = useState<"ai" | "kenburns">("ai");
  // AI mode state
  const [aiConcept, setAiConcept] = useState("");
  const [aiStyle, setAiStyle] = useState<"cinematic" | "documentary" | "festive" | "editorial">("festive");
  const [aiAspect, setAiAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiVideoUrl, setAiVideoUrl] = useState<string | null>(null);
  const [aiVideoPath, setAiVideoPath] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<"google-veo-3-fast" | "pollinations" | null>(null);

  // Ken Burns mode state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [concept, setConcept] = useState("");
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [duration, setDuration] = useState(6);
  const [rendering, setRendering] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  async function onGenerateAi() {
    if (!aiConcept.trim()) return toast.error("Describe the clip first");
    setAiGenerating(true);
    setAiVideoUrl(null);
    setAiVideoPath(null);
    setAiProvider(null);
    try {
      const res = await studio.generateVideoFromConcept({
        concept: aiConcept,
        style: aiStyle,
        aspect: aiAspect,
        duration: 5,
      });
      const { data: signed } = await supabase.storage.from("dsh-media").createSignedUrl(res.path, 60 * 60);
      setAiVideoUrl(signed?.signedUrl ?? null);
      setAiVideoPath(res.path);
      setAiProvider(res.provider ?? null);
      if (res.provider === "pollinations") {
        toast.warning("Generated with backup provider (Pollinations) — quality is lower. Google Veo quota may be exhausted.");
      } else {
        toast.success("Video generated with Google Veo 3 Fast");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally { setAiGenerating(false); }
  }

  async function onSaveAiToHub() {
    if (!aiVideoPath) return;
    try {
      await studio.saveToHub({
        storage_path: aiVideoPath,
        title: aiConcept.slice(0, 60) || `AI clip ${new Date().toLocaleDateString()}`,
        content_type: "reel",
        content_scope: "common",
        description: aiConcept,
      });
      toast.success("Saved to Hub");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (e?.code === "42501" || /row-level security|permission/i.test(msg)) {
        toast.error("You don't have permission to save to the Hub. Ask an admin to grant Digital Success edit access.");
      } else { toast.error(msg || "Save failed"); }
    }
  }

  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
      img.src = url;
    });
  }

  async function onRender() {
    if (!imageFile) return toast.error("Pick a base image");
    const { w, h } = SIZE[aspect];
    const fps = 30;
    const totalFrames = duration * fps;

    setRendering(true);
    setVideoUrl(null);
    setVideoPath(null);
    try {
      const img = await loadImage(imageFile);
      const canvas = canvasRef.current!;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(fps);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const stopped: Promise<Blob> = new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });
      recorder.start();

      // Cover-fit the image, then ease zoom + pan (Ken Burns)
      const baseScale = Math.max(w / img.width, h / img.height);
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / (duration * 1000));
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const scale = baseScale * (1 + 0.15 * ease);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        // Slow drift from upper-left bias to centered
        const dx = (w - drawW) * (0.4 + 0.1 * ease);
        const dy = (h - drawH) * (0.4 + 0.1 * ease);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Gradient overlay bottom for legibility
        if (headline || subline) {
          const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(1, "rgba(0,0,0,0.75)");
          ctx.fillStyle = g;
          ctx.fillRect(0, h * 0.55, w, h * 0.45);

          // Fade-in text after first 0.4s
          const textAlpha = Math.min(1, Math.max(0, (t - 0.05) / 0.25));
          ctx.globalAlpha = textAlpha;
          ctx.fillStyle = "#fff";
          ctx.textAlign = "left";
          const pad = Math.round(w * 0.06);
          if (headline) {
            const fs = Math.round(w * (aspect === "9:16" ? 0.085 : 0.06));
            ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`;
            ctx.fillText(headline, pad, h - (subline ? Math.round(w * 0.13) : Math.round(w * 0.07)));
          }
          if (subline) {
            const fs = Math.round(w * (aspect === "9:16" ? 0.045 : 0.032));
            ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = "#FFC72C";
            ctx.fillText(subline, pad, h - Math.round(w * 0.06));
          }
          ctx.globalAlpha = 1;
        }

        if (t < 1) requestAnimationFrame(tick);
        else recorder.stop();
      };
      requestAnimationFrame(tick);

      const blob = await stopped;
      // Safety cap on frame count
      void totalFrames;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);

      const up = await studio.uploadVideoClip({
        blob,
        brief: { concept, headline, subline, aspect, duration },
      });
      setVideoPath(up.path);
      toast.success("Video rendered");
    } catch (e: any) {
      toast.error(e?.message ?? "Render failed");
    } finally {
      setRendering(false);
    }
  }

  async function onSaveToHub() {
    if (!videoPath) return;
    try {
      await studio.saveToHub({
        storage_path: videoPath,
        title: headline || concept.slice(0, 60) || `Reel ${new Date().toLocaleDateString()}`,
        content_type: "reel",
        content_scope: "common",
        description: concept,
      });
      toast.success("Saved to Hub");
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Concept → video clip</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList>
            <TabsTrigger value="ai"><Sparkles className="size-3.5 mr-1.5" />Generate from concept (AI)</TabsTrigger>
            <TabsTrigger value="kenburns"><Film className="size-3.5 mr-1.5" />Animate an image (Ken Burns)</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">
              Describe the scene. We'll generate a real 5-second video clip with people and motion — no reference image needed.
            </p>
            <div className="grid gap-2">
              <Label>Concept</Label>
              <Textarea
                rows={3}
                value={aiConcept}
                onChange={(e) => setAiConcept(e.target.value)}
                placeholder="Indian family laughing together and celebrating Christmas in Canada. Parents, children, and grandchildren altogether around a decorated tree."
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Style</Label>
                <Select value={aiStyle} onValueChange={(v: any) => setAiStyle(v)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="festive">Warm & festive</SelectItem>
                    <SelectItem value="cinematic">Cinematic</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="editorial">Editorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Aspect</Label>
                <Select value={aiAspect} onValueChange={(v: any) => setAiAspect(v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">Landscape 16:9</SelectItem>
                    <SelectItem value="9:16">Story 9:16</SelectItem>
                    <SelectItem value="1:1">Square 1:1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" className="ml-auto" onClick={onGenerateAi} disabled={aiGenerating}>
                {aiGenerating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
                {aiGenerating ? "Generating (30–90s)…" : "Generate clip"}
              </Button>
            </div>
            {aiGenerating && (
              <p className="text-xs text-muted-foreground">Rendering with AI video model. This typically takes 30–90 seconds — keep this tab open.</p>
            )}
            {aiVideoUrl && (
              <div className="space-y-2">
                <video src={aiVideoUrl} controls className="w-full rounded-md border max-h-[480px] bg-black" />
                {aiProvider && (
                  <p className="text-xs text-muted-foreground">
                    {aiProvider === "google-veo-3-fast"
                      ? "Generated with Google Veo 3 Fast"
                      : "Generated with Pollinations (backup — lower quality)"}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => studio.downloadAsset(aiVideoUrl, "flc-ai-clip.mp4")}>
                    <Download className="size-4 mr-2" />Download
                  </Button>
                  <Button type="button" onClick={onSaveAiToHub} disabled={!aiVideoPath}>
                    <Save className="size-4 mr-2" />Save to Hub
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="kenburns" className="space-y-3 pt-3">
        <p className="text-sm text-muted-foreground">
          Pick a base image (a generated poster, brand photo, or upload) and add a headline. We render a short cinematic
          Ken-Burns clip with subtle zoom and text reveal, ready to share to WhatsApp/Reels.
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Base image</Label>
            <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="grid gap-2">
            <Label>Concept (notes)</Label>
            <Textarea rows={2} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="What's the message?" />
          </div>
          <div className="grid gap-2">
            <Label>Headline (on-clip)</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="September intake open" />
          </div>
          <div className="grid gap-2">
            <Label>Subline</Label>
            <Input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder="Scholarships up to $4,000" />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label className="text-xs">Aspect</Label>
            <Select value={aspect} onValueChange={(v: any) => setAspect(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="9:16">Story 9:16</SelectItem>
                <SelectItem value="1:1">Square 1:1</SelectItem>
                <SelectItem value="16:9">Landscape 16:9</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Duration</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[4, 6, 8, 10, 12].map((n) => <SelectItem key={n} value={String(n)}>{n}s</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" className="ml-auto" onClick={onRender} disabled={rendering || studio.loading}>
            {rendering ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Film className="size-4 mr-2" />}
            Render clip
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {videoUrl && (
          <div className="space-y-2">
            <video src={videoUrl} controls className="w-full rounded-md border max-h-[480px] bg-black" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => studio.downloadAsset(videoUrl, "flc-clip.webm")}>
                <Download className="size-4 mr-2" />Download
              </Button>
              <Button type="button" onClick={onSaveToHub} disabled={!videoPath}>
                <Save className="size-4 mr-2" />Save to Hub
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Rendered as .webm (browser-native). For .mp4 conversion, download and convert with any tool, or share directly — WhatsApp and most social apps accept .webm.
            </p>
          </div>
        )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}