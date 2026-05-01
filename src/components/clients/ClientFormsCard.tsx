import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Link2, Copy, Check, Loader2, Send, Archive, FileDown, Mail } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

interface VisaForm {
  id: string;
  name: string;
  code: string | null;
  version: number;
  file_path: string;
  file_name: string;
  country: string;
  category: string;
  is_active: boolean;
  is_archived: boolean;
  email_template_id?: string | null;
}

interface SchemaRow { id: string; form_id: string; version: number; is_active: boolean; is_draft: boolean; }
interface InstanceRow {
  id: string; form_id: string | null; schema_id: string;
  status: string; share_token: string | null; submitted_at: string | null;
}
interface EmailTpl { id: string; subject: string; body_html: string; is_default: boolean }
interface ClientLite { full_name: string; email: string | null }
interface FirmLite { firm_name: string | null }

const randomToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, "").slice(0, 32);
};

export const ClientFormsCard = ({
  clientId, country, category, canEdit,
}: { clientId: string; country: string; category: string; canEdit: boolean }) => {
  const [forms, setForms] = useState<VisaForm[]>([]);
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fillBusyId, setFillBusyId] = useState<string | null>(null);
  const [emailBusyId, setEmailBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailTpls, setEmailTpls] = useState<EmailTpl[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientLite | null>(null);
  const [firmInfo, setFirmInfo] = useState<FirmLite | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: i }, { data: t }, { data: c }, { data: fp }] = await Promise.all([
      supabase.from("visa_forms").select("*")
        .eq("country", country).eq("category", category).eq("is_archived", false)
        .order("name"),
      supabase.from("questionnaire_instances").select("id, form_id, schema_id, status, share_token, submitted_at")
        .eq("client_id", clientId),
      supabase.from("questionnaire_email_templates").select("id, subject, body_html, is_default"),
      supabase.from("clients").select("full_name, email").eq("id", clientId).maybeSingle(),
      supabase.from("firm_profile").select("firm_name").limit(1).maybeSingle(),
    ]);
    const formIds = (f ?? []).map((x) => x.id);
    let s: SchemaRow[] = [];
    if (formIds.length > 0) {
      const { data } = await supabase.from("questionnaire_schemas")
        .select("id, form_id, version, is_active, is_draft")
        .in("form_id", formIds);
      s = (data ?? []) as SchemaRow[];
    }
    setForms((f ?? []) as VisaForm[]);
    setSchemas(s);
    setInstances((i ?? []) as InstanceRow[]);
    setEmailTpls((t ?? []) as EmailTpl[]);
    setClientInfo((c ?? null) as ClientLite | null);
    setFirmInfo((fp ?? null) as FirmLite | null);
    setLoading(false);
  }, [clientId, country, category]);

  useEffect(() => { load(); }, [load]);

  const schemaForForm = (formId: string): SchemaRow | undefined => {
    const candidates = schemas.filter((s) => s.form_id === formId);
    // Prefer active, else highest version
    return candidates.sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.version - a.version)[0];
  };

  const instanceForForm = (formId: string): InstanceRow | undefined =>
    instances.find((x) => x.form_id === formId);

  const onView = async (form: VisaForm) => {
    try {
      const { data, error } = await supabase.storage.from("visa-forms").createSignedUrl(form.file_path, 600);
      if (error || !data?.signedUrl) throw error ?? new Error("Could not open form");
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open form");
    }
  };

  const onCreateOrCopyLink = async (form: VisaForm) => {
    setBusyId(form.id);
    try {
      const schema = schemaForForm(form.id);
      if (!schema) {
        toast.error("Questionnaire not generated yet for this form. Open Forms Library and run AI extraction.");
        return;
      }
      let inst = instanceForForm(form.id);
      if (!inst || !inst.share_token) {
        const token = randomToken();
        const { data: { user } } = await supabase.auth.getUser();
        const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        if (inst) {
          const { error } = await supabase.from("questionnaire_instances")
            .update({ share_token: token, expires_at }).eq("id", inst.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from("questionnaire_instances").insert({
            client_id: clientId,
            schema_id: schema.id,
            form_id: form.id,
            share_token: token,
            expires_at,
            status: "draft",
            answers: {},
            created_by: user?.id ?? null,
          }).select("id, form_id, schema_id, status, share_token, submitted_at").single();
          if (error) throw error;
          inst = data as InstanceRow;
        }
        await logActivity("questionnaire.link_created", "client", clientId, { form_id: form.id });
        await load();
      }
      const token = (inst?.share_token) ?? (await supabase.from("questionnaire_instances")
        .select("share_token").eq("client_id", clientId).eq("form_id", form.id).maybeSingle()).data?.share_token;
      if (!token) throw new Error("Token not available");
      const url = `${window.location.origin}/questionnaire/${token}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(form.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Questionnaire link copied to clipboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create link");
    } finally {
      setBusyId(null);
    }
  };

  const renderTemplate = (raw: string, vars: Record<string, string>) =>
    raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");

  const onSendViaEmail = async (form: VisaForm) => {
    if (!clientInfo?.email) {
      toast.error("Add an email address to this client first.");
      return;
    }
    setEmailBusyId(form.id);
    try {
      const schema = schemaForForm(form.id);
      if (!schema) throw new Error("Questionnaire not generated yet for this form.");
      let inst = instanceForForm(form.id);
      if (!inst || !inst.share_token) {
        const token = randomToken();
        const { data: { user } } = await supabase.auth.getUser();
        const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        if (inst) {
          await supabase.from("questionnaire_instances")
            .update({ share_token: token, expires_at }).eq("id", inst.id);
          inst = { ...inst, share_token: token };
        } else {
          const { data, error } = await supabase.from("questionnaire_instances").insert({
            client_id: clientId,
            schema_id: schema.id,
            form_id: form.id,
            share_token: token,
            expires_at,
            status: "draft",
            answers: {},
            created_by: user?.id ?? null,
          }).select("id, form_id, schema_id, status, share_token, submitted_at").single();
          if (error) throw error;
          inst = data as InstanceRow;
        }
      }
      const url = `${window.location.origin}/questionnaire/${inst!.share_token}`;

      // Pick template: form-specific → default → built-in fallback
      const tpl =
        emailTpls.find((t) => t.id === form.email_template_id) ??
        emailTpls.find((t) => t.is_default) ??
        null;

      const vars = {
        client_name: clientInfo.full_name ?? "",
        form_name: form.name,
        questionnaire_link: url,
        firm_name: firmInfo?.firm_name ?? "",
      };

      const subject = tpl
        ? renderTemplate(tpl.subject, vars)
        : `Your visa questionnaire — ${form.name}`;
      const bodyHtml = tpl
        ? renderTemplate(tpl.body_html, vars)
        : `<p>Hi ${vars.client_name},</p><p>Please complete your questionnaire for <b>${vars.form_name}</b>:</p><p><a href="${url}">${url}</a></p><p>Thanks,<br/>${vars.firm_name}</p>`;

      // Strip simple HTML for the mailto body (most clients open as plain text)
      const bodyText = bodyHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h\d)>/gi, "\n\n")
        .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, (_m, href, text) => `${text} (${href})`)
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      const mailto = `mailto:${encodeURIComponent(clientInfo.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      window.location.href = mailto;

      await logActivity("questionnaire.email_drafted", "client", clientId, {
        form_id: form.id,
        template_id: tpl?.id ?? null,
        recipient: clientInfo.email,
      });
      await load();
      toast.success("Email draft opened in your mail client");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to draft email");
    } finally {
      setEmailBusyId(null);
    }
  };

  const onGenerateFilled = async (form: VisaForm) => {
    const inst = instanceForForm(form.id);
    if (!inst) { toast.error("No questionnaire instance for this form yet"); return; }
    setFillBusyId(form.id);
    try {
      const { data, error } = await supabase.functions.invoke("fill-form", {
        body: { instance_id: inst.id },
      });
      // FunctionsHttpError exposes the JSON body via .context.json() — surface
      // the backend's specific message instead of the generic "non-2xx" toast.
      if (error) {
        let detail = error.message;
        try {
          // deno-lint-ignore no-explicit-any
          const ctx: any = (error as any).context;
          if (ctx) {
            const body = typeof ctx.json === "function" ? await ctx.json() : null;
            if (body?.error) detail = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      if (data?.mode === "internal") {
        const reasonMap: Record<string, string> = {
          xfa_not_writable: "official PDF is dynamic XFA",
          no_writable_fields: "no fillable fields detected",
          source_pdf_unparseable: "source PDF could not be parsed",
          save_failed: "source PDF could not be re-saved",
          force_internal: "internal data sheet requested",
        };
        const reason = reasonMap[data?.reason as string] ?? "fallback";
        toast.success(`Internal data sheet generated (${reason})`);
      } else {
        const filledCount =
          (data?.filled?.acroform?.length ?? 0) + (data?.filled?.xfa?.length ?? 0);
        const skipped = data?.skipped_sample?.length ?? 0;
        toast.success(
          `Filled PDF generated · ${filledCount} field${filledCount === 1 ? "" : "s"} written` +
          (skipped ? ` · ${skipped} skipped` : ""),
        );
      }
      // Open the filled PDF.
      if (data?.file_path) {
        const { data: signed } = await supabase.storage
          .from("client-documents").createSignedUrl(data.file_path, 600);
        if (signed?.signedUrl) window.open(signed.signedUrl, "_blank", "noopener");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate filled PDF");
    } finally {
      setFillBusyId(null);
    }
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b">
        <div className="font-semibold flex items-center gap-2">
          <FileText className="size-4 text-primary" /> Visa forms & questionnaires
        </div>
        <div className="text-xs text-muted-foreground">
          {country} · {category} · {forms.length} form{forms.length === 1 ? "" : "s"} available
        </div>
      </div>
      <div className="divide-y">
        {loading ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin inline mr-2" />Loading forms…
          </div>
        ) : forms.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No forms uploaded for <b>{country} · {category}</b> yet. Add them in the Forms Library.
          </div>
        ) : forms.map((form) => {
          const schema = schemaForForm(form.id);
          const inst = instanceForForm(form.id);
          const submitted = inst?.status === "submitted";
          return (
            <div key={form.id} className="px-6 py-3.5 flex items-center gap-3">
              <FileText className="size-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-2">
                  {form.name}
                  {form.code && <span className="text-[10px] font-mono text-muted-foreground">{form.code}</span>}
                  <span className="text-[10px] text-muted-foreground">v{form.version}</span>
                  {!form.is_active && (
                    <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                      <Archive className="size-2.5" />Inactive
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {schema ? (submitted ? "Questionnaire submitted by client" : inst ? "Questionnaire link active" : "Questionnaire ready · click link to share") : "Questionnaire not generated"}
                </div>
              </div>
              <Button size="icon" variant="ghost" className="size-7" title="Open form PDF" onClick={() => onView(form)}>
                <Eye className="size-3.5" />
              </Button>
              {canEdit && inst && (
                <Button size="sm" variant="outline" className="h-7"
                  onClick={() => onGenerateFilled(form)}
                  disabled={fillBusyId === form.id}
                  title="Auto-fill the original PDF using the client's answers">
                  {fillBusyId === form.id
                    ? <Loader2 className="size-3.5 mr-1 animate-spin" />
                    : <FileDown className="size-3.5 mr-1" />}
                  Filled PDF
                </Button>
              )}
              {canEdit && (
                <Button size="sm" variant="outline" className="h-7"
                  onClick={() => onCreateOrCopyLink(form)}
                  disabled={busyId === form.id || !schema}
                  title={schema ? "Create / copy share link for client" : "Generate the questionnaire from Forms Library first"}>
                  {busyId === form.id ? (
                    <Loader2 className="size-3.5 mr-1 animate-spin" />
                  ) : copiedId === form.id ? (
                    <Check className="size-3.5 mr-1 text-success" />
                  ) : inst?.share_token ? (
                    <Copy className="size-3.5 mr-1" />
                  ) : (
                    <Link2 className="size-3.5 mr-1" />
                  )}
                  {copiedId === form.id ? "Copied" : inst?.share_token ? "Copy link" : "Get link"}
                </Button>
              )}
              {canEdit && (
                <Button size="sm" variant="outline" className="h-7"
                  onClick={() => onSendViaEmail(form)}
                  disabled={emailBusyId === form.id || !schema || !clientInfo?.email}
                  title={
                    !schema ? "Generate the questionnaire first"
                    : !clientInfo?.email ? "This client has no email address on file"
                    : "Open an email draft with the questionnaire link using the configured template"
                  }>
                  {emailBusyId === form.id
                    ? <Loader2 className="size-3.5 mr-1 animate-spin" />
                    : <Mail className="size-3.5 mr-1" />}
                  Send via email
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {forms.length > 0 && (
        <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
          <Send className="size-3" />
          Share the link with the applicant — they fill the form online and answers feed all attached visa forms automatically.
        </div>
      )}
    </Card>
  );
};