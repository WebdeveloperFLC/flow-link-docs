import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Profile = {
  full_name: string;
  designation?: string | null;
  company_name?: string | null;
  profile_photo?: string | null;
  company_logo?: string | null;
  short_bio?: string | null;
  timezone?: string | null;
};

type MeetingType = {
  id: string;
  meeting_name: string;
  slug?: string;
  description?: string | null;
  slot_duration_minutes: number;
  buffer_minutes: number;
  color_code?: string | null;
  booking_window_days?: number | null;
  requires_approval?: boolean | null;
  category?: string | null;
  is_active?: boolean;
};

async function callFn(body: any) {
  const { data, error } = await supabase.functions.invoke("calendar-public-booking", { body });
  if (error) throw error;
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  return data;
}

export default function PublicBookingPage() {
  const { slug, meetingSlug } = useParams<{ slug: string; meetingSlug?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const data = await callFn({ action: "resolve_profile", slug });
        if (!data) { setNotFound(true); return; }
        setProfile(data.profile ?? data);
        setMeetingTypes(((data.meeting_types ?? data.types ?? []) as MeetingType[]));
      } catch {
        // Fallback to direct table read (for slug history redirect)
        const { data: prof } = await (supabase as any)
          .from("calendar_profiles").select("*").eq("booking_slug", slug).eq("is_active", true).maybeSingle();
        if (!prof) {
          const { data: hist } = await (supabase as any)
            .from("calendar_slug_history").select("new_slug")
            .eq("scope","profile").eq("old_slug", slug)
            .order("changed_at",{ascending:false}).limit(1).maybeSingle();
          if (hist?.new_slug) { navigate(`/book/${hist.new_slug}${meetingSlug?"/"+meetingSlug:""}`,{replace:true}); return; }
          setNotFound(true); return;
        }
        setProfile(prof);
        const { data: mts } = await (supabase as any)
          .from("calendar_meeting_types").select("*").eq("user_id", prof.user_id).eq("is_active", true);
        setMeetingTypes(mts ?? []);
      } finally { setLoading(false); }
    })();
  }, [slug, meetingSlug, navigate]);

  const selected = useMemo(
    () => meetingSlug ? meetingTypes.find((m) => m.slug === meetingSlug) : null,
    [meetingSlug, meetingTypes],
  );

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (notFound) return <div className="min-h-screen grid place-items-center"><Card><CardContent className="p-8">Booking page not found.</CardContent></Card></div>;
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="container max-w-4xl mx-auto space-y-6">
        <HeaderCard profile={profile} />
        {selected ? (
          <BookingFlow slug={slug!} meetingType={selected} profile={profile} onBack={() => navigate(`/book/${slug}`)} />
        ) : (
          <MeetingPicker slug={slug!} meetingTypes={meetingTypes} />
        )}
      </div>
    </div>
  );
}

function HeaderCard({ profile }: { profile: Profile }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        {profile.profile_photo && (
          <img src={profile.profile_photo} alt="" className="h-16 w-16 rounded-full object-cover border" />
        )}
        <div className="flex-1 min-w-0">
          <CardTitle>{profile.full_name}</CardTitle>
          {profile.designation && <p className="text-sm text-muted-foreground">{profile.designation}</p>}
          {profile.company_name && (
            <div className="flex items-center gap-2 mt-1">
              {profile.company_logo && <img src={profile.company_logo} alt="" className="h-5 w-auto max-w-[80px] object-contain" />}
              <span className="text-xs text-muted-foreground">{profile.company_name}</span>
            </div>
          )}
        </div>
      </CardHeader>
      {profile.short_bio && <CardContent className="text-sm text-muted-foreground">{profile.short_bio}</CardContent>}
    </Card>
  );
}

