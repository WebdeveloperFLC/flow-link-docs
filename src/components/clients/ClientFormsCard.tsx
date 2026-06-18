import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Link2, Copy, Check, Loader2, Send, Archive, FileDown, Mail } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { copyTextToClipboard, parseSupabaseFunctionError } from "@/lib/supabaseFunctions";
import {
  isExternalVisaFormUrl,
  isVisaFormPlaceholderPath,
  matchOfficialVisaFormPath,
  openVisaFormLink,
} from "@/lib/service-library/openVisaFormLink";

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

const LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const ClientFormsCard = ({
  clientId, country, category, libraryId, canEdit,
}: { clientId: string; country: string; category: string; libraryId?: string | null; canEdit: boolean }) => {
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

  const countryLabel = (country ?? "").trim();
  const categoryLabel = (category ?? "").trim();
  const filtersReady = Boolean(countryLabel && categoryLabel);

  const load = useCallback(async () => {
    setLoading(true);
    if (!filtersReady) {
      setForms([]);
      setSchemas([]);
      setInstances([]);
      setLoading(false);
      return;
    }

    const [{ data: f }, { data: i }, { data: t }, { data: c }, { data: fp }] = await Promise.all([
      supabase.from("visa_forms").select("*")
        .eq("country", countryLabel).eq("category", categoryLabel).eq("is_archived", false)
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
        .in("form_id", formIds)
        .eq("is_draft", false);
      s = (data ?? []) as SchemaRow[];
    }
    setForms((f ?? []) as VisaForm[]);
    setSchemas(s);
    setInstances((i ?? []) as InstanceRow[]);
    setEmailTpls((t ?? []) as EmailTpl[]);
    setClientInfo((c ?? null) as ClientLite | null);
    setFirmInfo((fp ?? null) as FirmLite | null);
    setLoading(false);
  }, [clientId, countryLabel, categoryLabel, filtersReady]);

  useEffect(() => { void load(); }, [load]);

  const schemaForForm = (formId: string): SchemaRow | undefined => {
    const candidates = schemas.filter((s) => s.form_id === formId);
    return candidates.sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.version - a.version)[0];
  };

  const instanceForForm = (formId: string): InstanceRow | undefined =>
    instances.find((x) => x.form_id === formId);

  const resolveOfficialFormPath = async (form: VisaForm): Promise<string | null> => {
    if (!libraryId?.trim() || !form.code?.trim()) return null;
    const { data } = await supabase
      .from("service_library_visa_form_files")
      .select("form_code,file_path")
      .eq("library_id", libraryId)
      .eq("is_current", true);
    return matchOfficialVisaFormPath(form.code, data ?? []);
  };

  /** Create or refresh questionnaire instance + share URL. */
  const ensureQuestionnaireLink = async (form: VisaForm): Promise<{ url: string; inst: InstanceRow }> => {
    const schema = schemaForForm(form.id);
    if (!schema) {
      throw new Error("Questionnaire not generated yet. Open Forms Library and run AI extraction on this form.");
    }

    let inst = instanceForForm(form.id);
    const token = randomToken();
    const expires_at = new Date(Date.now() + LINK_TTL_MS).toISOString();
    const { data: { user } } = await supabase.auth.getUser();

    if (inst?.share_token) {
      const url = `${window.location.origin}/questionnaire/${inst.share_token}`;
      return { url, inst };
    }

    if (inst) {
      const { error } = await supabase.from("questionnaire_instances")
        .update({ share_token: token, expires_at, schema_id: schema.id })
        .eq("id", inst.id);
      if (error) throw error;
      inst = { ...inst, share_token: token, schema_id: schema.id };
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
      await logActivity("questionnaire.link_created", "client", clientId, { form_id: form.id });
    }

    const url = `${window.location.origin}/questionnaire/${inst.share_token}`;
    return { url, inst };
  };

  const onView = async (form: VisaForm) => {
    try {
      const [{ data: fresh }, officialPath] = await Promise.all([
        supabase.from("visa_forms").select("file_path,code").eq("id", form.id).maybeSingle(),
        resolveOfficialFormPath(form),
      ]);
      const storedPath = fresh?.file_path ?? form.file_path;
      const path =
        officialPath ??
        (storedPath && !isVisaFormPlaceholderPath(storedPath) ? storedPath : null) ??
        (storedPath && isExternalVisaFormUrl(storedPath) ? storedPath : null);

      if (!path?.trim()) {
        toast.error("Official form link not configured — add it in Service Library → Visa forms");
        return;
      }

      if (isExternalVisaFormUrl(path)) {
        window.open(path, "_blank", "noopener,noreferrer");
        return;
      }

      const opened = await openVisaFormLink({
        filePath: path,
        title: form.name,
        storageBucket: "visa-forms",
      });
      if (!opened) throw new Error("Could not open form");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open form");
    }
  };

  const onCreateOrCopyLink = async (form: VisaForm) => {
    setBusyId(form.id);
    try {
      const { url, inst } = await ensureQuestionnaireLink(form);
      const copied = await copyTextToClipboard(url);
      if (!copied) {
        toast.error("Could not copy link — copy manually from the browser address bar after opening.");
        window.open(url, "_blank", "noopener");
        return;
      }
      setInstances((prev) => {
        const rest = prev.filter((x) => x.form_id !== form.id);
        return [...rest, inst];
      });
      setCopiedId(form.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Questionnaire link copied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create link");
    } finally {
      setBusyId(null);
    }
  };

  const renderTemplate = (raw: string, vars: Record<string, string>) =>
    raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");

  const onSendViaEmail = async (form: VisaForm) => {
    if (!clientInfo?.email?.trim()) {
      toast.error("Add an email address to this client first.");
      return;
    }
    setEmailBusyId(form.id);
    try {
      const { url } = await ensureQuestionnaireLink(form);

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
      toast.success("Email draft opened in your mail client");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to draft email");
    } finally {
      setEmailBusyId(null);
    }
  };

  const onGenerateFilled = async (form: VisaForm) => {
    const inst = instanceForForm(form.id);
    if (!inst) {
      toast.error("Share the questionnaire link first so a draft instance exists.");
      return;
    }
    setFillBusyId(form.id);
    try {
      const { data, error } = await supabase.functions.invoke("fill-form", {
        body: { instance_id: inst.id },
      });
      if (error) throw new Error(await parseSupabaseFunctionError(error));
      if (data?.error) throw new Error(String(data.error));

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
          `Filled PDF · ${filledCount} field${filledCount === 1 ? "" : "s"}` +
          (skipped ? ` · ${skipped} skipped` : ""),
        );
      }

      if (data?.file_path) {
        const { data: signed, error: signErr } = await supabase.storage
          .from("client-documents").createSignedUrl(data.file_path, 600);
        if (signErr || !signed?.signedUrl) {
          toast.message("PDF saved but preview link failed — check Documents tab.");
        } else {
          window.open(signed.signedUrl, "_blank", "noopener");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate filled PDF");
    } finally {
      setFillBusyId(null);
    }
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-4 sm:px-5 py-3 border-b">
        <div className="font-semibold text-sm flex items-center gap-2">
          <FileText className="size-4 text-primary" /> Visa forms & questionnaires
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {filtersReady
            ? `${countryLabel} · ${categoryLabel} · ${forms.length} form${forms.length === 1 ? "" : "s"}`
            : "Set destination country and service type on this client to load forms"}
        </div>
      </div>
      <div className="divide-y">
        {loading ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin inline mr-2" />Loading forms…
          </div>
        ) : !filtersReady ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            Assign a service with a destination country, or set country + application type on the client.
          </div>
        ) : forms.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            No forms for <b>{countryLabel} · {categoryLabel}</b>. Add them in Forms Library.
          </div>
        ) : forms.map((form) => {
          const schema = schemaForForm(form.id);
          const inst = instanceForForm(form.id);
          const submitted = inst?.status === "submitted";
          return (
            <div key={form.id} className="px-4 sm:px-5 py-2.5 flex items-center gap-2 flex-wrap">
              <FileText className="size-4 text-primary shrink-0" />
              <div className="flex-1 min-w-[160px]">
                <div className="text-sm font-medium truncate flex items-center gap-1.5 flex-wrap">
                  <span className="truncate">{form.name}</span>
                  {form.code && <span className="text-[10px] font-mono text-muted-foreground">{form.code}</span>}
                  <span className="text-[10px] text-muted-foreground">v{form.version}</span>
                  {!form.is_active && (
                    <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                      <Archive className="size-2.5" />Inactive
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {!schema
                    ? "Questionnaire not generated — run AI extraction in Forms Library"
                    : submitted
                      ? "Questionnaire submitted by client"
                      : inst?.share_token
                        ? "Link active · share or fill PDF"
                        : "Ready · get link to share"}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap">
                <Button size="icon" variant="ghost" className="size-7" title="Open blank form PDF" onClick={() => onView(form)}>
                  <Eye className="size-3.5" />
                </Button>
                {canEdit && inst && (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => onGenerateFilled(form)}
                    disabled={fillBusyId === form.id}
                    title="Auto-fill PDF from questionnaire answers">
                    {fillBusyId === form.id ? <Loader2 className="size-3 mr-1 animate-spin" /> : <FileDown className="size-3 mr-1" />}
                    Filled PDF
                  </Button>
                )}
                {canEdit && (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => onCreateOrCopyLink(form)}
                    disabled={busyId === form.id || !schema}
                    title={schema ? "Create / copy client questionnaire link" : "Generate questionnaire in Forms Library first"}>
                    {busyId === form.id ? (
                      <Loader2 className="size-3 mr-1 animate-spin" />
                    ) : copiedId === form.id ? (
                      <Check className="size-3 mr-1 text-success" />
                    ) : inst?.share_token ? (
                      <Copy className="size-3 mr-1" />
                    ) : (
                      <Link2 className="size-3 mr-1" />
                    )}
                    {copiedId === form.id ? "Copied" : inst?.share_token ? "Copy link" : "Get link"}
                  </Button>
                )}
                {canEdit && (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => onSendViaEmail(form)}
                    disabled={emailBusyId === form.id || !schema || !clientInfo?.email}
                    title={
                      !schema ? "Generate questionnaire first"
                      : !clientInfo?.email ? "Client has no email"
                      : "Open mail client with questionnaire link"
                    }>
                    {emailBusyId === form.id ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Mail className="size-3 mr-1" />}
                    Email
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {forms.length > 0 && filtersReady && (
        <div className="px-4 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground flex items-center gap-2">
          <Send className="size-3 shrink-0" />
          Client completes the online questionnaire · answers auto-fill attached visa forms.
        </div>
      )}
    </Card>
  );
};
