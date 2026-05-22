import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Download, Save, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { usePromoStudio } from "./usePromoStudio";

interface Props {
  /** Send a generated stock image to the poster Reference Tray. */
  onUseAsReference?: (dataUrl: string, name: string) => void;
}

export function StockImagesPanel({ onUseAsReference }: Props) {
  const studio = usePromoStudio();
  const [concept, setConcept] = useState("");
  const [style, setStyle] = useState<"photoreal" | "cinematic" | "editorial" | "illustration">("photoreal");
  const [aspect, setAspect] = useState<"landscape" | "portrait" | "square" | "story">("landscape");
  const [quality, setQuality] = useState<"fast" | "premium">("fast");
  const [variations, setVariations] = useState(4);
  const [results, setResults] = useState<{ path: string; url: string }[]>([]);

  async function onGenerate() {
    if (!concept.trim()) return toast.error("Describe the image you need");
    try {
      const res = await studio.generateStockImages({ concept, style, aspect, quality, variations });
      const urls = await Promise.all(res.image_paths.map(async (p) => ({ path: p, url: await studio.getSignedUrl(p) })));
      setResults(urls);
      toast.success(`Generated ${urls.length} image(s)`);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  async function onUseRef(img: { path: string; url: string }) {
    if (!onUseAsReference) return;
    const blob = await (await fetch(img.url)).blob();
    const reader = new FileReader();
    reader.onload = () => onUseAsReference(reader.result as string, "Stock image");
    reader.readAsDataURL(blob);
    toast.success("Added to references");
  }

  async function onSaveToHub(img: { path: string }) {
    try {
      await studio.saveToHub({
        storage_path: img.path,
        title: concept.slice(0, 60) || `Stock image ${new Date().toLocaleDateString()}`,
        content_type: "poster",
        content_scope: "common",
        description: concept,
      });
      toast.success("Saved to Hub — view it in the Saved Hub tab"); window.dispatchEvent(new CustomEvent("dsh-hub-refresh"));
    } catch (e: any) {
      const msg = e?.message ?? "Save failed";
      if (/row-level security|42501|permission/i.test(msg)) {
        toast.error("You don't have Hub edit permission. Ask an admin to enable Digital Success Hub edit access.");
      } else toast.error(msg);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Search / generate stock images</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label>Describe the image</Label>
          <Input
            placeholder="e.g. Toronto skyline at golden hour, smiling Indian student with backpack on campus"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label className="text-xs">Style</Label>
            <Select value={style} onValueChange={(v: any) => setStyle(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="photoreal">Photoreal</SelectItem>
                <SelectItem value="cinematic">Cinematic</SelectItem>
                <SelectItem value="editorial">Editorial</SelectItem>
                <SelectItem value="illustration">Illustration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Aspect</Label>
            <Select value={aspect} onValueChange={(v: any) => setAspect(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">Landscape 3:2</SelectItem>
                <SelectItem value="portrait">Portrait 2:3</SelectItem>
                <SelectItem value="square">Square 1:1</SelectItem>
                <SelectItem value="story">Story 9:16</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Variations</Label>
            <Select value={String(variations)} onValueChange={(v) => setVariations(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Quality</Label>
            <Select value={quality} onValueChange={(v: any) => setQuality(v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="premium">Premium ✨</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" className="ml-auto" onClick={onGenerate} disabled={studio.loading}>
            {studio.loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
            Generate
          </Button>
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {results.map((img, i) => (
              <Card key={img.path}>
                <CardContent className="p-2 space-y-2">
                  <img src={img.url} alt={`Stock ${i + 1}`} className="w-full rounded-md border" />
                  <div className="flex flex-wrap gap-1">
                    {onUseAsReference && (
                      <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => onUseRef(img)}>
                        <ImagePlus className="size-3 mr-1" />Use
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => studio.downloadAsset(img.url, `stock-${i + 1}.png`)}>
                      <Download className="size-3 mr-1" />Save
                    </Button>
                    <Button type="button" size="sm" className="flex-1" onClick={() => onSaveToHub(img)}>
                      <Save className="size-3 mr-1" />Hub
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}