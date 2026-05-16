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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, KeyRound, Copy, Check, AlertTriangle, Mail, ChevronRight, Server, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { FirmProfileCard } from "@/components/settings/FirmProfileCard";
import { OdooIntegrationCard } from "@/components/settings/OdooIntegrationCard";
import { Link } from "react-router-dom";

interface ApiKey {
  id: string; label: string; prefix: string; revoked: boolean;
  last_used_at: string | null; created_at: string;
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const generateKey = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const raw = btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, "");
  return `flk_${raw.slice(0, 40)}`;
};

const Settings = () => {
  const { isAdmin, loading } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const odooEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/odoo-api`;

  const load = async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("id,label,prefix,revoked,last_used_at,created_at")
      .order("created_at", { ascending: false });
    setKeys((data ?? []) as ApiKey[]);
  };
  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const create = async () => {
    if (!label.trim()) { toast.error("Label is required"); return; }
    try {
      const raw = generateKey();
      const hash = await sha256Hex(raw);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("api_keys").insert({
        label: label.trim(),
        key_hash: hash,
        prefix: raw.slice(0, 8),
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      await logActivity("api_key.created", "api_key", undefined, { label: label.trim() });
      setNewKey(raw);
      setLabel("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create key");
    }
  };

  const revoke = async (k: ApiKey) => {
    if (!confirm(`Revoke "${k.label}"? Odoo will lose access immediately.`)) return;
    const { error } = await supabase.from("api_keys").update({ revoked: true }).eq("id", k.id);
    if (error) toast.error(error.message);
    else { toast.success("Revoked"); load(); }
  };

  const copy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="API keys for Odoo CRM and other integrations."
        actions={
          <Button onClick={() => setCreating(true)} className="gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-1.5" />New API key
          </Button>
        }
      />
      <div className="p-8 space-y-6 max-w-4xl">
        <FirmProfileCard />

        <div className="pt-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Questionnaire sharing
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customise the email your clients receive when you share a visa questionnaire.
          </p>
        </div>
        <Link
          to="/settings/questionnaire-emails"
          className="block transition-colors"
        >
          <Card className="p-5 shadow-elev-sm flex items-center gap-3 hover:bg-muted/40">
            <Mail className="size-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Questionnaire email templates</div>
              <div className="text-xs text-muted-foreground">
                Manage reusable subject lines and email bodies. Each visa form picks one of these as its sharing email.
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>

        <div className="pt-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Outbound app email · SMTP
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure the SMTP server used for app notifications, alerts, and status updates. Auth emails (login OTP, password reset) keep using the managed pipeline.
          </p>
        </div>
        <Link to="/settings/email-smtp" className="block transition-colors">
          <Card className="p-5 shadow-elev-sm flex items-center gap-3 hover:bg-muted/40">
            <Server className="size-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Email / SMTP settings</div>
              <div className="text-xs text-muted-foreground">Hostinger, Gmail, Outlook, Brevo, or custom. Verify connection and send test emails.</div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>
        <Link to="/settings/email-logs" className="block transition-colors">
          <Card className="p-5 shadow-elev-sm flex items-center gap-3 hover:bg-muted/40">
            <ListChecks className="size-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Email logs</div>
              <div className="text-xs text-muted-foreground">Recipient, subject, status, attempts, error, retry button.</div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>

        <div className="pt-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Outbound integration · Fovel → Odoo
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fovel pushes and pulls clients with your Odoo CRM Pipeline using the credentials saved on the server.
          </p>
        </div>
        <OdooIntegrationCard />

        <div className="pt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Inbound API access · Odoo (or any system) → Fovel
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Optional. Only needed if Odoo, Zapier, or another tool needs to <em>read</em> data from Fovel.
            The two-way CRM sync above does <strong>not</strong> require a key here.
          </p>
        </div>
        <Card className="p-5 shadow-elev-sm">
          <div className="font-semibold mb-1 flex items-center gap-2"><KeyRound className="size-4 text-primary" />Odoo CRM endpoint</div>
          <p className="text-xs text-muted-foreground mb-3">Send requests with header <code className="text-[11px] bg-muted px-1 py-0.5 rounded">x-api-key: &lt;your key&gt;</code></p>
          <Input value={odooEndpoint} readOnly className="font-mono text-xs" onFocus={(e) => e.target.select()} />
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <div><span className="font-mono text-foreground">GET /clients?status=&country=&limit=</span> — list clients</div>
            <div><span className="font-mono text-foreground">GET /clients/:id</span> — client + documents + binders</div>
          </div>
        </Card>

        <Card className="overflow-hidden shadow-elev-sm">
          <div className="px-6 py-4 border-b">
            <div className="font-semibold">Inbound API keys (optional)</div>
            <div className="text-xs text-muted-foreground">
              Generate a key only if an external system needs to call the endpoint above. Keys are hashed; the full value is shown only once at creation.
            </div>
          </div>
          <div className="divide-y">
            {keys.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No API keys yet. <span className="block text-xs mt-1">This is fine if you only use the two-way CRM sync above.</span>
              </div>
            )}
            {keys.map((k) => (
              <div key={k.id} className="px-6 py-3 flex items-center gap-3">
                <KeyRound className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    {k.label}
                    {k.revoked && <span className="text-[10px] uppercase font-semibold text-destructive">Revoked</span>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{k.prefix}…  ·  Last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</div>
                </div>
                {!k.revoked && (
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => revoke(k)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={creating} onOpenChange={(o) => { setCreating(o); if (!o) setNewKey(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{newKey ? "Save your API key" : "New API key"}</DialogTitle>
          </DialogHeader>
          {!newKey ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Odoo Production" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                <Button onClick={create} className="gradient-brand text-primary-foreground">Generate</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded bg-secondary/10 text-secondary text-xs">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>Copy this key now — it cannot be shown again.</span>
              </div>
              <div className="flex gap-2">
                <Input value={newKey} readOnly className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                <Button onClick={copy} variant="outline" size="icon">
                  {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreating(false); setNewKey(null); }}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Settings;