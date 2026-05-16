import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCampaigns } from "../hooks/useInstitutionData";

export function CampaignsPanel({ institutionId }: { institutionId: string }) {
  const { data: campaigns, loading } = useCampaigns(institutionId);

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading campaigns…</div>;
  if (campaigns.length === 0)
    return <Card className="p-8 text-center text-sm text-muted-foreground">No campaigns yet.</Card>;

  return (
    <div className="space-y-2">
      {campaigns.map((c: any) => (
        <Card key={c.id} className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{c.name ?? c.channel}</span>
                <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : (c.status ?? "Inactive")}</Badge>
                {c.channel && <Badge variant="outline">{c.channel}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {c.period_from ?? "?"} → {c.period_to ?? "?"} · Countries: {(c.target_countries ?? []).join(", ") || "—"}
              </div>
              {c.bonus_logic && <div className="text-sm mt-2">{c.bonus_logic}</div>}
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                {c.claim_impact && <Item label="Claim impact" value={c.claim_impact} />}
                {c.renewal_impact && <Item label="Renewal impact" value={c.renewal_impact} />}
              </div>
              {c.generated_content && (
                <div className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 mt-2 border-t pt-2">{c.generated_content}</div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}