import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FirmProfile {
  id?: string;
  firm_name: string | null;
  firm_address: string | null;
  firm_phone: string | null;
  firm_email: string | null;
  firm_website: string | null;
  rcic_name: string | null;
  rcic_number: string | null;
  rcic_jurisdiction: string | null;
  logo_path: string | null;
  signature_path: string | null;
}

const blank: FirmProfile = {
  firm_name: "", firm_address: "", firm_phone: "", firm_email: "", firm_website: "",
  rcic_name: "", rcic_number: "", rcic_jurisdiction: "", logo_path: null, signature_path: null,
};

export const FirmProfileCard = () => {
  const [p, setP] = useState<FirmProfile>(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "signature" | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [sigUrl, setSigUrl] = useState<string | null>(null);

  const refreshUrls = async (logo: string | null, sig: string | null) => {
    if (logo) { const { data } = await supabase.storage.from("branding").createSignedUrl(logo, 3600); setLogoUrl(data?.signedUrl ?? null); } else setLogoUrl(null);
    if (sig) { const { data } = await supabase.storage.from("branding").createSignedUrl(sig, 3600); setSigUrl(data?.signedUrl ?? null); } else setSigUrl(null);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("firm_profile").select("*").limit(1).maybeSingle();
      if (data) {
        setP(data as unknown as FirmProfile);
        await refreshUrls((data as any).logo_path ?? null, (data as any).signature_path ?? null);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (p.id) {
        const { error } = await supabase.from("firm_profile").update(p as never).eq("id", p.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("firm_profile").insert(p as never).select("id").single();
        if (error) throw error;
        setP((s) => ({ ...s, id: data!.id as string }));
      }
      toast.success("Firm profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  const upload = async (kind: "logo" | "signature", file: File) => {
    setUploading(kind);
    try {
      const path = `${kind}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const next = { ...p, [kind === "logo" ? "logo_path" : "signature_path"]: path };
      setP(next);
      // persist immediately
      if (p.id) await supabase.from("firm_profile").update({ [kind === "logo" ? "logo_path" : "signature_path"]: path } as never).eq("id", p.id);
      else {
        const { data } = await supabase.from("firm_profile").insert(next as never).select("id").single();
        if (data) setP((s) => ({ ...s, id: data.id as string }));
      }
      await refreshUrls(next.logo_path, next.signature_path);
      toast.success(`${kind} updated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(null); }
  };

  return (
    <Card className="p-5 shadow-elev-sm space-y-4">
      <div>
        <div className="font-semibold flex items-center gap-2"><Building2 className="size-4 text-primary" />Firm & RCIC profile</div>
        <div className="text-xs text-muted-foreground">Used in generated RCIC letters and as letterhead branding.</div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Firm name" v={p.firm_name} on={(v) => setP({ ...p, firm_name: v })} />
        <Field label="Website" v={p.firm_website} on={(v) => setP({ ...p, firm_website: v })} />
        <Field label="Email" v={p.firm_email} on={(v) => setP({ ...p, firm_email: v })} />
        <Field label="Phone" v={p.firm_phone} on={(v) => setP({ ...p, firm_phone: v })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Address</Label>
        <Textarea value={p.firm_address ?? ""} onChange={(e) => setP({ ...p, firm_address: e.target.value })} rows={2} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="RCIC name" v={p.rcic_name} on={(v) => setP({ ...p, rcic_name: v })} />
        <Field label="RCIC number" v={p.rcic_number} on={(v) => setP({ ...p, rcic_number: v })} />
        <Field label="Jurisdiction" v={p.rcic_jurisdiction} on={(v) => setP({ ...p, rcic_jurisdiction: v })} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <AssetSlot label="Logo" url={logoUrl} uploading={uploading === "logo"} onPick={(f) => upload("logo", f)} />
        <AssetSlot label="Signature image" url={sigUrl} uploading={uploading === "signature"} onPick={(f) => upload("signature", f)} />
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}Save</Button>
      </div>
    </Card>
  );
};

const Field = ({ label, v, on }: { label: string; v: string | null; on: (v: string) => void }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    <Input value={v ?? ""} onChange={(e) => on(e.target.value)} />
  </div>
);

const AssetSlot = ({ label, url, uploading, onPick }: { label: string; url: string | null; uploading: boolean; onPick: (f: File) => void }) => (
  <div className="space-y-2">
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-3 border rounded-md p-3 bg-muted/30">
      {url ? (
        <img src={url} alt={label} className="h-12 max-w-[140px] object-contain bg-white rounded" />
      ) : (
        <div className="h-12 w-24 rounded bg-background border border-dashed flex items-center justify-center text-[10px] text-muted-foreground">No image</div>
      )}
      <label className="cursor-pointer">
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
        <span className="inline-flex items-center gap-1.5 rounded-md border bg-background hover:bg-muted px-3 py-1.5 text-sm">
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {url ? "Replace" : "Upload"}
        </span>
      </label>
    </div>
  </div>
);