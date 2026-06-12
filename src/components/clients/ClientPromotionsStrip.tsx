import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Sparkles, Wallet } from "lucide-react";
import { ClientOffersPanel } from "@/components/clients/ClientOffersPanel";
import { formatInr, currentPeriodKey } from "@/lib/performanceHubTheme";

interface ClientPromotionsStripProps {
  clientId: string;
  clientName?: string;
}

/** Phase 5B — in-context promotions: offers panel + wallet headroom + Give Discount deep link */
export function ClientPromotionsStrip({ clientId, clientName }: ClientPromotionsStripProps) {
  const { user } = useAuth();
  const period = currentPeriodKey();
  const [spendable, setSpendable] = useState<number | null>(null);
  const [potential, setPotential] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: wallets } = await supabase.rpc("fn_counselor_wallets_for_period", {
        _period_key: period,
        _client_id: clientId,
        _lead_id: null,
      });
      const rows = (wallets ?? []) as { id: string; unlocked_amount?: number; potential_wallet?: number; budget_kind?: string }[];
      const personal = rows.find((w) => (w.budget_kind ?? "personal") === "personal") ?? rows[0];
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

  const giveDiscountUrl = `/performance/give-discount?client=${clientId}`;

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
                  {potential != null && potential > 0 && (
                    <> of {formatInr(potential)} potential</>
                  )}
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

      <Card className="p-4 border border-dashed border-violet-500/40 bg-muted/30">
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="shrink-0 text-violet-700 border-violet-500/30">
            Suggested (L0)
          </Badge>
          <div className="text-sm space-y-2">
            <p className="font-medium">48-hour enrolment incentive — 10% off IELTS coaching</p>
            <p className="text-muted-foreground text-xs">
              Rules-based suggestion (not auto-sent). Accept when ready — Phase 5D adds live eligibility.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled title="Phase 5D">
                Accept &amp; send
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link to={giveDiscountUrl}>Adjust amount</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="size-4" />
        <span>Active offers &amp; attach from library</span>
      </div>

      <ClientOffersPanel clientId={clientId} />
    </div>
  );
}
