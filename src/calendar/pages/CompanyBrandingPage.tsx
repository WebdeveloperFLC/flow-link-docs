import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCompanyBranding, useUpdateBranding, uploadCompanyAsset } from "../hooks/useBranding";
import { useCanManageBranding } from "../lib/permissions";
import { Navigate } from "react-router-dom";

export default function CompanyBrandingPage() {
  const canManage = useCanManageBranding();
  const { data } = useCompanyBranding();
  const update = useUpdateBranding();
  const [form, setForm] = useState<any>({});

  useEffect(() => { if (data) setForm(data); }, [data]);

  if (!canManage) return <Navigate to="/calendar" replace />;

  const save = async () => {
    try { await update.mutateAsync(form); toast.success("Branding updated"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const onLogo = async (file: File) => {
    try {
      const url = await uploadCompanyAsset("logo", file);
      setForm((f: any) => ({ ...f, company_logo_url: url }));
      toast.success("Logo uploaded");
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold">Company branding</h1>
        <Card>
          <CardHeader><CardTitle className="text-sm">Brand identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company name</Label><Input value={form.company_name ?? ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>Footer text</Label><Input value={form.footer_text ?? ""} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} /></div>
              <div><Label>Primary color</Label><Input type="color" value={form.primary_color ?? "#3B82F6"} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></div>
              <div><Label>Secondary color</Label><Input type="color" value={form.secondary_color ?? "#10B981"} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} /></div>
              <div><Label>Terms URL</Label><Input value={form.terms_url ?? ""} onChange={(e) => setForm({ ...form, terms_url: e.target.value })} /></div>
              <div><Label>Privacy URL</Label><Input value={form.privacy_url ?? ""} onChange={(e) => setForm({ ...form, privacy_url: e.target.value })} /></div>
            </div>
            <div>
              <Label>Company logo</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.company_logo_url && <img src={form.company_logo_url} alt="logo" className="h-12 w-12 object-contain rounded border" />}
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
              </div>
            </div>
            <div className="flex justify-end"><Button onClick={save}>Save</Button></div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}