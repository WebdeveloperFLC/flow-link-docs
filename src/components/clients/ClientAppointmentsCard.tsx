import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Check, MapPin, Phone, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Appt = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_min: number;
  mode: string;
  status: string;
  notes: string | null;
  created_at: string;
};

const MODE_ICON: Record<string, typeof Video> = {
  video: Video,
  phone: Phone,
  in_person: MapPin,
};

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function ClientAppointmentsCard({
  clientId,
  canEdit,
  onPendingCountChange,
}: {
  clientId: string;
  canEdit: boolean;
  onPendingCountChange?: (count: number) => void;
}) {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("client_appointments")
      .select("id,title,scheduled_at,duration_min,mode,status,notes,created_at")
      .eq("client_id", clientId)
      .order("scheduled_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = (data ?? []) as Appt[];
    setAppts(rows);
    onPendingCountChange?.(rows.filter((a) => a.status === "requested").length);
  }, [clientId, onPendingCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: "confirmed" | "cancelled" | "completed") => {
    setBusyId(id);
    const { error } = await supabase.from("client_appointments").update({ status }).eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "confirmed" ? "Appointment confirmed" : status === "cancelled" ? "Appointment cancelled" : "Marked completed");
    load();
  };

  const pending = appts.filter((a) => a.status === "requested");

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <h3 className="font-semibold">Portal appointments</h3>
          {pending.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200">
              {pending.length} pending
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Requests from the client portal appear here
        </p>
      </div>

      {appts.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No appointment requests yet.
        </div>
      ) : (
        <div className="divide-y">
          {appts.map((a) => {
            const Icon = MODE_ICON[a.mode] ?? Video;
            return (
              <div key={a.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <Icon className="size-5 text-primary shrink-0 hidden sm:block" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(a.scheduled_at).toLocaleString()} · {a.duration_min} min ·{" "}
                    {a.mode.replace("_", " ")}
                  </div>
                  {a.notes && <p className="text-xs mt-1 text-muted-foreground">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-[10px] uppercase font-semibold px-2 py-0.5 rounded",
                      STATUS_STYLE[a.status] ?? STATUS_STYLE.requested,
                    )}
                  >
                    {a.status}
                  </span>
                  {canEdit && a.status === "requested" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === a.id}
                        onClick={() => setStatus(a.id, "confirmed")}
                      >
                        <Check className="size-3.5 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        disabled={busyId === a.id}
                        onClick={() => setStatus(a.id, "cancelled")}
                        aria-label="Decline appointment"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </>
                  )}
                  {canEdit && a.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === a.id}
                      onClick={() => setStatus(a.id, "completed")}
                    >
                      Mark done
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