function MeetingPicker({ slug, meetingTypes }: { slug: string; meetingTypes: MeetingType[] }) {
  if (meetingTypes.length === 0) {
    return <Card><CardContent className="p-6 text-muted-foreground">No meeting types available.</CardContent></Card>;
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Choose a meeting type</CardTitle></CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2">
        {meetingTypes.map((m) => (
          <a key={m.id} href={`/book/${slug}/${m.slug}`} className="block">
            <div className="flex items-center justify-between p-4 rounded-lg border hover:border-primary hover:shadow-sm transition">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: m.color_code ?? "#3B82F6" }} />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{m.meeting_name}</div>
                  {m.description && <div className="text-xs text-muted-foreground truncate">{m.description}</div>}
                </div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{m.slot_duration_minutes} min</Badge>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

function BookingFlow({
  slug, meetingType, profile, onBack,
}: { slug: string; meetingType: MeetingType; profile: Profile; onBack: () => void }) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<any>(null);

  const windowDays = meetingType.booking_window_days ?? 30;
  const minDate = new Date(); minDate.setHours(0,0,0,0);
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + windowDays);

  useEffect(() => {
    setSelectedSlot(null);
    if (!date) { setSlots([]); return; }
    setLoadingSlots(true);
    callFn({
      action: "available_slots",
      slug,
      meeting_type_id: meetingType.id,
      date: format(date, "yyyy-MM-dd"),
    })
      .then((d) => setSlots((d.slots ?? []).map((s: string) => s.slice(0,5))))
      .catch((e) => { toast.error(e.message || "Failed to load slots"); setSlots([]); })
      .finally(() => setLoadingSlots(false));
  }, [date, meetingType.id, slug]);

  if (confirmation) {
    return <ConfirmationCard confirmation={confirmation} meetingType={meetingType} onReset={() => { setConfirmation(null); setDate(undefined); setSelectedSlot(null); }} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: meetingType.color_code ?? "#3B82F6" }} />
              {meetingType.meeting_name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3 inline mr-1" />
              {meetingType.slot_duration_minutes} min
              {meetingType.requires_approval ? " · Approval required" : ""}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onBack}>Change</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[auto_1fr]">
        <div>
          <Label className="text-xs text-muted-foreground">Select a date</Label>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(d) => d < minDate || d > maxDate}
            className={cn("p-3 pointer-events-auto rounded-md border mt-1")}
          />
        </div>
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">
            {date ? `Available times — ${format(date, "EEE, MMM d")}` : "Pick a date to see times"}
          </Label>
          {!date ? (
            <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">Select a date on the left.</div>
          ) : loadingSlots ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : slots.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">No availability on this date.</div>
          ) : selectedSlot ? (
            <VisitorForm
              slug={slug}
              meetingType={meetingType}
              date={date}
              startTime={selectedSlot}
              onCancel={() => setSelectedSlot(null)}
              onBooked={setConfirmation}
            />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto">
              {slots.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => setSelectedSlot(s)}>{s}</Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VisitorForm({
  slug, meetingType, date, startTime, onCancel, onBooked,
}: {
  slug: string; meetingType: MeetingType; date: Date; startTime: string;
  onCancel: () => void; onBooked: (c: any) => void;
}) {
  const [form, setForm] = useState({ full_name: "", email: "", mobile_number: "", company_name: "", designation: "", purpose: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.full_name.trim()) return toast.error("Name is required");
    if (!form.email.trim()) return toast.error("Email is required");
    if (!form.mobile_number.trim()) return toast.error("Mobile number is required");
    setBusy(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const data = await callFn({
        action: "create_booking",
        slug,
        meeting_type_id: meetingType.id,
        date: format(date, "yyyy-MM-dd"),
        start_time: startTime,
        visitor: {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          mobile_number: form.mobile_number.trim(),
          company_name: form.company_name.trim() || undefined,
          designation: form.designation.trim() || undefined,
        },
        visitor_timezone: tz,
        purpose: form.purpose.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      onBooked({ ...data, date, start_time: startTime });
    } catch (e: any) {
      toast.error(e.message || "Booking failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 border rounded-md p-4">
      <div className="text-sm font-medium">
        {format(date, "EEE, MMM d")} · {startTime}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Mobile *</Label><Input value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} /></div>
        <div><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Purpose</Label><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Back</Button>
        <Button onClick={submit} disabled={busy}>{busy ? "Booking…" : "Confirm booking"}</Button>
      </div>
    </div>
  );
}

function ConfirmationCard({ confirmation, meetingType, onReset }: { confirmation: any; meetingType: MeetingType; onReset: () => void }) {
  const status = confirmation.status ?? (meetingType.requires_approval ? "pending" : "confirmed");
  return (
    <Card>
      <CardContent className="p-8 text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
        <div className="text-lg font-semibold">
          {status === "pending" ? "Request submitted" : "Booking confirmed"}
        </div>
        <p className="text-sm text-muted-foreground">
          {format(confirmation.date, "EEEE, MMMM d, yyyy")} at {confirmation.start_time}
        </p>
        {status === "pending" && (
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your request is awaiting host approval. You'll receive an email once it's reviewed.
          </p>
        )}
        <Button variant="outline" onClick={onReset} className="mt-4">Book another time</Button>
      </CardContent>
    </Card>
  );
}
