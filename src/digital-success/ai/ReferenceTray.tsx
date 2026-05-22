import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Library, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import type { RefImage, RefRole, BrandAsset } from "./usePromoStudio";

const MAX_REFS = 4;

const ROLE_LABEL: Record<RefRole, string> = {
  style: "Style (match palette / typography)",
  layout: "Layout (mirror composition)",
  blueprint: "Blueprint (mirror layout + keep institution name/logo/imagery)",
  subject: "Subject (use this person / landmark)",
  logo: "Future Link logo (top-left, verbatim)",
  institution_logo: "Institution logo (top-right, verbatim)",
  edit_base: "Edit this image directly",
};

export function ReferenceTray({
  refs, setRefs, onPickFromLibrary, fileToDataUrl,
}: {
  refs: RefImage[];
  setRefs: (r: RefImage[]) => void;
  onPickFromLibrary: (kind: "logo" | "institution_logo" | "reference") => Promise<BrandAsset | null>;
  fileToDataUrl: (f: File) => Promise<string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_REFS - refs.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast.warning(`Only ${room} more reference image(s) allowed (max ${MAX_REFS}).`);
    const next: RefImage[] = [];
    for (const f of list) {
      if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name} too large (max 8MB)`); continue; }
      const dataUrl = await fileToDataUrl(f);
      next.push({ data_url: dataUrl, role: "style", source: "upload", name: f.name });
    }
    setRefs([...refs, ...next]);
  }

  async function pickFromLibrary(kind: "logo" | "institution_logo" | "reference") {
    const asset = await onPickFromLibrary(kind);
    if (!asset) return;
    if (refs.length >= MAX_REFS) return toast.error(`Max ${MAX_REFS} references`);
    const role: RefRole = kind === "logo" ? "logo" : kind === "institution_logo" ? "institution_logo" : "style";
    // Convert via signed url -> dataURL upstream; here we just store asset_id + placeholder. The caller will resolve.
    setRefs([...refs, { data_url: "", role, source: "library", asset_id: asset.id, name: asset.title }]);
  }

  function update(i: number, patch: Partial<RefImage>) {
    setRefs(refs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function remove(i: number) {
    setRefs(refs.filter((_, idx) => idx !== i));
  }

  const hasEditBase = refs.some((r) => r.role === "edit_base");

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><ImageIcon className="size-4" /> Reference images (up to {MAX_REFS})</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => pickFromLibrary("reference")}>
              <Library className="size-3 mr-1" />From library
            </Button>
            <Button size="sm" variant="outline" onClick={() => pickFromLibrary("logo")}>
              <Library className="size-3 mr-1" />FLC logo
            </Button>
            <Button size="sm" variant="outline" onClick={() => pickFromLibrary("institution_logo")}>
              <Library className="size-3 mr-1" />Institution logo
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={refs.length >= MAX_REFS}>
              <Upload className="size-3 mr-1" />Upload
            </Button>
            <input
              ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { addFiles(e.target.files); if (fileRef.current) fileRef.current.value = ""; }}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {refs.length === 0 && (
          <div className="text-xs text-muted-foreground border border-dashed rounded-md p-6 text-center">
            Drop up to {MAX_REFS} reference images here, pick from your Brand Library, or attach a logo to place verbatim.
          </div>
        )}
        {refs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {refs.map((r, i) => (
              <div key={i} className="border rounded-md p-2 space-y-2">
                <div className="relative">
                  {r.data_url ? (
                    <img src={r.data_url} alt={r.name || `ref-${i}`} className="w-full h-28 object-cover rounded" />
                  ) : (
                    <div className="w-full h-28 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      {r.name || "Library asset"}
                    </div>
                  )}
                  <Button size="icon" variant="secondary" className="absolute top-1 right-1 size-6" onClick={() => remove(i)}>
                    <X className="size-3" />
                  </Button>
                </div>
                <Select value={r.role} onValueChange={(v) => update(i, { role: v as RefRole })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as RefRole[]).map((k) => (
                      <SelectItem
                        key={k} value={k}
                        disabled={k === "edit_base" && hasEditBase && r.role !== "edit_base"}
                      >{ROLE_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {r.name && <p className="text-[10px] text-muted-foreground truncate">{r.name}</p>}
              </div>
            ))}
          </div>
        )}
        {hasEditBase && (
          <p className="text-[11px] text-amber-600">
            "Edit this image directly" is selected — the AI will modify that image instead of generating a new poster. Other references are passed as style/logo guidance.
          </p>
        )}
      </CardContent>
    </Card>
  );
}