import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DURATION_OPTIONS, BUFFER_OPTIONS } from "../lib/calendarTypes";
import { useMeetingTypes, useSaveMeetingType, useDeleteMeetingType } from "../hooks/useCalendarData";

export function MeetingTypesEditor() {
  const { data: types = [] } = useMeetingTypes();
  const save = useSaveMeetingType();
  const del = useDeleteMeetingType();

  const add = async () => {
    try {
      await save.mutateAsync({ meeting_name: "New meeting type", slot_duration_minutes: 30, buffer_minutes: 0, is_active: true } as any);
    } catch (e: any) { toast.error(e.message); }
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
          <div key={mt.id} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0">
            <Input className="w-48" defaultValue={mt.meeting_name} onBlur={(e) => save.mutate({ ...mt, meeting_name: e.target.value } as any)} />
            <Select value={String(mt.slot_duration_minutes)} onValueChange={(v) => save.mutate({ ...mt, slot_duration_minutes: Number(v) } as any)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{DURATION_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(mt.buffer_minutes)} onValueChange={(v) => save.mutate({ ...mt, buffer_minutes: Number(v) } as any)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Buffer" /></SelectTrigger>
              <SelectContent>{BUFFER_OPTIONS.map((b) => <SelectItem key={b} value={String(b)}>Buffer {b}m</SelectItem>)}</SelectContent>
            </Select>
            <Input className="w-28" type="color" defaultValue={mt.color_code ?? "#3b82f6"} onBlur={(e) => save.mutate({ ...mt, color_code: e.target.value } as any)} />
            <Switch checked={mt.is_active} onCheckedChange={(v) => save.mutate({ ...mt, is_active: v } as any)} />
            <Button size="icon" variant="ghost" onClick={() => del.mutate(mt.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}