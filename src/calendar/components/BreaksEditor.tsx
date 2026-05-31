import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { WEEKDAYS } from "../lib/calendarTypes";
import { useBreaks, useSaveBreak, useDeleteBreak } from "../hooks/useCalendarData";

export function BreaksEditor() {
  const { data: breaks = [] } = useBreaks();
  const save = useSaveBreak();
  const del = useDeleteBreak();

  const add = async () => {
    try {
      await save.mutateAsync({ day_of_week: 1, start_time: "13:00", end_time: "14:00", name: "Lunch break", is_active: true } as any);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Breaks</CardTitle>
        <Button size="sm" variant="outline" onClick={add}><Plus className="size-4 mr-1" /> Add break</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {breaks.length === 0 && (
          <div className="text-sm text-muted-foreground py-3 text-center">
            No breaks configured. Lunch, tea, or recurring team blocks go here.
          </div>
        )}
        {breaks.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0">
            <Input
              className="w-40"
              defaultValue={b.name ?? ""}
              placeholder="Break name"
              onBlur={(e) => save.mutate({ ...b, name: e.target.value } as any)}
            />
            <Select
              value={String(b.day_of_week)}
              onValueChange={(v) => save.mutate({ ...b, day_of_week: Number(v) } as any)}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="time" className="w-32" defaultValue={b.start_time.slice(0, 5)} onBlur={(e) => save.mutate({ ...b, start_time: e.target.value } as any)} />
            <span className="text-muted-foreground">to</span>
            <Input type="time" className="w-32" defaultValue={b.end_time.slice(0, 5)} onBlur={(e) => save.mutate({ ...b, end_time: e.target.value } as any)} />
            <Button size="icon" variant="ghost" onClick={() => del.mutate(b.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}