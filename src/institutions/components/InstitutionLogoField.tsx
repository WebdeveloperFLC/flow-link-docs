import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2, Link2 } from "lucide-react";
import { InstitutionLogo } from "./InstitutionLogo";
import {
  removeInstitutionLogo,
  setInstitutionLogoUrl,
  uploadInstitutionLogo,
} from "../lib/institutionLogo";

export function InstitutionLogoField({
  institutionId,
  institutionName,
  logoUrl,
  canEdit,
  onUpdated,
}: {
  institutionId: string;
  institutionName: string;
  logoUrl: string | null;
  canEdit: boolean;
  onUpdated: (logoUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  const onFile = async (file: File) => {
    if (!canEdit) return;
    const ok = /^image\/(png|jpeg|jpg|webp|svg\+xml|gif)$/i.test(file.type)
      || /\.(png|jpe?g|webp|svg|gif)$/i.test(file.name);
    if (!ok) return toast.error("Upload a PNG, JPG, WebP, SVG, or GIF image");
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2MB");
    setBusy(true);
    try {
      const url = await uploadInstitutionLogo(institutionId, file);
      onUpdated(url);
      toast.success("Logo uploaded — visible in Course Review and Course Finder");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async () => {
    if (!canEdit || !logoUrl) return;
    if (!window.confirm("Remove this institution logo?")) return;
    setBusy(true);
    try {
      await removeInstitutionLogo(institutionId);
      onUpdated(null);
      toast.success("Logo removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  const onSaveUrl = async () => {
    if (!canEdit) return;
    setBusy(true);
    try {
      await setInstitutionLogoUrl(institutionId, urlDraft);
      onUpdated(urlDraft.trim());
      setUrlDraft("");
      setShowUrl(false);
      toast.success("Logo URL saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
      <Label className="text-xs text-muted-foreground">Institution logo</Label>
      <div className="flex items-start gap-4">
        <InstitutionLogo url={logoUrl} name={institutionName} size="lg" />
        <div className="flex-1 space-y-2 min-w-0">
          <p className="text-xs text-muted-foreground">
            Shown on Course Review, institution pages, and Course Finder after publish.
          </p>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {busy ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ImagePlus className="size-4 mr-1" />}
                Upload logo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setShowUrl((v) => !v)}
              >
                <Link2 className="size-4 mr-1" /> Paste URL
              </Button>
              {logoUrl && (
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
                  <Trash2 className="size-4 mr-1 text-destructive" /> Remove
                </Button>
              )}
            </div>
          )}
          {showUrl && canEdit && (
            <div className="flex gap-2">
              <Input
                placeholder="https://…/logo.png"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
              />
              <Button size="sm" disabled={busy || !urlDraft.trim()} onClick={onSaveUrl}>
                Save
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
