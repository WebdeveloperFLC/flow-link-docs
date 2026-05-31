import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { DURATION_OPTIONS, BUFFER_OPTIONS } from "../lib/calendarTypes";
import { useMeetingTypes, useSaveMeetingType, useDeleteMeetingType } from "../hooks/useCalendarData";
import { useCalendarProfile } from "../hooks/useCalendarData";
import { useAuth } from "@/contexts/AuthContext";
import { slugify, suggestMeetingSlug, buildBookingUrl } from "../lib/slugUtils";

export function MeetingTypesEditor() {
  const { user } = useAuth();
  const { data: profile } = useCalendarProfile();
  const { data: types = [] } = useMeetingTypes();
  const save = useSaveMeetingType();
  const del = useDeleteMeetingType();

  const add = async () => {
    if (!user) return;
    try {
      const slug = await suggestMeetingSlug(user.id, "new-meeting");
      await save.mutateAsync({
        meeting_name: "New meeting type",
        slug,
        slot_duration_minutes: 30,
        buffer_minutes: 0,
        is_active: true,
        category: "Consultation",
        booking_window_days: 30,
        reservation_ttl_minutes: 10,
        requires_approval: false,
      } as any);
    } catch (e: any) { toast.error(e.message); }
  };

  const safeSave = (mt: any, patch: any) => {
    const merged = { ...mt, ...patch };
    let slug = slugify(merged.slug || mt.slug || merged.meeting_name || "meeting");
    if (!slug) slug = "meeting";
    save.mutate({ ...merged, slug } as any);
  };

  const copyLink = (mt: any) => {
    if (!profile?.booking_slug) return toast.error("Save your booking slug in Profile first");
    navigator.clipboard.writeText(buildBookingUrl(profile.booking_slug, mt.slug));
    toast.success("Link copied");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Meeting types</CardTitle>
        <Button size="sm" variant="outline" onClick={add}><Plus className="size-4 mr-1" /> Add</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {types.length === 0 && <div className="text-sm text-muted-foreground py-3 text-center">No meeting types yet.</div>}
        {types.map((mt) => (
          <div key={mt.id} className="space-y-2 border-b pb-3 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <Input className="w-48" defaultValue={mt.meeting_name} onBlur={(e) => safeSave(mt, { meeting_name: e.target.value })} placeholder="Name" />
              <Input className="w-40" defaultValue={mt.slug} onBlur={(e) => safeSave(mt, { slug: e.target.value })} placeholder="slug" />
              <Select value={String(mt.slot_duration_minutes)} onValueChange={(v) => safeSave(mt, { slot_duration_minutes: Number(v) })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{DURATION_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(mt.buffer_minutes)} onValueChange={(v) => safeSave(mt, { buffer_minutes: Number(v) })}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Buffer" /></SelectTrigger>
                <SelectContent>{BUFFER_OPTIONS.map((b) => <SelectItem key={b} value={String(b)}>Buffer {b}m</SelectItem>)}</SelectContent>
              </Select>
              <Input className="w-20" type="color" defaultValue={mt.color_code ?? "#3b82f6"} onBlur={(e) => safeSave(mt, { color_code: e.target.value })} />
              <Switch checked={mt.is_active} onCheckedChange={(v) => safeSave(mt, { is_active: v })} />
              <Button size="icon" variant="ghost" onClick={() => del.mutate(mt.id)}><Trash2 className="size-4" /></Button>
            </div>
            {profile?.booking_slug && mt.slug && (
              <div className="flex items-center gap-2 text-xs">
                <code className="px-2 py-1 bg-muted rounded truncate flex-1">/book/{profile.booking_slug}/{mt.slug}</code>
                <Button size="sm" variant="ghost" onClick={() => copyLink(mt)}><Copy className="h-3 w-3" /></Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}