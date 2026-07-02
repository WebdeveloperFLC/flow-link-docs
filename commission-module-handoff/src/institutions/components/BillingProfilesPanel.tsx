import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";

interface BillingProfile {
  id: string;
  profile_name: string;
  legal_entity_name: string | null;
  billing_address: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  tax_registration_number: string | null;
  default_invoice_currency: string;
  default_receipt_currency: string;
  payment_terms_days: number | null;
  remittance_instructions: string | null;
  is_default: boolean;
  status: string;
  aggregator_id: string | null;
}

const emptyForm = (): Partial<BillingProfile> => ({
  profile_name: "",
  legal_entity_name: "",
  billing_address: "",
  billing_email: "",
  billing_phone: "",
  tax_registration_number: "",
  default_invoice_currency: "CAD",
  default_receipt_currency: "CAD",
  payment_terms_days: 30,
  remittance_instructions: "",
  is_default: false,
  status: "active",
});

export function BillingProfilesPanel({ institutionId }: { institutionId: string }) {
  const [profiles, setProfiles] = useState<BillingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<BillingProfile> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("upi_billing_profiles" as any)
      .select("*")
      .eq("institution_id", institutionId)
      .order("is_default", { ascending: false });
    if (error) toast.error(error.message);
    else setProfiles((data ?? []) as BillingProfile[]);
    setLoading(false);
  }, [institutionId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form?.profile_name?.trim()) return toast.error("Profile name is required");
    setSaving(true);
    const payload = {
      institution_id: institutionId,
      profile_name: form.profile_name.trim(),
      legal_entity_name: form.legal_entity_name || null,
      billing_address: form.billing_address || null,
      billing_email: form.billing_email || null,
      billing_phone: form.billing_phone || null,
      tax_registration_number: form.tax_registration_number || null,
      default_invoice_currency: form.default_invoice_currency || "CAD",
      default_receipt_currency: form.default_receipt_currency || "CAD",
      payment_terms_days: form.payment_terms_days ?? 30,
      remittance_instructions: form.remittance_instructions || null,
      is_default: form.is_default ?? false,
      status: form.status || "active",
    };
    if (form.id) {
      const { error } = await supabase.from("upi_billing_profiles" as any).update(payload).eq("id", form.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Billing profile updated");
    } else {
      const { error } = await supabase.from("upi_billing_profiles" as any).insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Billing profile created");
    }
    setForm(null);
    setSaving(false);
    load();
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading billing profiles…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Invoice and remittance details per institution (optional aggregator override in Phase 2).
        </p>
        <Button size="sm" onClick={() => setForm(emptyForm())}>
          <Plus className="size-4 mr-1" /> Add profile
        </Button>
      </div>

      {profiles.length === 0 && !form && (
        <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
          No billing profiles yet. Add one before generating commission invoices.
        </div>
      )}

      {profiles.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex justify-between gap-2 flex-wrap">
            <div>
              <div className="font-medium flex items-center gap-2">
                {p.profile_name}
                {p.is_default && <Badge>Default</Badge>}
                <Badge variant="outline">{p.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {p.legal_entity_name ?? "—"} · {p.default_invoice_currency} invoice / {p.default_receipt_currency} receipt
                {p.payment_terms_days != null && ` · Net ${p.payment_terms_days}`}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setForm(p)}>Edit</Button>
          </div>
        </Card>
      ))}

      {form && (
        <Card className="p-4 space-y-3">
          <div className="font-medium">{form.id ? "Edit billing profile" : "New billing profile"}</div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Profile name" value={form.profile_name ?? ""} onChange={(v) => setForm({ ...form, profile_name: v })} />
            <Field label="Legal entity" value={form.legal_entity_name ?? ""} onChange={(v) => setForm({ ...form, legal_entity_name: v })} />
            <Field label="Billing email" value={form.billing_email ?? ""} onChange={(v) => setForm({ ...form, billing_email: v })} />
            <Field label="Billing phone" value={form.billing_phone ?? ""} onChange={(v) => setForm({ ...form, billing_phone: v })} />
            <Field label="Tax / GST number" value={form.tax_registration_number ?? ""} onChange={(v) => setForm({ ...form, tax_registration_number: v })} />
            <Field label="Payment terms (days)" value={String(form.payment_terms_days ?? 30)} onChange={(v) => setForm({ ...form, payment_terms_days: Number(v) || 30 })} />
            <Field label="Invoice currency" value={form.default_invoice_currency ?? "CAD"} onChange={(v) => setForm({ ...form, default_invoice_currency: v })} />
            <Field label="Receipt currency" value={form.default_receipt_currency ?? "CAD"} onChange={(v) => setForm({ ...form, default_receipt_currency: v })} />
          </div>
          <Field label="Billing address" value={form.billing_address ?? ""} onChange={(v) => setForm({ ...form, billing_address: v })} multiline />
          <Field label="Remittance instructions" value={form.remittance_instructions ?? ""} onChange={(v) => setForm({ ...form, remittance_instructions: v })} multiline />
          <div className="flex items-center gap-2">
            <Switch checked={form.is_default ?? false} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
            <Label className="text-sm">Default profile for this institution</Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              <Save className="size-4 mr-1" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, multiline,
}: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <textarea
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
      )}
    </div>
  );
}
