import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, APPLICATION_TYPES } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import { z } from "zod";

interface Template { id: string; name: string; country: string; category: string; }

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().min(1),
  application_type: z.string().min(1),
  template_id: z.string().optional(),
});

export const NewClientDialog = ({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void; }) => {
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState<string>("");
  const [appType, setAppType] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase.from("workflow_templates").select("id,name,country,category").then(({ data }) => setTemplates(data ?? []));
  }, [open]);

  const matchingTemplates = templates.filter((t) => (!country || t.country === country));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      full_name: fd.get("full_name"),
      email: fd.get("email") || "",
      phone: fd.get("phone") || "",
      country, application_type: appType, template_id: templateId || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const { data, error } = await supabase.from("clients").insert({
      full_name: parsed.data.full_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      country: parsed.data.country,
      application_type: parsed.data.application_type,
      template_id: parsed.data.template_id || null,
    }).select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await logActivity("client.created", "client", data.id, { application_id: data.application_id });
    toast.success(`Created ${data.application_id}`);
    onOpenChange(false);
    setCountry(""); setAppType(""); setTemplateId("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" key={open ? "open" : "closed"}>
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name *</Label>
            <Input id="full_name" name="full_name" required maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
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