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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ShieldAlert, Loader2, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { invokeError } from "@/lib/invokeError";

const PRESETS: Record<string, { host: string; port: number; encryption: "ssl"|"tls"|"none" }> = {
  hostinger: { host: "smtp.hostinger.com", port: 465, encryption: "ssl" },
  gmail: { host: "smtp.gmail.com", port: 465, encryption: "ssl" },
  outlook: { host: "smtp.office365.com", port: 587, encryption: "tls" },
  brevo: { host: "smtp-relay.brevo.com", port: 587, encryption: "tls" },
  custom: { host: "", port: 587, encryption: "tls" },
};

type Form = {
  provider: string; host: string; port: number; encryption: "ssl"|"tls"|"none";
  username: string; password: string; sender_email: string; sender_name: string;
  reply_to: string; is_active: boolean;
};

const EmailSmtpSettings = () => {
  const { isAdmin, loading } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastRawResponse, setLastRawResponse] = useState<string | null>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [form, setForm] = useState<Form>({
    provider: "hostinger", host: "smtp.hostinger.com", port: 465, encryption: "ssl",
    username: "", password: "", sender_email: "support@dms.futurelinkconsultants.com",
    sender_name: "Future Link Consultants", reply_to: "", is_active: false,
  });

  const load = async () => {
    const { data } = await supabase.from("smtp_settings_safe").select("*").maybeSingle();
    if (data) {
      setForm({
        provider: data.provider ?? "hostinger",
        host: data.host ?? "",
        port: data.port ?? 465,
        encryption: (data.encryption ?? "ssl") as Form["encryption"],
        username: data.username ?? "",
        password: "",
        sender_email: data.sender_email ?? "",
        sender_name: data.sender_name ?? "",
        reply_to: data.reply_to ?? "",
        is_active: !!data.is_active,
      });
      setHasPassword(!!data.has_password);
      setLastStatus(data.last_status ?? null);
      setLastError(data.last_error ?? null);
      setLastVerifiedAt(data.last_verified_at ?? null);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const applyPreset = (provider: string) => {
    const p = PRESETS[provider] ?? PRESETS.custom;
    setForm((f) => ({ ...f, provider, host: p.host, port: p.port, encryption: p.encryption }));
  };

  const call = async (action: "save" | "verify" | "test", payload?: Record<string, unknown>) => {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("smtp-admin", {
        body: { action, payload, recipient: testRecipient || form.sender_email },
      });
      const message = await invokeError(error, data);
      if (message) { setLastRawResponse(message); throw new Error(message); }
      if ((data as any)?.raw) setLastRawResponse(String((data as any).raw));
      return data as any;
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    if (!form.username.trim()) { toast.error("SMTP username is required"); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.sender_email)) { toast.error("Invalid sender email"); return; }
    if (form.port < 1 || form.port > 65535) { toast.error("Invalid port"); return; }
    try {
      await call("save", { ...form, password: form.password || undefined });
      toast.success("SMTP settings saved");
      setForm((f) => ({ ...f, password: "" }));
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
  };
  const onVerify = async () => {
    try {
      const result = await call("verify");
      if (result?.raw) setLastRawResponse(String(result.raw));
      toast.success("SMTP connection verified");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Verification failed"); load(); }
  };
  const onTest = async () => {
    if (!/^\S+@\S+\.\S+$/.test(testRecipient || form.sender_email)) { toast.error("Invalid test recipient"); return; }
    try {
      await call("test");
      toast.success("Test email sent");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Test failed"); load(); }
  };

  const StatusBadge = () => {
    const status = lastStatus ?? (hasPassword ? "pending" : "pending");
    const label = status === "verified" ? "Connected" : status === "failed" ? "Failed" : "Pending verification";
    const cls = status === "verified"
      ? "bg-success/10 text-success border-success/20"
      : status === "failed"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : "bg-muted text-muted-foreground border-border";
    const Icon = status === "verified" ? ShieldCheck : ShieldAlert;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${cls}`}>
        <Icon className="size-3.5" /> {label}
      </span>
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Email / SMTP Settings"
        description="Used for app notifications, alerts, and status updates. Login OTP and password reset stay on the managed auth pipeline."
      />
      <div className="p-8 space-y-6 max-w-3xl">
        <Card className="p-6 space-y-5 shadow-elev-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Connection</div>
              <div className="text-xs text-muted-foreground">
                {lastVerifiedAt ? `Last verified ${new Date(lastVerifiedAt).toLocaleString()}` : "Not verified yet"}
                {lastError ? ` · ${lastError}` : ""}
              </div>
              {lastRawResponse ? <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">Raw SMTP response: {lastRawResponse}</div> : null}
            </div>
            <StatusBadge />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>SMTP Provider</Label>
              <Select value={form.provider} onValueChange={applyPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hostinger">Hostinger</SelectItem>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="outlook">Outlook / Microsoft 365</SelectItem>
                  <SelectItem value="brevo">Brevo</SelectItem>
                  <SelectItem value="custom">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Encryption</Label>
              <Select value={form.encryption} onValueChange={(v) => setForm({ ...form, encryption: v as Form["encryption"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssl">SSL</SelectItem>
                  <SelectItem value="tls">TLS / STARTTLS</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Host</Label>
              <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.hostinger.com" />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Port</Label>
              <Input type="number" min={1} max={65535} value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="support@dms.futurelinkconsultants.com" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={hasPassword ? "•••••••• (saved — leave blank to keep)" : "Enter password"}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sender Email</Label>
              <Input value={form.sender_email} onChange={(e) => setForm({ ...form, sender_email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Sender Name</Label>
              <Input value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Reply-To Email (optional)</Label>
              <Input value={form.reply_to} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Test Recipient</Label>
              <Input value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder={form.sender_email} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <div className="text-sm">
                <div className="font-medium">Active</div>
                <div className="text-xs text-muted-foreground">When off, app emails are not sent over SMTP.</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onVerify} disabled={busy !== null || (!hasPassword && !form.password)} title={!hasPassword && !form.password ? "Save settings with a password first" : undefined}>
                {busy === "verify" ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <ShieldCheck className="size-4 mr-1.5" />}
                Verify connection
              </Button>
              <Button variant="outline" onClick={onTest} disabled={busy !== null || (!hasPassword && !form.password)} title={!hasPassword && !form.password ? "Save settings with a password first" : undefined}>
                {busy === "test" ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
                Send test email
              </Button>
              <Button onClick={onSave} disabled={busy !== null} className="gradient-brand text-primary-foreground">
                {busy === "save" ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <RefreshCw className="size-4 mr-1.5" />}
                Save settings
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-elev-sm text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground text-sm">What this powers</div>
          <div>Workflow notifications · Client status updates · Counselor / documentation / telecaller alerts · Campaign notifications · Admin reports · Portal notifications.</div>
          <div className="pt-2"><strong className="text-foreground">Auth emails (login OTP, password reset, email verification, invite verification)</strong> continue to use the managed authentication pipeline and are not affected by this configuration.</div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default EmailSmtpSettings;