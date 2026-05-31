import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, RefreshCw, Share2 } from "lucide-react";
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
            variant="outline"
            onClick={async () => {
              const shareData = { title: `Book a meeting with ${profile.full_name}`, text: `Book a meeting with ${profile.full_name}`, url };
              if (typeof navigator !== "undefined" && (navigator as any).share) {
                try { await (navigator as any).share(shareData); return; } catch { /* user cancelled */ }
              }
              navigator.clipboard.writeText(url);
              toast.success("Link copied — share it anywhere");
            }}
          >
            <Share2 className="size-4 mr-1.5" /> Share
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