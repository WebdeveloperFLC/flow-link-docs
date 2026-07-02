import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Ticket } from "lucide-react";

interface OfferLite {
  id: string;
  title: string;
  promo_code: string | null;
}

interface CounselorLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface PerformanceOfferCodesGeneratePanelProps {
  offers: OfferLite[];
  counselors: CounselorLite[];
  selectedOfferId: string;
  selectedCounselorId: string;
  generating?: boolean;
  canEdit?: boolean;
  onOfferChange: (id: string) => void;
  onCounselorChange: (id: string) => void;
  onGenerate: () => void;
}

export function PerformanceOfferCodesGeneratePanel({
  offers,
  counselors,
  selectedOfferId,
  selectedCounselorId,
  generating,
  canEdit,
  onOfferChange,
  onCounselorChange,
  onGenerate,
}: PerformanceOfferCodesGeneratePanelProps) {
  if (!canEdit) return null;

  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex items-center gap-2 mb-2">
        <Ticket className="size-5" style={{ color: "var(--blue)" }} />
        <h2 className="text-lg font-semibold ph-heading">Generate counselor tracking code</h2>
      </div>
      <p className="text-sm ph-muted mb-4">
        Unique per offer + counselor — idempotent via existing RPC. Master promo codes are set on the offer record in
        the library.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
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
        <Button onClick={onGenerate} disabled={generating || !selectedOfferId || !selectedCounselorId}>
          {generating ? <Loader2 className="size-4 animate-spin mr-2" /> : <Ticket className="size-4 mr-2" />}
          Generate code
        </Button>
      </div>
    </Card>
  );
}
