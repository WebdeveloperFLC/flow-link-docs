import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgreements, useRenewalCountdown, renewalThreshold } from "../hooks/useInstitutionData";

function CountdownChip({ validTo }: { validTo?: string | null }) {
  const days = useRenewalCountdown(validTo);
  const threshold = renewalThreshold(days);
  if (days == null) return <Badge variant="secondary">No expiry</Badge>;
  if (days < 0) return <Badge variant="destructive">Expired {Math.abs(days)}d ago</Badge>;
  const tone = threshold && threshold <= 60 ? "destructive" : threshold && threshold <= 120 ? "default" : "secondary";
  return <Badge variant={tone as any}>{days}d to renewal</Badge>;
}

export function AgreementsPanel({ institutionId }: { institutionId: string }) {
  const { data: agreements, loading } = useAgreements(institutionId);

  const sorted = useMemo(
    () => [...agreements].sort((a: any, b: any) => (a.valid_to ?? "").localeCompare(b.valid_to ?? "")),
    [agreements],
  );

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading agreements…</div>;
  if (sorted.length === 0)
    return <div className="text-sm text-muted-foreground py-8 text-center">No agreements yet. Upload an Agreement document to auto-create one.</div>;

  return (
    <div className="space-y-3">
      {sorted.map((a: any) => {
        const ext = a.extracted_data ?? {};
        const countries = Array.isArray(ext.countries_allowed) ? ext.countries_allowed.join(", ") : "—";
        return (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{a.title}</span>
                  <Badge variant="outline">{a.agreement_type}</Badge>
                  <Badge>{a.status}</Badge>
                  <CountdownChip validTo={a.valid_to} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {a.valid_from ?? "?"} → {a.valid_to ?? "?"} · Countries: {countries}
                </div>
                {ext.ai_summary && (
                  <div className="text-sm mt-2 bg-muted/40 rounded p-2 border border-border/50">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">AI summary</span>
                    {ext.ai_summary}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                  {ext.governing_law && <Item label="Governing law" value={ext.governing_law} />}
                  {ext.claim_deadline_days != null && <Item label="Claim deadline" value={`${ext.claim_deadline_days}d`} />}
                  {ext.invoice_deadline_days != null && <Item label="Invoice deadline" value={`${ext.invoice_deadline_days}d`} />}
                  {ext.termination_notice_days != null && <Item label="Termination notice" value={`${ext.termination_notice_days}d`} />}
                  {ext.sub_agent_allowed != null && <Item label="Sub-agent" value={ext.sub_agent_allowed ? "Allowed" : "No"} />}
                  {ext.b2b_allowed != null && <Item label="B2B" value={ext.b2b_allowed ? "Allowed" : "No"} />}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
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