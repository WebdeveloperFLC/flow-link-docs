import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCalendarProfile, useUpsertProfile } from "../hooks/useCalendarData";
import { bookingUrl, generateSlug } from "../lib/calendarApi";
import { useState } from "react";

export function BookingLinkCard() {
  const { data: profile } = useCalendarProfile();
  const upsert = useUpsertProfile();
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const url = bookingUrl(profile.booking_slug);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Booking link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={url} readOnly className="font-mono text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("Booking link copied");
            }}
          >
            <Copy className="size-4 mr-1.5" /> Copy
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open(url, "_blank")}>
            <ExternalLink className="size-4 mr-1.5" /> Open
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const next = await generateSlug(profile.full_name || profile.booking_slug);
                await upsert.mutateAsync({ booking_slug: next });
                toast.success(`New slug: ${next}`);
              } catch (e: any) {
                toast.error(e.message || "Failed to regenerate");
              } finally {
                setBusy(false);
              }
            }}
          >
            <RefreshCw className="size-4 mr-1.5" /> Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}