import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Ticket } from "lucide-react";

interface PerformanceNewOfferCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: { id: string; title: string; promo_code: string | null }[];
  counselors: { id: string; full_name: string | null; email: string | null }[];
  selectedOfferId: string;
  selectedCounselorId: string;
  generating?: boolean;
  onOfferChange: (id: string) => void;
  onCounselorChange: (id: string) => void;
  onGenerate: () => void;
}

export function PerformanceNewOfferCodeDialog({
  open,
  onOpenChange,
  offers,
  counselors,
  selectedOfferId,
  selectedCounselorId,
  generating,
  onOfferChange,
  onCounselorChange,
  onGenerate,
}: PerformanceNewOfferCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="size-5" style={{ color: "var(--blue)" }} />
            New offer code
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm ph-muted">
          Generate a counselor tracking code — prefix, scope and redemption limits follow the selected offer record.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs ph-muted">Offer</label>
            <Select value={selectedOfferId} onValueChange={onOfferChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select offer" />
              </SelectTrigger>
              <SelectContent>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.title}
                    {o.promo_code ? ` (${o.promo_code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs ph-muted">Counselor</label>
            <Select value={selectedCounselorId} onValueChange={onCounselorChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select counselor" />
              </SelectTrigger>
              <SelectContent>
                {counselors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || c.email || c.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={generating || !selectedOfferId || !selectedCounselorId}
            onClick={() => {
              onGenerate();
              onOpenChange(false);
            }}
          >
            {generating ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Generate code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
