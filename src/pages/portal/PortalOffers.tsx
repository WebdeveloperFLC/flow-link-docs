import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tag } from "lucide-react";

type O = { id: string; title: string; description: string|null; discount_type: string; discount_value: number; promo_code: string|null; valid_to: string|null };
type Off = { id: string; status: string; offer: O };

export default function PortalOffers() {
  return <PortalLayout render={({ clientId }) => clientId ? <Inner clientId={clientId}/> : null}/>;
}
function Inner({ clientId }: { clientId: string }) {
  const [offers, setOffers] = useState<Off[]>([]);
  const [eligible, setEligible] = useState<O[]>([]);
  const [code, setCode] = useState("");
  const load = async () => {
    const { data } = await supabase.from("client_offers").select("id,status,offer:offers(*)").eq("client_id", clientId);
    setOffers((data ?? []) as Off[]);
    // Offers visible via RLS (global + group + individual targeting)
    const { data: e } = await supabase.from("offers").select("*").eq("is_active", true);
    setEligible((e ?? []) as O[]);
  };
  useEffect(() => { load(); }, [clientId]);

  const apply = async () => {
    if (!code.trim()) return;
    const { data: offer, error } = await supabase.from("offers").select("id,is_active,valid_to").eq("promo_code", code.trim()).maybeSingle();
    if (error || !offer) { toast.error("Invalid promo code"); return; }
    if (!offer.is_active) { toast.error("Offer no longer active"); return; }
    if (offer.valid_to && new Date(offer.valid_to) < new Date()) { toast.error("Offer expired"); return; }
    const { error: insErr } = await supabase.from("client_offers").insert({ client_id: clientId, offer_id: offer.id });
    if (insErr) { toast.error(insErr.message); return; }
    toast.success("Offer applied"); setCode(""); load();
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Offers & Discounts</h1></div>
      <Card className="p-4 flex gap-2">
        <Input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Enter promo code"/>
        <Button onClick={apply}>Apply</Button>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        {offers.length === 0 && eligible.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground md:col-span-2">No offers yet.</Card>}
        {eligible.filter((o) => !offers.some((x) => x.offer?.id === o.id)).map((o) => (
          <Card key={o.id} className="p-5 border-dashed">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2"><Tag className="size-5 text-primary"/><h3 className="font-semibold">{o.title}</h3></div>
              <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded">
                {o.discount_type === "percentage" ? `${o.discount_value}% OFF` : `$${o.discount_value} OFF`}
              </span>
            </div>
            {o.description && <p className="text-sm text-muted-foreground mt-2">{o.description}</p>}
            {o.promo_code && <div className="mt-3 text-xs">Code: <span className="font-mono font-bold">{o.promo_code}</span></div>}
            {o.valid_to && <div className="text-xs text-muted-foreground mt-1">Valid till {new Date(o.valid_to).toLocaleDateString()}</div>}
          </Card>
        ))}
        {offers.map((o) => (
          <Card key={o.id} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2"><Tag className="size-5 text-primary"/><h3 className="font-semibold">{o.offer.title}</h3></div>
              <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded">
                {o.offer.discount_type === "percentage" ? `${o.offer.discount_value}% OFF` : `$${o.offer.discount_value} OFF`}
              </span>
            </div>
            {o.offer.description && <p className="text-sm text-muted-foreground mt-2">{o.offer.description}</p>}
            {o.offer.promo_code && <div className="mt-3 text-xs">Code: <span className="font-mono font-bold">{o.offer.promo_code}</span></div>}
            {o.offer.valid_to && <div className="text-xs text-muted-foreground mt-1">Valid till {new Date(o.offer.valid_to).toLocaleDateString()}</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}
