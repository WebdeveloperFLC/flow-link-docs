import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUnavailableDates, useAddUnavailableDate, useDeleteUnavailableDate } from "../hooks/useCalendarData";
import { format } from "date-fns";

export function UnavailableDatesEditor() {
  const { data: rows = [] } = useUnavailableDates();
  const add = useAddUnavailableDate();
  const del = useDeleteUnavailableDate();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Blocked dates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Reason</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Vacation, training, holiday…" />
          </div>
          <Button
            onClick={async () => {
              if (!date) return toast.error("Pick a date");
              try {
                await add.mutateAsync({ unavailable_date: date, reason: reason || null });
                setDate(""); setReason("");
              } catch (e: any) { toast.error(e.message); }
            }}
          >Add</Button>
        </div>
        <div className="text-xs text-muted-foreground">Partial-day blocking coming soon — all entries are full-day for now.</div>
        <div className="divide-y">
          {rows.length === 0 && <div className="text-sm text-muted-foreground py-3 text-center">No blocked dates.</div>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium text-sm">{format(new Date(r.unavailable_date), "EEE, MMM d, yyyy")}</div>
                <div className="text-xs text-muted-foreground">{r.reason || "—"}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}