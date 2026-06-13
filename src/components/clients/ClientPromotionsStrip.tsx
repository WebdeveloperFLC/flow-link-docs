import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Sparkles, Wallet } from "lucide-react";
import { ClientOffersPanel } from "@/components/clients/ClientOffersPanel";
import { OFFER_FUNDING_LABELS, type OfferFundingSource } from "@/lib/offers/lifecycle";
import { formatInr, currentPeriodKey } from "@/lib/performanceHubTheme";

interface ClientPromotionsStripProps {
  clientId: string;
  clientName?: string;
}

interface Suggestion {
  found: boolean;
  offer_id?: string;
  title?: string;
  discount_type?: string;
  discount_value?: number;
  funding_source?: string;
  reason?: string;
  wallet_unlocked?: number;
  wallet_potential?: number;
}

function personalWallet(
  rows: { id: string; unlocked_amount?: number; potential_wallet?: number; budget_kind?: string }[],
) {
  return (
    rows.find((w) => w.budget_kind === "month_to_month" || w.budget_kind === "personal") ?? rows[0]
  );
}

/** Phase 5B/5C — in-context promotions: offers panel + wallet headroom + live L0 suggestion */
export function ClientPromotionsStrip({ clientId, clientName }: ClientPromotionsStripProps) {
  const { user } = useAuth();
  const period = currentPeriodKey();
  const [spendable, setSpendable] = useState<number | null>(null);
  const [potential, setPotential] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: wallets } = await supabase.rpc("fn_counselor_wallets_for_period", {
        _period_key: period,
        _client_id: clientId,
        _lead_id: null,
      });
      const rows = (wallets ?? []) as {
        id: string;
        unlocked_amount?: number;
        potential_wallet?: number;
        budget_kind?: string;
      }[];
      const personal = personalWallet(rows);
      if (!personal) {
        setSpendable(null);
        setPotential(null);
        return;
      }
      const { data: wa } = await supabase
        .from("wallet_allocations")
        .select("amount")
        .eq("wallet_id", personal.id)
        .eq("status", "applied");
      const spent = ((wa ?? []) as { amount: number }[]).reduce((s, a) => s + Number(a.amount ?? 0), 0);
      const unlocked = Number(personal.unlocked_amount ?? 0);
      setSpendable(Math.max(unlocked - spent, 0));
      setPotential(Number(personal.potential_wallet ?? 0));
    })();
  }, [user?.id, clientId, period]);

  useEffect(() => {
    if (!user) return;
    setSuggestionLoading(true);
    supabase.rpc("fn_suggest_offer_for_client", { _client_id: clientId }).then(({ data }) => {
      setSuggestion((data as Suggestion) ?? { found: false });
      setSuggestionLoading(false);
    });
  }, [user?.id, clientId]);

  const giveDiscountUrl = `/performance/give-discount?client=${clientId}`;
  const suggestUrl = suggestion?.offer_id
    ? `${giveDiscountUrl}&offer=${suggestion.offer_id}`
    : giveDiscountUrl;

  return (
    <div className="space-y-4">
      <Card className="p-4 border-l-4 border-l-violet-500 bg-violet-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-4 text-violet-600" />
              <h3 className="font-semibold">Promotions &amp; discounts</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {clientName ? `${clientName} · ` : ""}
              {spendable != null ? (
                <>
                  Wallet headroom:{" "}
                  <span className="font-medium text-foreground">{formatInr(spendable)}</span> spendable
                  {potential != null && potential > 0 && <> of {formatInr(potential)} potential</>}
                </>
              ) : (
                "No wallet this period — university-funded offers may still apply."
              )}
            </p>
          </div>
          <Button asChild className="shrink-0 gap-2">
            <Link to={giveDiscountUrl}>
              <Gift className="size-4" /> Give discount
            </Link>
          </Button>
        </div>
      </Card>

      {suggestionLoading ? (
        <Card className="p-4 border border-dashed text-sm text-muted-foreground">Loading suggestion…</Card>
      ) : suggestion?.found ? (
        <Card className="p-4 border border-dashed border-violet-500/40 bg-muted/30">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="shrink-0 text-violet-700 border-violet-500/30">
              Suggested (L0)
            </Badge>
            <div className="text-sm space-y-2">
              <p className="font-medium">
                {suggestion.title}
                {suggestion.discount_value != null && (
                  <>
                    {" "}
                    —{" "}
                    {suggestion.discount_type === "percentage"
                      ? `${suggestion.discount_value}%`
                      : formatInr(suggestion.discount_value)}
                  </>
                )}
              </p>
              <p className="text-muted-foreground text-xs">{suggestion.reason}</p>
              {suggestion.funding_source && (
                <p className="text-xs text-muted-foreground">
                  Funding:{" "}
                  {OFFER_FUNDING_LABELS[(suggestion.funding_source as OfferFundingSource) ?? "future_link"]}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link to={suggestUrl}>Use suggestion</Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to={giveDiscountUrl}>Adjust amount</Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 border border-dashed text-sm text-muted-foreground">
          No rules-based offer suggestion for this client right now.
        </Card>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="size-4" />
        <span>Active offers &amp; attach from library</span>
      </div>

      <ClientOffersPanel clientId={clientId} />
    </div>
  );
}
