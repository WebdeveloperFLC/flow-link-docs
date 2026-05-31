import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCalendarProfile } from "../hooks/useCalendarData";
import {
  useMeetingTypesFull,
  useCreateMeetingType,
  useUpdateMeetingType,
  useDeleteMeetingTypeFull,
} from "../hooks/useMeetingTypes";
import {
  buildBookingUrl,
  isValidSlug,
  slugify,
  suggestMeetingSlug,
} from "../lib/slugUtils";
import { useAuth } from "@/contexts/AuthContext";
import { MEETING_CATEGORIES, type MeetingType } from "../lib/calendarTypes";
import { DURATION_OPTIONS, BUFFER_OPTIONS } from "../lib/calendarTypes";

type Form = {
  meeting_name: string;
  slug: string;
  description: string;
  slot_duration_minutes: number;
  buffer_minutes: number;
  booking_window_days: number;
  reservation_ttl_minutes: number;
  requires_approval: boolean;
  category: string;
  color_code: string;
  is_active: boolean;
};

const emptyForm: Form = {
  meeting_name: "",
  slug: "",
  description: "",
  slot_duration_minutes: 30,
  buffer_minutes: 0,
  booking_window_days: 30,
  reservation_ttl_minutes: 10,
  requires_approval: false,
  category: "Consultation",
  color_code: "#3B82F6",
  is_active: true,
};

export default function MeetingTypesPage() {
  const { user } = useAuth();
  const { data: profile } = useCalendarProfile();
  const { data: meetingTypes = [], isLoading } = useMeetingTypesFull();
  const createMt = useCreateMeetingType();
  const updateMt = useUpdateMeetingType();
  const deleteMt = useDeleteMeetingTypeFull();

  const [editing, setEditing] = useState<MeetingType | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setOpen(true);
  };
  const openEdit = (mt: MeetingType) => {
    setEditing(mt);
    setForm({
      meeting_name: mt.meeting_name,
      slug: mt.slug,
      description: mt.description ?? "",
      slot_duration_minutes: mt.slot_duration_minutes,
      buffer_minutes: mt.buffer_minutes,
      booking_window_days: mt.booking_window_days,
      reservation_ttl_minutes: mt.reservation_ttl_minutes,
      requires_approval: mt.requires_approval,
      category: mt.category ?? "Consultation",
      color_code: mt.color_code ?? "#3B82F6",
      is_active: mt.is_active,
    });
    setSlugTouched(true);
    setOpen(true);
  };

  const updateName = (name: string) => {
    setForm((f) => ({
      ...f,
      meeting_name: name,
      slug: slugTouched ? f.slug : slugify(name),
    }));
  };

  const submit = async () => {
    if (!form.meeting_name.trim()) return toast.error("Name required");
    if (!isValidSlug(form.slug)) return toast.error("Slug must be lowercase letters, numbers and hyphens");
    try {
      // Auto-resolve slug conflict
      const collides = meetingTypes.find(
        (m) => m.slug === form.slug && m.id !== editing?.id,
      );
      let slug = form.slug;
      if (collides && user) {
        slug = await suggestMeetingSlug(user.id, form.slug);
        toast.info(`Slug taken — using "${slug}"`);
      }
      if (editing) {
        await updateMt.mutateAsync({ id: editing.id, patch: { ...form, slug } });
        toast.success("Meeting type updated");
      } else {
        await createMt.mutateAsync({ ...form, slug });
        toast.success("Meeting type created");
      }
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  const remove = async (mt: MeetingType) => {
    if (!confirm(`Delete "${mt.meeting_name}"?`)) return;
    try {
      await deleteMt.mutateAsync(mt.id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const copyLink = (mt: MeetingType) => {
    if (!profile?.booking_slug) return toast.error("Set your booking slug first");
    const url = buildBookingUrl(profile.booking_slug, mt.slug);
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meeting Types</h1>
            <p className="text-sm text-muted-foreground">
              Manage independent meeting types and their booking links.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> New meeting type
          </Button>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6">Loading…</CardContent></Card>
        ) : meetingTypes.length === 0 ? (
          <Card><CardContent className="p-6 text-muted-foreground">No meeting types yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {meetingTypes.map((mt) => (
              <Card key={mt.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full border"
                        style={{ background: mt.color_code ?? "#3B82F6" }}
                      />
                      <CardTitle className="text-base">{mt.meeting_name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      {!mt.is_active && <Badge variant="secondary">Inactive</Badge>}
                      {mt.requires_approval && <Badge>Approval</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {mt.slot_duration_minutes}m · Buffer {mt.buffer_minutes}m · {mt.category ?? "—"}
                  </div>
                  {profile?.booking_slug && (
                    <div className="flex items-center gap-2 text-xs">
                      <code className="px-2 py-1 bg-muted rounded truncate flex-1">
                        /book/{profile.booking_slug}/{mt.slug}
                      </code>
                      <Button size="sm" variant="ghost" onClick={() => copyLink(mt)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(mt)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(mt)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit meeting type" : "New meeting type"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={form.meeting_name} onChange={(e) => updateName(e.target.value)} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }); }}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Duration</Label>
                  <Select
                    value={String(form.slot_duration_minutes)}
                    onValueChange={(v) => setForm({ ...form, slot_duration_minutes: Number(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Buffer</Label>
                  <Select
                    value={String(form.buffer_minutes)}
                    onValueChange={(v) => setForm({ ...form, buffer_minutes: Number(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUFFER_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Booking window (days)</Label>
                  <Input
                    type="number" min={1} max={365}
                    value={form.booking_window_days}
                    onChange={(e) => setForm({ ...form, booking_window_days: Number(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEETING_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reservation hold (min)</Label>
                  <Input
                    type="number" min={1} max={120}
                    value={form.reservation_ttl_minutes}
                    onChange={(e) => setForm({ ...form, reservation_ttl_minutes: Number(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input type="color" value={form.color_code} onChange={(e) => setForm({ ...form, color_code: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium text-sm">Requires approval</div>
                  <div className="text-xs text-muted-foreground">Bookings stay pending until you confirm.</div>
                </div>
                <Switch checked={form.requires_approval} onCheckedChange={(v) => setForm({ ...form, requires_approval: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium text-sm">Active</div>
                  <div className="text-xs text-muted-foreground">Visible on your booking page.</div>
                </div>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createMt.isPending || updateMt.isPending}>
                {editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}