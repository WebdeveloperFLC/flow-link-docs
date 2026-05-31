import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadBrandingImage } from "../lib/calendarApi";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  kind: "profile" | "logo";
  label: string;
  aspect?: "square" | "wide";
};

const MAX_BYTES = 2 * 1024 * 1024;

export function ImageUploader({ value, onChange, kind, label, aspect = "square" }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_BYTES) return toast.error("Image must be under 2 MB");
    setUploading(true);
    try {
      const url = await uploadBrandingImage(user.id, kind, file);
      onChange(url);
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const box = aspect === "wide" ? "h-20 w-40" : "h-20 w-20";

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-3">
        <div className={`${box} rounded-md border bg-muted overflow-hidden flex items-center justify-center`}>
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="size-3.5 mr-1.5" />
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              <X className="size-3.5 mr-1.5" /> Remove
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">PNG or JPG, max 2 MB.</p>
    </div>
  );
}