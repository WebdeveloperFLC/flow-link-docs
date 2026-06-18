import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { LeadJourneyFieldsBlock } from "@/components/leads/LeadJourneyFields";
import { RegionCountriesPicker } from "@/components/leads/RegionCountriesPicker";
import { Textarea } from "@/components/ui/textarea";
import { appendClientActivityLog, diffRecordFields, formatFieldChanges } from "@/lib/clientActivityLog";
import { cn } from "@/lib/utils";

type JourneyProfile = {
  sponsor: string | null;
  sponsor_other: string | null;
  start_timeline: string | null;
  has_budget: string | null;
  budget_currency: string | null;
  budget_min: number | null;
  budget_max: number | null;
  interested_countries: string[];
  lead_source: string | null;
  counselor_notes: string | null;
};

const EMPTY: JourneyProfile = {
  sponsor: null,
  sponsor_other: null,
  start_timeline: null,
  has_budget: null,
  budget_currency: "INR",
  budget_min: null,
  budget_max: null,
  interested_countries: [],
  lead_source: null,
  counselor_notes: null,
};

export function ClientJourneyProfileSection({
  clientId,
  canEdit,
}: {
  clientId: string;
  canEdit: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<JourneyProfile>(EMPTY);

  const load = async () => {
    setLoading(true);
    const { data: row, error } = await supabase
      .from("client_profile")
      .select(
        "sponsor,sponsor_other,start_timeline,has_budget,budget_currency,budget_min,budget_max,interested_countries,lead_source,counselor_notes",
      )
      .eq("client_id", clientId)
      .maybeSingle();
    if (error) console.warn(error);
    if (row) {
      setData({
        sponsor: row.sponsor ?? null,
        sponsor_other: row.sponsor_other ?? null,
        start_timeline: row.start_timeline ?? null,
        has_budget: row.has_budget ?? null,
        budget_currency: row.budget_currency ?? "INR",
        budget_min: row.budget_min != null ? Number(row.budget_min) : null,
        budget_max: row.budget_max != null ? Number(row.budget_max) : null,
        interested_countries: (row.interested_countries as string[]) ?? [],
        lead_source: row.lead_source ?? null,
        counselor_notes: row.counselor_notes ?? null,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...data };
      const beforeSnapshot = { ...data };
      const { data: existing } = await supabase
        .from("client_profile")
        .select("client_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("client_profile").update(payload as never).eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_profile")
          .insert({ client_id: clientId, ...payload } as never);
        if (error) throw error;
      }
      await supabase
        .from("clients")
        .update({
          sponsor: data.sponsor,
          sponsor_other: data.sponsor_other,
          start_timeline: data.start_timeline,
          has_budget: data.has_budget,
          budget_currency: data.budget_currency,
          budget_min: data.budget_min,
          budget_max: data.budget_max,
          interested_countries: data.interested_countries,
          lead_source: data.lead_source,
          counselor_notes: data.counselor_notes,
        } as never)
        .eq("id", clientId);
      const changes = diffRecordFields(
        beforeSnapshot as Record<string, unknown>,
        payload as Record<string, unknown>,
        Object.keys(EMPTY),
      );
      if (changes.length) {
        const { previousValue, newValue } = formatFieldChanges(changes);
        await appendClientActivityLog({
          clientId,
          action: "profile_updated",
          summary: "Education & journey profile updated",
          previousValue,
          newValue,
        });
      }
      toast.success("Funding & timeline saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading journey details…
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Funding, timeline &amp; source</h3>
        {canEdit && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
            Save
          </Button>
        )}
      </div>
      <LeadJourneyFieldsBlock
        interestedCountries={data.interested_countries}
        value={{
          sponsor: data.sponsor,
          sponsor_other: data.sponsor_other,
          start_timeline: data.start_timeline,
          has_budget: data.has_budget,
          budget_currency: data.budget_currency ?? "INR",
          budget_min: data.budget_min,
          budget_max: data.budget_max,
        }}
        onChange={(patch) => setData((p) => ({ ...p, ...patch }))}
      />
      <div className={cn("space-y-1.5", !canEdit && "pointer-events-none opacity-60")}>
        <Label>Countries of Interest</Label>
        <RegionCountriesPicker
          value={data.interested_countries}
          onChange={(v) => setData((p) => ({ ...p, interested_countries: v }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Lead source</Label>
        <input
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={data.lead_source ?? ""}
          onChange={(e) => setData((p) => ({ ...p, lead_source: e.target.value || null }))}
          disabled={!canEdit}
          placeholder="e.g. Walk-in, Referral"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Counselor notes</Label>
        <Textarea
          rows={4}
          value={data.counselor_notes ?? ""}
          onChange={(e) => setData((p) => ({ ...p, counselor_notes: e.target.value || null }))}
          readOnly={!canEdit}
          placeholder="Internal notes — not visible to client"
        />
      </div>
    </Card>
  );
}
