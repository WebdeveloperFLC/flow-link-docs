import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PublicBookingPage() {
  const { slug, meetingSlug } = useParams<{ slug: string; meetingSlug?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [meetingTypes, setMeetingTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      let { data: prof } = await (supabase as any)
        .from("calendar_profiles")
        .select("*")
        .eq("booking_slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!prof) {
        const { data: hist } = await (supabase as any)
          .from("calendar_slug_history")
          .select("new_slug")
          .eq("scope", "profile")
          .eq("old_slug", slug)
          .order("changed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (hist?.new_slug) { navigate(`/book/${hist.new_slug}${meetingSlug ? "/" + meetingSlug : ""}`, { replace: true }); return; }
        setNotFound(true); setLoading(false); return;
      }
      setProfile(prof);
      const { data: mts } = await (supabase as any)
        .from("calendar_meeting_types")
        .select("*")
        .eq("user_id", prof.user_id)
        .eq("is_active", true);
      setMeetingTypes(mts ?? []);
      setLoading(false);
    })();
  }, [slug, meetingSlug, navigate]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (notFound) return <div className="p-8 text-center">Booking page not found.</div>;

  const selected = meetingSlug ? meetingTypes.find((m) => m.slug === meetingSlug) : null;

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            {profile.profile_photo && <img src={profile.profile_photo} className="h-16 w-16 rounded-full object-cover" alt="" />}
            <div>
              <CardTitle>{profile.full_name}</CardTitle>
              {profile.designation && <p className="text-sm text-muted-foreground">{profile.designation}</p>}
              {profile.company_name && (
                <div className="flex items-center gap-2 mt-1">
                  {profile.company_logo && <img src={profile.company_logo} className="h-5 w-5 object-contain" alt="" />}
                  <span className="text-xs text-muted-foreground">{profile.company_name}</span>
                </div>
              )}
            </div>
          </CardHeader>
          {profile.short_bio && <CardContent><p className="text-sm">{profile.short_bio}</p></CardContent>}
        </Card>

        {selected ? (
          <Card>
            <CardHeader><CardTitle>{selected.meeting_name}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>{selected.description}</div>
              <div className="text-xs text-muted-foreground">
                {selected.slot_duration_minutes} min · {selected.category ?? "Meeting"}{selected.requires_approval ? " · Approval required" : ""}
              </div>
              <p className="mt-4 text-muted-foreground">Booking form coming soon. Contact host directly.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Choose a meeting type</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              {meetingTypes.map((m) => (
                <a key={m.id} href={`/book/${slug}/${m.slug}`} className="block">
                  <div className="flex items-center justify-between p-3 rounded-md border hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: m.color_code ?? "#3B82F6" }} />
                      <span className="font-medium text-sm">{m.meeting_name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{m.slot_duration_minutes} min</Badge>
                  </div>
                </a>
              ))}
              {meetingTypes.length === 0 && <p className="text-muted-foreground text-sm">No meeting types available.</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}