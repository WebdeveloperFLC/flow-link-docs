import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Plug, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type Mode = "off" | "pull" | "push" | "two_way";

interface Settings {
  enabled: boolean;
  mode: Mode;
  auto_on_open: boolean;
  interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
}

export const OdooIntegrationCard = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("integration_settings").select("*").eq("key", "odoo").maybeSingle();
    if (data) setS(data as unknown as Settings);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (patch: Partial<Settings>) => {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    setSaving(true);
    const { error } = await supabase
      .from("integration_settings")
      .update(patch)
      .eq("key", "odoo");
    setSaving(false);
    if (error) { toast.error(error.message); load(); }
    else toast.success("Saved");
  };

  const test = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("odoo-sync", { body: { action: "test" } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Test failed");
      toast.success(`Connected · uid ${data.uid}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
    } finally { setTesting(false); }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("odoo-sync", { body: { action: "sync_all" } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Sync failed");
      toast.success(`Synced · pulled ${data.pulled ?? 0}, pushed ${data.pushed ?? 0}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally { setSyncing(false); }
  };

  if (loading || !s) {
    return <Card className="p-5 shadow-elev-sm"><Loader2 className="size-4 animate-spin text-muted-foreground" /></Card>;
  }

  return (
    <Card className="p-5 shadow-elev-sm space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2"><Plug className="size-4 text-primary" />Odoo CRM sync</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Two-way sync with your Odoo CRM Pipeline. Stays automated until you change the settings.
          </p>
        </div>
        <Switch checked={s.enabled} onCheckedChange={(v) => save({ enabled: v })} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Sync mode</Label>
        <RadioGroup
          value={s.mode}
          onValueChange={(v) => save({ mode: v as Mode })}
          className="grid grid-cols-2 gap-2"
        >
          {[
            { v: "off", label: "Off", desc: "No automatic sync" },
            { v: "pull", label: "Pull only", desc: "Odoo → Fovel" },
            { v: "push", label: "Push only", desc: "Fovel → Odoo" },
            { v: "two_way", label: "Two-way", desc: "Both directions" },
          ].map((o) => (
            <Label
              key={o.v}
              htmlFor={`mode-${o.v}`}
              className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40 ${s.mode === o.v ? "border-primary bg-primary/5" : ""}`}
            >
              <RadioGroupItem value={o.v} id={`mode-${o.v}`} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">{o.label}</div>
                <div className="text-[11px] text-muted-foreground">{o.desc}</div>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Auto-sync on client open</div>
            <div className="text-[11px] text-muted-foreground">Sync this client when its page loads</div>
          </div>
          <Switch checked={s.auto_on_open} onCheckedChange={(v) => save({ auto_on_open: v })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Background interval (minutes, 0 = off)</Label>
          <Input
            type="number" min={0} max={1440}
            value={s.interval_minutes}
            onChange={(e) => setS({ ...s, interval_minutes: Number(e.target.value) || 0 })}
            onBlur={() => save({ interval_minutes: s.interval_minutes })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={test} disabled={testing}>
          {testing ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Plug className="size-3.5 mr-1.5" />}
          Test connection
        </Button>
        <Button onClick={syncNow} disabled={syncing || !s.enabled} className="gradient-brand text-primary-foreground">
          {syncing ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="size-3.5 mr-1.5" />}
          Sync now
        </Button>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>

      <div className={`text-xs border-t pt-3 flex items-start gap-2 ${
        s.last_sync_status === "error" || s.last_sync_status === "partial"
          ? "text-destructive"
          : "text-muted-foreground"
      }`}>
        {s.last_sync_status === "ok" ? (
          <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
        ) : s.last_sync_status === "error" || s.last_sync_status === "partial" ? (
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div>
            Last sync: {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : "never"}
            {s.last_sync_status && (
              <span className="ml-2 uppercase font-semibold tracking-wide">
                · {s.last_sync_status}
              </span>
            )}
          </div>
          {s.last_sync_message && (
            <pre className="font-mono whitespace-pre-wrap break-words mt-1 text-[11px] leading-relaxed">
              {s.last_sync_message}
            </pre>
          )}
          {(s.last_sync_status === "error" || s.last_sync_status === "partial") && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Tip: most failures are caused by the Odoo user behind <code>ODOO_API_KEY</code> not having access to the <code>crm.lead</code> model, or the CRM module not being installed. Open the message above for the exact reason.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default OdooIntegrationCard;