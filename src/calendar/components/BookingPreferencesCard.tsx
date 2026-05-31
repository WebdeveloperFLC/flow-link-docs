import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCalendarProfile, useUpsertProfile } from "../hooks/useCalendarData";
import { toast } from "sonner";

function Row({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function BookingPreferencesCard() {
  const { data: profile } = useCalendarProfile();
  const upsert = useUpsertProfile();
  if (!profile) return null;

  const update = async (patch: Record<string, boolean>) => {
    try {
      await upsert.mutateAsync(patch as any);
      toast.success("Preferences updated");
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Booking preferences</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        <Row label="Booking enabled" hint="Visitors can book your calendar." checked={profile.is_active} onChange={(v) => update({ is_active: v })} />
        <Row label="Auto-confirm bookings" hint="Skip pending state and confirm immediately." checked={profile.auto_confirm} onChange={(v) => update({ auto_confirm: v })} />
        <Row label="Require approval" hint="New bookings stay in pending until you confirm." checked={profile.require_approval} onChange={(v) => update({ require_approval: v })} />
        <Row label="Allow rescheduling" checked={profile.allow_reschedule} onChange={(v) => update({ allow_reschedule: v })} />
        <Row label="Allow cancellation" checked={profile.allow_cancellation} onChange={(v) => update({ allow_cancellation: v })} />
      </CardContent>
    </Card>
  );
}