import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMasterLabels } from "@/lib/masters";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import { z } from "zod";
import { COUNTRY_OPTIONS, dialCodeFor } from "@/lib/countryCodes";

interface Template { id: string; name: string; country: string; category: string; }

const schema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(60),
  middle_name: z.string().trim().max(60).optional().or(z.literal("")),
  last_name: z.string().trim().min(1, "Last name is required").max(60),
  gender: z.string().min(1, "Gender is required"),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  phone_code: z.string().optional().or(z.literal("")),
  country: z.string().min(1),
  application_type: z.string().min(1),
  template_id: z.string().optional(),
});

const GENDERS = ["Male","Female","Other","Prefer not to say"];

export const NewClientDialog = ({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void; }) => {
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState<string>("");
  const [appType, setAppType] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [phoneCountry, setPhoneCountry] = useState<string>("India");
  const phoneCode = dialCodeFor(phoneCountry) || "91";
  const [templates, setTemplates] = useState<Template[]>([]);
  const COUNTRIES = useMasterLabels("countries");
  const APPLICATION_TYPES = useMasterLabels("application_types");

  useEffect(() => {
    if (!open) return;
    supabase.from("workflow_templates").select("id,name,country,category").then(({ data }) => setTemplates(data ?? []));
  }, [open]);

  const matchingTemplates = templates.filter((t) => (!country || t.country === country));

  // Auto-sync phone country when the client country changes (still editable).
  useEffect(() => {
    if (!country) return;
    if (dialCodeFor(country)) setPhoneCountry(country);
  }, [country]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rawPhone = String(fd.get("phone") || "").trim();
    const parsed = schema.safeParse({
      first_name: fd.get("first_name"),
      middle_name: fd.get("middle_name") || "",
      last_name: fd.get("last_name"),
      gender,
      email: fd.get("email") || "",
      phone: rawPhone,
      phone_code: phoneCode,
      country, application_type: appType, template_id: templateId || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    const fullName = [parsed.data.first_name, parsed.data.middle_name, parsed.data.last_name]
      .map((s) => (s ?? "").trim()).filter(Boolean).join(" ");
    const fullPhone = parsed.data.phone ? `+${phoneCode} ${parsed.data.phone}`.trim() : null;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_client", {
        _full_name: fullName,
        _country: parsed.data.country,
        _application_type: parsed.data.application_type,
        _email: parsed.data.email || null,
        _phone: fullPhone,
        _template_id: parsed.data.template_id || null,
      });
      if (error) throw error;
      const row = data as unknown as { id: string; application_id: string };
      // Persist gender on client_profile (best-effort).
      if (gender) {
        await supabase.from("client_profile").insert({ client_id: row.id, gender });
      }
      await logActivity("client.created", "client", row.id, { application_id: row.application_id });
      toast.success(`Created ${row.application_id}`);
      onOpenChange(false);
      setCountry(""); setAppType(""); setTemplateId(""); setGender(""); setPhoneCountry("India");
      onCreated();
    } catch (err) {
      const e = err as { code?: string; message?: string; details?: string; hint?: string } | null;
      console.error("Create client failed:", err);
      const msg = [e?.code && `[${e.code}]`, e?.message, e?.details, e?.hint].filter(Boolean).join(" — ") || "Failed to create client";
      toast.error(`Failed to create client: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" key={open ? "open" : "closed"}>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First name *</Label>
              <Input id="first_name" name="first_name" required maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="middle_name">Middle name</Label>
              <Input id="middle_name" name="middle_name" maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last name *</Label>
              <Input id="last_name" name="last_name" required maxLength={60} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Gender *</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <div className="flex gap-2">
                <Select value={phoneCountry} onValueChange={setPhoneCountry}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue>
                      <span className="truncate">+{phoneCode} · {phoneCountry}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((o) => (
                      <SelectItem key={`${o.name}-${o.code}`} value={o.name}>
                        +{o.code} · {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input id="phone" name="phone" className="flex-1" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Country *</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Application type *</Label>
              <Select value={appType} onValueChange={setAppType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{APPLICATION_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Workflow template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder={matchingTemplates.length ? "Choose a template" : "No templates yet — optional"} /></SelectTrigger>
              <SelectContent>
                {matchingTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} <span className="text-muted-foreground">· {t.category}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Defines the document checklist and binder order.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gradient-brand text-primary-foreground">{busy ? "Creating…" : "Create client"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};