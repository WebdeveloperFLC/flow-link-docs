import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";

type FieldKey = "app_id" | "secret" | "webhook_secret" | "from_number" | "sbc_uri" | "test_extension";

interface FieldStatus {
  set: boolean;
  preview: string | null;
  length: number;
}

interface ConfigResponse {
  provider: string;
  updated_at: string | null;
  updated_by: string | null;
  fields: Record<FieldKey, FieldStatus>;
}

const FIELD_META: { key: FieldKey; label: string; placeholder: string; description: string; isSecret: boolean }[] = [
  {
    key: "app_id",
    label: "TeleCMI App ID",
    placeholder: "e.g. 1234567",
    description: "Numeric or alphanumeric application identifier from the TeleCMI console.",
    isSecret: false,
  },
  {
    key: "secret",
    label: "TeleCMI Secret",
    placeholder: "Paste new secret to rotate",
    description: "Used to authenticate outbound API calls. Stored encrypted at rest.",
    isSecret: true,
  },
  {
    key: "webhook_secret",
    label: "TeleCMI Webhook Secret",
    placeholder: "Paste new webhook secret",
    description: "HMAC secret used to validate inbound webhook signatures.",
    isSecret: true,
  },
  {
    key: "from_number",
    label: "Outbound From-Number",
    placeholder: "+1XXXXXXXXXX",
    description: "Caller ID used for outbound click-to-call.",
    isSecret: false,
  },
  {
    key: "sbc_uri",
    label: "SBC URI (Browser SDK)",
    placeholder: "e.g. sbcind.telecmi.com",
    description: "Shared TeleCMI SBC host used by the browser SDK to log in. Region examples: sbcind / sbcsg / sbcuk / sbcus.telecmi.com.",
    isSecret: false,
  },
  {
    key: "test_extension",
    label: "Admin test extension/number",
    placeholder: "e.g. 5006 or 13158050050",
    description: "Number dialed by the admin Test-call button to verify the SDK end-to-end.",
    isSecret: false,
  },
];

const schema = z.object({
  app_id: z.string().trim().max(64).regex(/^[A-Za-z0-9_-]*$/, "Letters, digits, _ or - only").optional(),
  secret: z.string().trim().max(512).optional(),
  webhook_secret: z.string().trim().max(512).optional(),
  from_number: z
    .string()
    .trim()
    .max(20)
    .regex(/^(\+?[0-9 ()-]{4,20})?$/, "Invalid phone format")
    .optional(),
  sbc_uri: z.string().trim().max(128).regex(/^[A-Za-z0-9_.-]*$/, "Host only, no scheme/path").optional(),
  test_extension: z.string().trim().max(32).regex(/^[A-Za-z0-9_+*#]*$/, "Digits or extension only").optional(),
});

const TelephonyIntegrationSettings = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<FieldKey, string>>({
    app_id: "",
    secret: "",
    webhook_secret: "",
    from_number: "",
    sbc_uri: "",
    test_extension: "",
  });

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
  const fnUrl = `https://${projectId}.supabase.co/functions/v1/telephony-admin-config`;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  const authedFetch = async (init: RequestInit) => {
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session;
    }
    if (!session?.access_token) throw new Error("Please sign in again");
    return fetch(fnUrl, {
      ...init,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        ...(init.headers ?? {}),
      },
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await authedFetch({ method: "GET" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to load");
      setStatus(body as ConfigResponse);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const onSave = async () => {
    const parsed = schema.safeParse(drafts);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(`${first.path.join(".")} – ${first.message}`);
      return;
    }
    // Only send fields the admin actually filled in. Empty strings clear values.
    const payload: Record<string, string> = {};
    (Object.keys(drafts) as FieldKey[]).forEach((k) => {
      if (drafts[k].length > 0) payload[k] = drafts[k];
    });
    if (Object.keys(payload).length === 0) {
      toast.message("Nothing to save", { description: "Enter at least one value to update." });
      return;
    }

    setSaving(true);
    try {
      const res = await authedFetch({ method: "POST", body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Save failed");
      toast.success("Provider settings saved");
      setDrafts({ app_id: "", secret: "", webhook_secret: "", from_number: "", sbc_uri: "", test_extension: "" });
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Telephony Integration Settings"
        description="Admin-only. Manage TeleCMI provider credentials and outbound caller ID."
      />
      <div className="p-6 space-y-4 max-w-3xl">
        <Card className="p-4 flex items-start gap-3 bg-muted/40">
          <ShieldCheck className="h-5 w-5 mt-0.5 text-primary" />
          <div className="text-sm text-muted-foreground">
            Secrets are stored securely on the backend and never returned to the browser. Saved values are
            shown masked (last 4 characters only). Leave a field blank to keep its current value; submit a
            new value to rotate it.
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <Card className="p-6 space-y-5">
            {FIELD_META.map((f) => {
              const current = status?.fields[f.key];
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={f.key} className="flex items-center gap-2">
                      {f.isSecret && <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />}
                      {f.label}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {current?.set ? (
                        <>Current: <code className="font-mono">{current.preview}</code></>
                      ) : (
                        <span className="italic">Not set</span>
                      )}
                    </span>
                  </div>
                  <Input
                    id={f.key}
                    type={f.isSecret ? "password" : "text"}
                    autoComplete="off"
                    placeholder={f.placeholder}
                    value={drafts[f.key]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                Provider: <code>{status?.provider ?? "telecmi"}</code>
                {status?.updated_at && (
                  <> · Last updated {new Date(status.updated_at).toLocaleString()}</>
                )}
              </div>
              <Button onClick={onSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default TelephonyIntegrationSettings;