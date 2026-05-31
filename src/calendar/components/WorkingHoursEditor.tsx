import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { WEEKDAYS } from "../lib/calendarTypes";
import { useAvailability, useSaveAvailability, useDeleteAvailability } from "../hooks/useCalendarData";

export function WorkingHoursEditor() {
  const { data: rows = [] } = useAvailability();
  const save = useSaveAvailability();
  const del = useDeleteAvailability();

  const byDay = (d: number) => rows.filter((r) => r.day_of_week === d);

  const add = async (d: number) => {
    try {
      await save.mutateAsync({ day_of_week: d, start_time: "09:00", end_time: "17:00", is_active: true });
    } catch (e: any) { toast.error(e.message); }
  };

  const update = async (id: string, day: number, patch: Partial<{ start_time: string; end_time: string; is_active: boolean }>) => {
    try {
      await save.mutateAsync({ id, day_of_week: day, start_time: patch.start_time as any, end_time: patch.end_time as any, is_active: patch.is_active as any });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Working hours</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {WEEKDAYS.map((d) => {
          const dayRows = byDay(d.value);
          return (
            <div key={d.value} className="flex flex-col sm:flex-row sm:items-start gap-3 py-2 border-b last:border-0">
              <div className="w-28 font-medium text-sm pt-2">{d.label}</div>
              <div className="flex-1 space-y-2">
                {dayRows.length === 0 && <div className="text-xs text-muted-foreground py-2">Unavailable</div>}
                {dayRows.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Input
                      type="time"
                      defaultValue={r.start_time.slice(0, 5)}
                      onBlur={(e) => update(r.id, d.value, { start_time: e.target.value, end_time: r.end_time.slice(0, 5), is_active: r.is_active })}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      defaultValue={r.end_time.slice(0, 5)}
                      onBlur={(e) => update(r.id, d.value, { start_time: r.start_time.slice(0, 5), end_time: e.target.value, is_active: r.is_active })}
                      className="w-32"
                    />
                    <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, d.value, { start_time: r.start_time.slice(0,5), end_time: r.end_time.slice(0,5), is_active: v })} />
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => add(d.value)}>
                <Plus className="size-4 mr-1" /> Block
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}