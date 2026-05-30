import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Loader2, Check, Clock, Ban } from "lucide-react";
import { toast } from "sonner";

interface OfferRow {
  id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  promo_code: string | null;
  valid_from: string | null;
  valid_to: string | null;
  applicable_services: string[] | null;
  audience: string;
  target_countries: string[] | null;
  currency: string | null;
}

interface ClientOfferRow {
  id: string;
  status: "active" | "used" | "expired";
  used_at: string | null;
  source: string | null;
  offer: OfferRow | null;
}

function discountLabel(o: OfferRow): string {
  const cur = o.currency || "INR";
  return o.discount_type === "percentage"
    ? `${o.discount_value}% OFF`
    : `${cur} ${o.discount_value} OFF`;
}

function StatusBadge({ status }: { status: ClientOfferRow["status"] }) {
  if (status === "used") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Check className="size-3" /> Claimed
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Ban className="size-3" /> Expired
      </Badge>
    );
  }
  return (
    <Badge className="gap-1">
      <Clock className="size-3" /> Active
    </Badge>
  );
}

export function ClientOffersPanel({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [eligible, setEligible] = useState<OfferRow[]>([]);
  const [attached, setAttached] = useState<ClientOfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [attaching, setAttaching] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: co, error: coErr } = await supabase
        .from("client_offers")
        .select("id,status,used_at,source,offer:offers(*)")
        .eq("client_id", clientId);
      if (coErr) throw coErr;
      const attachedRows = (co ?? []) as unknown as ClientOfferRow[];
      setAttached(attachedRows);

      const { data: elig, error: eligErr } = await supabase.rpc(
        "offers_eligible_for_client",
        { _client_id: clientId }
      );
      if (eligErr) throw eligErr;
      const attachedIds = new Set(
        attachedRows.map((r) => r.offer?.id).filter(Boolean)
      );
      setEligible(
        ((elig ?? []) as OfferRow[]).filter((o) => !attachedIds.has(o.id))
      );

      try {
        await supabase.rpc("log_offer_event", {
          _offer_id: null,
          _client_id: clientId,
          _counselor_id: user?.id ?? null,
          _event_type: "viewed",
          _channel: "staff_panel",
        });
      } catch {
        /* analytics must never block the panel */
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [clientId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const attach = async (offer: OfferRow) => {
    setAttaching(offer.id);
    try {
      const { error } = await supabase.from("client_offers").insert({
        client_id: clientId,
        offer_id: offer.id,
        source: "counselor",
        attached_by: user?.id ?? null,
      });
      if (error) throw error;

      try {
        await supabase.rpc("log_offer_event", {
          _offer_id: offer.id,
          _client_id: clientId,
          _counselor_id: user?.id ?? null,
          _event_type: "claimed",
          _channel: "staff_panel",
        });
      } catch {
        /* ignore */
      }

      toast.success(`Offer "${offer.title}" attached to client`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to attach offer";
      toast.error(
        /duplicate|unique/i.test(msg)
          ? "This offer is already attached"
          : msg
      );
    } finally {
      setAttaching(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="size-4 text-primary" />
          <h3 className="font-semibold">Attached offers</h3>
        </div>
        {loading ? (
          <Card className="p-6 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Loading…
          </Card>
        ) : attached.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No offers attached to this client yet.
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {attached.map((row) =>
              row.offer ? (
                <Card key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium">{row.offer.title}</h4>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-primary">
                    {discountLabel(row.offer)}
                  </div>
                  {row.offer.promo_code ? (
                    <div className="mt-2 text-xs">
                      Code:{" "}
                      <span className="font-mono font-bold">
                        {row.offer.promo_code}
                      </span>
                    </div>
                  ) : null}
                  {row.offer.valid_to ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      Valid till{" "}
                      {new Date(row.offer.valid_to).toLocaleDateString()}
                    </div>
                  ) : null}
                  {row.source ? (
                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                      Source: {row.source}
                    </div>
                  ) : null}
                </Card>
              ) : null
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Plus className="size-4 text-primary" />
          <h3 className="font-semibold">Available to attach</h3>
        </div>
        {loading ? null : eligible.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No additional offers this client is eligible for.
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {eligible.map((o) => (
              <Card key={o.id} className="p-4 border-dashed">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium">{o.title}</h4>
                  <span className="text-sm font-bold bg-primary/10 text-primary px-2.5 py-1 rounded whitespace-nowrap">
                    {discountLabel(o)}
                  </span>
                </div>
                {o.description ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    {o.description}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="capitalize text-xs">
                    {o.audience}
                  </Badge>
                  {(o.target_countries ?? []).map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
                {o.valid_to ? (
                  <div className="text-xs text-muted-foreground mt-2">
                    Valid till {new Date(o.valid_to).toLocaleDateString()}
                  </div>
                ) : null}
                <Button
                  size="sm"
                  className="mt-3 w-full gap-1"
                  disabled={attaching === o.id}
                  onClick={() => attach(o)}
                >
                  {attaching === o.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Attach to client
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}