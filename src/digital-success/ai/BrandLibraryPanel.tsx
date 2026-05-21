import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Trash2, Star, StarOff, Loader2, Image as ImageIcon, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { usePromoStudio, type BrandAsset } from "./usePromoStudio";

export function BrandLibraryPanel({
  onPick,
  pickingKind,
  onClosePick,
}: {
  onPick?: (asset: BrandAsset) => void;
  pickingKind?: "logo" | "institution_logo" | "reference" | null;
  onClosePick?: () => void;
}) {
  const studio = usePromoStudio();
  const [logos, setLogos] = useState<BrandAsset[]>([]);
  const [refs, setRefs] = useState<BrandAsset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      await studio.ensureDefaultLogo();
      const [l, r] = await Promise.all([studio.listBrandAssets("logo"), studio.listBrandAssets("reference")]);
      setLogos(l); setRefs(r);
      const all = [...l, ...r];
      const next: Record<string, string> = {};
      await Promise.all(all.map(async (a) => {
        try { next[a.id] = await studio.getSignedUrl(a.storage_path); } catch {}
      }));
      setUrls(next);
    } finally { setBusy(false); }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function onUpload(file: File, kind: "logo" | "reference", title: string) {
    try {
      await studio.uploadBrandAsset({ file, kind, title: title || file.name });
      toast.success("Saved to library");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
  }

  async function onDelete(a: BrandAsset) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try { await studio.deleteBrandAsset(a); toast.success("Deleted"); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  }

  async function onSetDefault(a: BrandAsset) {
    try { await studio.setDefaultLogo(a.id); toast.success("Default logo updated"); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="size-4" /> Brand Library
          {busy && <Loader2 className="size-3 animate-spin" />}
          {pickingKind && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              Picking {pickingKind}… <Button size="sm" variant="ghost" onClick={onClosePick}>Cancel</Button>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={pickingKind === "logo" || pickingKind === "institution_logo" ? "logos" : "refs"}>
          <TabsList>
            <TabsTrigger value="logos">Logos ({logos.length})</TabsTrigger>
            <TabsTrigger value="refs">References ({refs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="logos" className="space-y-3">
            <UploadRow kind="logo" onUpload={onUpload} />
            <AssetGrid
              assets={logos} urls={urls}
              onDelete={onDelete}
              onSetDefault={onSetDefault}
              onPick={(pickingKind === "logo" || pickingKind === "institution_logo") ? onPick : undefined}
              showDefaultBadge
            />
          </TabsContent>

          <TabsContent value="refs" className="space-y-3">
            <UploadRow kind="reference" onUpload={onUpload} />
            <AssetGrid
              assets={refs} urls={urls}
              onDelete={onDelete}
              onPick={pickingKind === "reference" ? onPick : undefined}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function UploadRow({ kind, onUpload }: { kind: "logo" | "reference"; onUpload: (f: File, k: "logo"|"reference", t: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2 border rounded-md p-3 bg-muted/30">
      <div className="grid gap-1">
        <Label className="text-xs">Title</Label>
        <Input className="w-56" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "logo" ? "e.g. Lambton College" : "e.g. Canada poster v1"} />
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">File (PNG/JPG)</Label>
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <Button disabled={!file} onClick={() => { if (file) { onUpload(file, kind, title); setFile(null); setTitle(""); } }}>
        <Upload className="size-4 mr-2" />Save to library
      </Button>
    </div>
  );
}

function AssetGrid({
  assets, urls, onDelete, onSetDefault, onPick, showDefaultBadge,
}: {
  assets: BrandAsset[];
  urls: Record<string, string>;
  onDelete: (a: BrandAsset) => void;
  onSetDefault?: (a: BrandAsset) => void;
  onPick?: (a: BrandAsset) => void;
  showDefaultBadge?: boolean;
}) {
  if (!assets.length) return <p className="text-xs text-muted-foreground">No assets yet.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {assets.map((a) => (
        <div key={a.id} className="border rounded-md p-2 space-y-2">
          <div className="aspect-square bg-muted rounded overflow-hidden flex items-center justify-center">
            {urls[a.id] ? <img src={urls[a.id]} alt={a.title} className="max-w-full max-h-full object-contain" /> : null}
          </div>
          <div className="text-xs font-medium truncate">{a.title}</div>
          {showDefaultBadge && a.is_default_brand && (
            <div className="text-[10px] inline-flex items-center gap-1 text-primary"><BadgeCheck className="size-3" />Default Future Link logo</div>
          )}
          <div className="flex gap-1">
            {onPick && <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onPick(a)}>Use</Button>}
            {onSetDefault && !a.is_default_brand && (
              <Button size="sm" variant="outline" className="h-7 px-2" title="Set as default" onClick={() => onSetDefault(a)}>
                <StarOff className="size-3" />
              </Button>
            )}
            {onSetDefault && a.is_default_brand && (
              <Button size="sm" variant="outline" className="h-7 px-2" title="Default" disabled>
                <Star className="size-3 fill-current" />
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={() => onDelete(a)}>
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}