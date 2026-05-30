import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tag, Check, Clock } from "lucide-react";

type O = {
  id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  promo_code: string | null;
  valid_to: string | null;
  currency?: string | null;
};
type Off = { id: string; status: string; offer: O };

function discountText(o: O): string {
  return o.discount_type === "percentage" ? `${o.discount_value}% OFF` : `${o.currency || "$"} ${o.discount_value} OFF`;
}
function isExpired(off: Off): boolean {
  if (off.status === "expired") return true;
  if (off.offer?.valid_to && new Date(off.offer.valid_to) < new Date()) return true;
  return false;
}

export default function PortalOffers() {
  return <PortalLayout render={({ clientId }) => (clientId ? <Inner clientId={clientId} /> : null)} />;
}
function Inner({ clientId }: { clientId: string }) {
  const [offers, setOffers] = useState<Off[]>([]);
  const [eligible, setEligible] = useState<O[]>([]);
  const [code, setCode] = useState("");
  const load = async () => {
    const { data } = await supabase.from("client_offers").select("id,status,offer:offers(*)").eq("client_id", clientId);
    setOffers((data ?? []) as Off[]);
    // Offers visible via RLS (global + group + individual targeting, date-windowed)
    const { data: e } = await supabase.from("offers").select("*");
    setEligible((e ?? []) as O[]);
  };
  useEffect(() => {
    load();
  }, [clientId]);

  const apply = async () => {
    if (!code.trim()) return;
    const { data: offer, error } = await supabase
      .from("offers")
      .select("id,is_active,valid_to")
      .eq("promo_code", code.trim())
      .maybeSingle();
    if (error || !offer) {
      toast.error("Invalid promo code");
      return;
    }
    if (!offer.is_active) {
      toast.error("Offer no longer active");
      return;
    }
    if (offer.valid_to && new Date(offer.valid_to) < new Date()) {
      toast.error("Offer expired");
      return;
    }
    const { error: insErr } = await supabase.from("client_offers").insert({ client_id: clientId, offer_id: offer.id });
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    toast.success("Offer applied");
    setCode("");
    load();
  };

  // Derive the three states from the existing data (no new fetch).
  const claimedIds = new Set(offers.map((x) => x.offer?.id).filter(Boolean));
  const activeClaims = offers.filter((off) => off.status === "active" && !isExpired(off));
  const usedClaims = offers.filter((off) => off.status === "used");
  const expiredClaims = offers.filter((off) => isExpired(off) && off.status !== "used");
  // Available = eligible offers the client hasn't already claimed.
  const available = eligible.filter((o) => !claimedIds.has(o.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offers & Discounts</h1>
      </div>
      <Card className="p-4 flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter promo code" />
        <Button onClick={apply}>Apply</Button>
      </Card>

      {offers.length === 0 && eligible.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">No offers yet.</Card>
      )}

      {/* Active — claimed offers still valid */}
      {activeClaims.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <h2 className="font-semibold">Active</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {activeClaims.map((off) => (
              <Card key={off.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="size-5 text-primary" />
                    <h3 className="font-semibold">{off.offer.title}</h3>
                  </div>
                  <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded">
                    {discountText(off.offer)}
                  </span>
                </div>
                {off.offer.description && <p className="text-sm text-muted-foreground mt-2">{off.offer.description}</p>}
                {off.offer.promo_code && (
                  <div className="mt-3 text-xs">
                    Code: <span className="font-mono font-bold">{off.offer.promo_code}</span>
                  </div>
                )}
                {off.offer.valid_to && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Valid till {new Date(off.offer.valid_to).toLocaleDateString()}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Available — eligible but not yet claimed */}
      {available.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-primary" />
            <h2 className="font-semibold">Available</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {available.map((o) => (
              <Card key={o.id} className="p-5 border-dashed">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="size-5 text-primary" />
                    <h3 className="font-semibold">{o.title}</h3>
                  </div>
                  <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded">
                    {discountText(o)}
                  </span>
                </div>
                {o.description && <p className="text-sm text-muted-foreground mt-2">{o.description}</p>}
                {o.promo_code && (
                  <div className="mt-3 text-xs">
                    Code: <span className="font-mono font-bold">{o.promo_code}</span>
                  </div>
                )}
                {o.valid_to && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Valid till {new Date(o.valid_to).toLocaleDateString()}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Claimed — offers marked used */}
      {usedClaims.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Check className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">Claimed</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {usedClaims.map((off) => (
              <Card key={off.id} className="p-5 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="size-5 text-muted-foreground" />
                    <h3 className="font-semibold">{off.offer.title}</h3>
                  </div>
                  <span className="text-sm font-bold bg-muted text-muted-foreground px-3 py-1 rounded">
                    {discountText(off.offer)}
                  </span>
                </div>
                {off.offer.description && <p className="text-sm text-muted-foreground mt-2">{off.offer.description}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Expired — past validity or expired status */}
      {expiredClaims.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">Expired</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {expiredClaims.map((off) => (
              <Card key={off.id} className="p-5 opacity-60">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="size-5 text-muted-foreground" />
                    <h3 className="font-semibold line-through">{off.offer.title}</h3>
                  </div>
                  <span className="text-sm font-bold bg-muted text-muted-foreground px-3 py-1 rounded">
                    {discountText(off.offer)}
                  </span>
                </div>
                {off.offer.valid_to && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Expired {new Date(off.offer.valid_to).toLocaleDateString()}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
