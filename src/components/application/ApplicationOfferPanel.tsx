import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { updateApplicationOffer } from "@/lib/application/applicationApi";
import {
  OFFER_STATUS_LABELS,
  OFFER_TYPE_LABELS,
} from "@/lib/application/constants";
import {
  APPLICATION_OFFER_STATUSES,
  APPLICATION_OFFER_TYPES,
  type ApplicationOffer,
  type ApplicationOfferStatus,
  type ApplicationOfferType,
} from "@/lib/application/types";

type Props = {
  applicationId: string;
  offer: ApplicationOffer | null;
  canEdit: boolean;
  loading: boolean;
  onChanged: () => Promise<void>;
};

const NONE_TYPE = "__none__";

export function ApplicationOfferPanel({
  applicationId,
  offer,
  canEdit,
  loading,
  onChanged,
}: Props) {
  const [offerType, setOfferType] = useState<string>(NONE_TYPE);
  const [offerStatus, setOfferStatus] = useState<ApplicationOfferStatus>("NONE");
  const [offerNumber, setOfferNumber] = useState("");
  const [offerDate, setOfferDate] = useState("");
  const [offerExpiryDate, setOfferExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!offer) return;
    setOfferType(offer.offerType ?? NONE_TYPE);
    setOfferStatus(offer.offerStatus);
    setOfferNumber(offer.offerNumber ?? "");
    setOfferDate(offer.offerDate ?? "");
    setOfferExpiryDate(offer.offerExpiryDate ?? "");
    setNotes(offer.notes ?? "");
  }, [offer]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateApplicationOffer({
        applicationId,
        offerType: offerType === NONE_TYPE ? null : (offerType as ApplicationOfferType),
        offerStatus,
        offerNumber: offerNumber.trim() || null,
        offerDate: offerDate || null,
        offerExpiryDate: offerExpiryDate || null,
        notes: notes.trim() || null,
      });
      toast.success("Offer information saved");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div>
        <div className="font-medium flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          Offer Information
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Offer type and offer status are tracked separately. Updating status to Received or Accepted
          sets the offer-received milestone when not already recorded.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading offer…
        </div>
      ) : !offer ? (
        <div className="text-sm text-muted-foreground">No offer record.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Offer type</Label>
            <Select
              value={offerType}
              onValueChange={setOfferType}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_TYPE}>Not set</SelectItem>
                {APPLICATION_OFFER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {OFFER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Offer status</Label>
            <Select
              value={offerStatus}
              onValueChange={(v) => setOfferStatus(v as ApplicationOfferStatus)}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_OFFER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {OFFER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Offer number</Label>
            <Input
              value={offerNumber}
              onChange={(e) => setOfferNumber(e.target.value)}
              disabled={!canEdit}
              placeholder="Institution offer reference"
            />
          </div>

          <div className="space-y-2">
            <Label>Offer date</Label>
            <Input
              type="date"
              value={offerDate}
              onChange={(e) => setOfferDate(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Offer expiry</Label>
            <Input
              type="date"
              value={offerExpiryDate}
              onChange={(e) => setOfferExpiryDate(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit}
              rows={2}
              placeholder="Conditions, acceptance deadline reminders, etc."
            />
          </div>
        </div>
      )}

      {canEdit && offer && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            Save offer
          </Button>
        </div>
      )}
    </Card>
  );
}
