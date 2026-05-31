import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCalendarProfile, useUpsertProfile } from "../hooks/useCalendarData";
import { COMMON_TIMEZONES } from "../lib/calendarTypes";
import { generateSlug, slugify } from "../lib/calendarApi";
import { ImageUploader } from "./ImageUploader";
import { Pencil } from "lucide-react";

export function ProfileSettingsCard() {
  const { data: profile, isLoading } = useCalendarProfile();
  const upsert = useUpsertProfile();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState({
    full_name: "",
    designation: "",
    company_name: "",
    profile_photo: "",
    company_logo: "",
    short_bio: "",
    booking_slug: "",
    timezone: "UTC",
    location: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        designation: profile.designation ?? "",
        company_name: profile.company_name ?? "",
        profile_photo: profile.profile_photo ?? "",
        company_logo: profile.company_logo ?? "",
        short_bio: profile.short_bio ?? "",
        booking_slug: profile.booking_slug ?? "",
        timezone: profile.timezone ?? "UTC",
        location: profile.location ?? "",
      });
      setMode("view");
    } else if (!isLoading) {
      setForm((f) => ({ ...f, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }));
      setMode("edit");
    }
  }, [profile, isLoading]);

  const onAutoSlug = async () => {
    try {
      const next = await generateSlug(form.full_name || "user");
      setForm((f) => ({ ...f, booking_slug: next }));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onSave = async () => {
    if (!form.full_name.trim()) return toast.error("Full name is required");
    if (!form.timezone) return toast.error("Timezone is required");
    const slug = slugify(form.booking_slug);
    if (!slug) return toast.error("Booking slug is required");
    try {
      await upsert.mutateAsync({
        full_name: form.full_name.trim(),
        designation: form.designation || null,
        company_name: form.company_name || null,
        profile_photo: form.profile_photo || null,
        company_logo: form.company_logo || null,
        short_bio: form.short_bio || null,
        booking_slug: slug,
        timezone: form.timezone,
        location: form.location || null,
      } as any);
      toast.success("Profile saved");
      setMode("view");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  const cancelEdit = () => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        designation: profile.designation ?? "",
        company_name: profile.company_name ?? "",
        profile_photo: profile.profile_photo ?? "",
        company_logo: profile.company_logo ?? "",
        short_bio: profile.short_bio ?? "",
        booking_slug: profile.booking_slug ?? "",
        timezone: profile.timezone ?? "UTC",
        location: profile.location ?? "",
      });
    }
    setMode("view");
  };

  if (mode === "view" && profile) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Booking profile</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setMode("edit")}>
            <Pencil className="size-3.5 mr-1.5" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col items-center text-center space-y-3 pb-2 border-b">
            {form.company_logo && (
              <img src={form.company_logo} alt="Company logo" className="h-12 object-contain" />
            )}
            {form.company_name && (
              <div className="text-sm font-medium text-muted-foreground">{form.company_name}</div>
            )}
            {form.profile_photo ? (
              <img
                src={form.profile_photo}
                alt={form.full_name}
                className="h-32 w-32 rounded-md object-cover border"
              />
            ) : (
              <div className="h-32 w-32 rounded-md bg-muted border" />
            )}
            <div>
              <div className="text-lg font-semibold">{form.full_name || "—"}</div>
              {form.designation && (
                <div className="text-sm text-muted-foreground">{form.designation}</div>
              )}
            </div>
            {form.short_bio && (
              <p className="text-sm text-muted-foreground max-w-md whitespace-pre-wrap">{form.short_bio}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Location</div>
              <div>{form.location || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Timezone</div>
              <div>{form.timezone}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Booking slug</div>
              <code className="text-xs bg-muted px-2 py-1 rounded">{form.booking_slug || "—"}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{profile ? "Edit booking profile" : "Booking profile"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUploader
            value={form.profile_photo || null}
            onChange={(url) => setForm({ ...form, profile_photo: url ?? "" })}
            kind="profile"
            label="Profile photo"
          />
          <ImageUploader
            value={form.company_logo || null}
            onChange={(url) => setForm({ ...form, company_logo: url ?? "" })}
            kind="logo"
            label="Company logo"
            aspect="wide"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Display name *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Designation</Label>
            <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </div>
          <div>
            <Label>Company</Label>
            <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label>Timezone *</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Booking page slug *</Label>
            <div className="flex gap-2">
              <Input
                value={form.booking_slug}
                onChange={(e) => setForm({ ...form, booking_slug: e.target.value })}
                placeholder="your-name"
              />
              <Button type="button" variant="outline" onClick={onAutoSlug}>Auto</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lowercase letters, numbers, hyphens only.</p>
          </div>
          <div className="md:col-span-2">
            <Label>Booking page intro</Label>
            <Textarea value={form.short_bio} onChange={(e) => setForm({ ...form, short_bio: e.target.value })} rows={3} />
            <p className="text-xs text-muted-foreground mt-1">Shown on your public booking page.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {profile && (
            <Button variant="outline" onClick={cancelEdit} disabled={upsert.isPending}>Cancel</Button>
          )}
          <Button onClick={onSave} disabled={upsert.isPending}>Save profile</Button>
        </div>
      </CardContent>
    </Card>
  );
}