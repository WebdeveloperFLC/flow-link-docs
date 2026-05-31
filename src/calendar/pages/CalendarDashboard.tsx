import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  Settings as SettingsIcon, ChevronLeft, ChevronRight, Plus, Filter, Search,
} from "lucide-react";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalendarProfile } from "../hooks/useCalendarData";
import { useAppointmentsRange } from "../hooks/useAppointments";
import { AppointmentDialog } from "../components/AppointmentDialog";
import { DayView } from "../components/views/DayView";
import { WeekView } from "../components/views/WeekView";
import { MonthView } from "../components/views/MonthView";
import { AgendaView } from "../components/views/AgendaView";
import { StatCard } from "@/components/ui/stat-card";
import { Calendar, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { APPOINTMENT_TYPES, STATUS_LABEL, type CalendarEventStatus } from "../lib/calendarTypes";

type ViewMode = "day" | "week" | "month" | "agenda";

export default function CalendarDashboard() {
  const { data: profile, isLoading } = useCalendarProfile();
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CalendarEventStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [open, setOpen] = useState(false);

  // Mobile default to agenda
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setView("agenda");
    }
  }, []);

  const { from, to } = useMemo(() => {
    if (view === "day") return { from: format(anchor, "yyyy-MM-dd"), to: format(anchor, "yyyy-MM-dd") };
    if (view === "week") {
      return {
        from: format(startOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    }
    if (view === "month") {
      return {
        from: format(startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    }
    // agenda: 60 days from anchor
    return { from: format(anchor, "yyyy-MM-dd"), to: format(addDays(anchor, 60), "yyyy-MM-dd") };
  }, [view, anchor]);

  const { data: events = [] } = useAppointmentsRange(from, to, {
    search,
    status: statusFilter.length ? statusFilter : undefined,
    appointmentType: typeFilter || null,
  });

  // Stats over fetched range
  const today = format(new Date(), "yyyy-MM-dd");
  const stats = useMemo(() => ({
    today: events.filter((e) => e.event_date === today && e.status !== "cancelled").length,
    upcoming: events.filter((e) => e.event_date >= today && ["pending", "scheduled"].includes(e.status)).length,
    pending: events.filter((e) => e.status === "pending").length,
    completed: events.filter((e) => e.status === "completed").length,
    cancelled: events.filter((e) => ["cancelled", "no_show", "declined"].includes(e.status)).length,
  }), [events, today]);

  const move = (dir: -1 | 1) => {
    if (view === "day" || view === "agenda") setAnchor((d) => addDays(d, dir));
    else if (view === "week") setAnchor((d) => (dir < 0 ? subWeeks(d, 1) : addWeeks(d, 1)));
    else if (view === "month") setAnchor((d) => (dir < 0 ? subMonths(d, 1) : addMonths(d, 1)));
  };

  const toggleStatus = (s: CalendarEventStatus) =>
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const rangeLabel = view === "month"
    ? format(anchor, "MMMM yyyy")
    : view === "week"
    ? `${format(startOfWeek(anchor, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(anchor, { weekStartsOn: 1 }), "MMM d, yyyy")}`
    : format(anchor, "EEEE, MMM d, yyyy");

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Calendar"
          description="Internal scheduling and appointment management."
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/calendar/settings"><SettingsIcon className="size-4 mr-1.5" /> Settings</Link>
              </Button>
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-4 mr-1.5" /> New appointment
              </Button>
            </div>
          }
        />

        {!isLoading && !profile && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">You haven't set up your booking profile yet.</p>
            <Button asChild><Link to="/calendar/settings">Set up calendar</Link></Button>
          </div>
        )}

        {profile && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Today" value={stats.today} icon={Calendar} />
              <StatCard label="Upcoming" value={stats.upcoming} icon={Clock} />
              <StatCard label="Pending" value={stats.pending} icon={AlertCircle} />
              <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} />
              <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-1.5">
                <Button size="icon" variant="outline" onClick={() => move(-1)}><ChevronLeft className="size-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => setAnchor(new Date())}>Today</Button>
                <Button size="icon" variant="outline" onClick={() => move(1)}><ChevronRight className="size-4" /></Button>
                <div className="ml-2 text-sm font-medium">{rangeLabel}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="size-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input className="pl-7 h-9 w-48" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Filter className="size-4 mr-1.5" /> Filters
                      {(statusFilter.length || typeFilter) ? <span className="ml-1 text-xs">({statusFilter.length + (typeFilter ? 1 : 0)})</span> : null}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 space-y-3">
                    <div>
                      <div className="text-xs font-medium mb-1.5">Status</div>
                      <div className="flex flex-wrap gap-1">
                        {(Object.keys(STATUS_LABEL) as CalendarEventStatus[]).map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant={statusFilter.includes(s) ? "default" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => toggleStatus(s)}
                          >
                            {STATUS_LABEL[s]}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium mb-1.5">Type</div>
                      <Select value={typeFilter || "__all"} onValueChange={(v) => setTypeFilter(v === "__all" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all">Any</SelectItem>
                          {APPOINTMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full" onClick={() => { setStatusFilter([]); setTypeFilter(""); }}>
                      Clear filters
                    </Button>
                  </PopoverContent>
                </Popover>
                <div className="flex rounded-md border overflow-hidden">
                  {(["day", "week", "month", "agenda"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-2.5 py-1 text-xs capitalize ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {view === "day" && <DayView date={format(anchor, "yyyy-MM-dd")} events={events} />}
            {view === "week" && <WeekView anchorDate={format(anchor, "yyyy-MM-dd")} events={events} />}
            {view === "month" && (
              <MonthView
                anchorDate={format(anchor, "yyyy-MM-dd")}
                events={events}
                onDayClick={(d) => { setAnchor(new Date(d)); setView("day"); }}
              />
            )}
            {view === "agenda" && <AgendaView events={events} />}
          </>
        )}

        <AppointmentDialog
          open={open}
          onOpenChange={setOpen}
          initialDate={format(anchor, "yyyy-MM-dd")}
        />
      </div>
    </AppLayout>
  );
}