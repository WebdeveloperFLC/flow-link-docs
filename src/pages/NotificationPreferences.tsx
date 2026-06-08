import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isPushSupported, isPushEnabled, setPushEnabled, requestPushPermission } from "@/lib/browserPush";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "direct_message", label: "Direct messages" },
  { key: "team_message", label: "Team channel messages" },
  { key: "client_team_message", label: "Client team notes (internal)" },
  { key: "mention", label: "Chat @mentions" },
  { key: "portal_message", label: "Portal messages (from client)" },
  { key: "payment_received", label: "Payments received" },
  { key: "payment_verified", label: "Payments verified" },
  { key: "receipt_generated", label: "Receipts generated" },
  { key: "new_task_assigned", label: "New tasks assigned" },
  { key: "urgent_review_required", label: "Urgent reviews" },
  { key: "client_assigned", label: "Client assignments" },
  { key: "document_uploaded", label: "Document uploads" },
  { key: "info", label: "Informational / digest" },
];

const SOUND_PREF_KEY = "notif:sound_enabled";

interface Prefs {
  muted_categories: string[];
  push_enabled: boolean;
  sound_enabled: boolean;
  digest_frequency: "off" | "daily" | "weekly";
  escalation_alerts: boolean;
  timezone: string;
}

const DEFAULTS: Prefs = {
  muted_categories: [],
  push_enabled: false,
  sound_enabled: true,
  digest_frequency: "off",
  escalation_alerts: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
};

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_notification_prefs").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        const row = data as Record<string, unknown>;
        setPrefs({
          muted_categories: (row.muted_categories as string[]) ?? [],
          push_enabled: !!(row.push_enabled ?? row.browser_push_enabled),
          sound_enabled: row.sound_enabled !== false,
          digest_frequency: ((row.digest_frequency as string) ?? "off") as Prefs["digest_frequency"],
          escalation_alerts: row.escalation_alerts !== false,
          timezone: (row.timezone as string) ?? DEFAULTS.timezone,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const toggleCat = (k: string, on: boolean) => {
    setPrefs((p) => ({
      ...p,
      muted_categories: on ? p.muted_categories.filter((c) => c !== k) : Array.from(new Set([...p.muted_categories, k])),
    }));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("user_notification_prefs").upsert({
      user_id: user.id,
      muted_categories: prefs.muted_categories,
      push_enabled: prefs.push_enabled,
      browser_push_enabled: prefs.push_enabled,
      sound_enabled: prefs.sound_enabled,
      digest_frequency: prefs.digest_frequency,
      escalation_alerts: prefs.escalation_alerts,
      timezone: prefs.timezone,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    // mirror sound pref to localStorage so NotificationCenter respects it
    try { localStorage.setItem(SOUND_PREF_KEY, JSON.stringify(prefs.sound_enabled)); } catch {}
    toast.success("Preferences saved");
  };

  const requestPush = async () => {
    const granted = await requestPushPermission();
    if (granted) {
      setPushEnabled(true);
      setPrefs((p) => ({ ...p, push_enabled: true }));
      toast.success("Push notifications enabled");
    } else {
      toast.error("Permission denied or unsupported");
    }
  };

  if (loading) return <AppLayout><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader title="Notification preferences" description="Control which alerts you receive and how" />
      <div className="p-6 max-w-2xl space-y-6">
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold">Channels</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label>Sound alerts</Label>
              <p className="text-xs text-muted-foreground">Play a chime for high-priority notifications.</p>
            </div>
            <Switch checked={prefs.sound_enabled} onCheckedChange={(v) => setPrefs((p) => ({ ...p, sound_enabled: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Browser push</Label>
              <p className="text-xs text-muted-foreground">Show desktop notifications when the tab is in the background.</p>
            </div>
            {prefs.push_enabled ? (
              <Switch
                checked={isPushEnabled()}
                onCheckedChange={(v) => { setPushEnabled(v); setPrefs((p) => ({ ...p, push_enabled: v })); }}
              />
            ) : (
              <Button size="sm" variant="outline" onClick={requestPush} disabled={!isPushSupported()}>
                {isPushSupported() ? "Enable" : "Unsupported"}
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Escalation alerts</Label>
              <p className="text-xs text-muted-foreground">Receive escalations when overdue items reach you.</p>
            </div>
            <Switch checked={prefs.escalation_alerts} onCheckedChange={(v) => setPrefs((p) => ({ ...p, escalation_alerts: v }))} />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-semibold">Digest</h3>
          <div className="flex items-center justify-between gap-3">
            <Label>Frequency</Label>
            <Select value={prefs.digest_frequency} onValueChange={(v) => setPrefs((p) => ({ ...p, digest_frequency: v as Prefs["digest_frequency"] }))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="daily">Daily (8am)</SelectItem>
                <SelectItem value="weekly">Weekly (Mon 8am)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label>Timezone</Label>
            <code className="text-xs text-muted-foreground">{prefs.timezone}</code>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-semibold">Mute categories</h3>
          <p className="text-xs text-muted-foreground">Disabled categories still appear in the bell history but no toast/sound/push.</p>
          {CATEGORIES.map((c) => {
            const on = !prefs.muted_categories.includes(c.key);
            return (
              <div key={c.key} className="flex items-center justify-between py-1">
                <Label className="font-normal">{c.label}</Label>
                <Switch checked={on} onCheckedChange={(v) => toggleCat(c.key, v)} />
              </div>
            );
          })}
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</Button>
        </div>
      </div>
    </AppLayout>
  );
}