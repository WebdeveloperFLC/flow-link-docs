import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Mail, Plus, Trash2, Pencil, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  is_default: boolean;
  created_at: string;
}

const DEFAULT_BODY = `<p>Hi {{client_name}},</p>
<p>Please complete your visa questionnaire for <b>{{form_name}}</b> using the secure link below:</p>
<p><a href="{{questionnaire_link}}">Open my questionnaire</a></p>
<p>The link is unique to you — please don't share it. Save your progress at any time and come back later.</p>
<p>Thanks,<br/>{{firm_name}}</p>`;

const MERGE_TAGS = [
  { tag: "{{client_name}}", desc: "Applicant's full name" },
  { tag: "{{form_name}}", desc: "Visa form name (e.g. IMM 5257)" },
  { tag: "{{questionnaire_link}}", desc: "Secure questionnaire URL" },
  { tag: "{{firm_name}}", desc: "Your firm's name (from Settings)" },
];

const QuestionnaireEmailTemplates = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("questionnaire_email_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as EmailTemplate[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const startNew = () => {
    setEditing({
      id: "",
      name: "",
      subject: "Your visa questionnaire — {{form_name}}",
      body_html: DEFAULT_BODY,
      is_default: rows.length === 0,
      created_at: "",
    });
    setOpen(true);
  };

  const startEdit = (r: EmailTemplate) => {
    setEditing({ ...r });
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.subject.trim() || !editing.body_html.trim()) {
      toast.error("Name, subject and body are required");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Ensure only one default
      if (editing.is_default) {
        await supabase.from("questionnaire_email_templates")
          .update({ is_default: false }).neq("id", editing.id || "00000000-0000-0000-0000-000000000000");
      }
      if (editing.id) {
        const { error } = await supabase.from("questionnaire_email_templates").update({
          name: editing.name.trim(),
          subject: editing.subject.trim(),
          body_html: editing.body_html,
          is_default: editing.is_default,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { error } = await supabase.from("questionnaire_email_templates").insert({
          name: editing.name.trim(),
          subject: editing.subject.trim(),
          body_html: editing.body_html,
          is_default: editing.is_default,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
        toast.success("Template created");
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (r: EmailTemplate) => {
    try {
      await supabase.from("questionnaire_email_templates").update({ is_default: false }).neq("id", r.id);
      const { error } = await supabase.from("questionnaire_email_templates")
        .update({ is_default: true }).eq("id", r.id);
      if (error) throw error;
      toast.success(`"${r.name}" is now the default`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to set default");
    }
  };

  const remove = async (r: EmailTemplate) => {
    if (!confirm(`Delete template "${r.name}"? Forms using it will fall back to the default.`)) return;
    const { error } = await supabase.from("questionnaire_email_templates").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); await load(); }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Questionnaire emails"
        description="Reusable email copy used when sharing visa questionnaires with clients."
        actions={
          <Button onClick={startNew} className="gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-1.5" /> New template
          </Button>
        }
      />
      <div className="p-8 space-y-6 max-w-4xl">
        <Card className="overflow-hidden shadow-elev-sm">
          <div className="px-6 py-4 border-b">
            <div className="font-semibold flex items-center gap-2">
              <Mail className="size-4 text-primary" /> Email templates
            </div>
            <div className="text-xs text-muted-foreground">
              Each visa form can pick one of these as its default sharing email. Use merge tags to personalise.
            </div>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin inline mr-2" /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No templates yet. Create one to personalise the email clients receive when you share a questionnaire.
              </div>
            ) : rows.map((r) => (
              <div key={r.id} className="px-6 py-3.5 flex items-center gap-3">
                <Mail className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    {r.name}
                    {r.is_default && (
                      <span className="text-[10px] uppercase font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        <Star className="size-2.5" /> Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">Subject: {r.subject}</div>
                </div>
                {!r.is_default && (
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setDefault(r)} title="Make this the default template">
                    <Star className="size-3.5 mr-1" /> Set default
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="size-7" onClick={() => startEdit(r)} title="Edit">
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => remove(r)} title="Delete">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elev-sm">
          <div className="text-sm font-semibold mb-2">Available merge tags</div>
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            {MERGE_TAGS.map((m) => (
              <div key={m.tag} className="flex items-start gap-2">
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{m.tag}</code>
                <span className="text-muted-foreground">{m.desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit template" : "New template"}</DialogTitle>
            <DialogDescription>
              Body uses simple HTML. Merge tags like <code>{"{{client_name}}"}</code> are replaced when the email is sent.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Internal name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Friendly applicant invite"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email subject</Label>
                <Input
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email body (HTML)</Label>
                <Textarea
                  value={editing.body_html}
                  onChange={(e) => setEditing({ ...editing, body_html: e.target.value })}
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={editing.is_default}
                  onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                />
                Use as the default template for forms with no explicit selection
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gradient-brand text-primary-foreground">
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editing?.id ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default QuestionnaireEmailTemplates;