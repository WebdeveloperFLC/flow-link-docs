import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { OFFER_FUNDING_LABELS, OFFER_FUNDING_SOURCES, type OfferFundingSource } from "@/lib/offers/lifecycle";
import { toast } from "sonner";
import { Loader2, Sparkles, Save } from "lucide-react";

interface AiDraft {
  title?: string;
  description?: string;
  offer_category?: string;
  discount_type?: string;
  discount_value?: number;
  promo_code?: string;
  target_countries?: string[];
  valid_days?: number;
  whatsapp_copy?: string;
  email_subject?: string;
  email_body?: string;
  counselor_talking_points?: string;
  terms_conditions?: string;
}

export default function PerformanceOfferAiStudio() {
  const { loading, hasRole } = useAuth();
  const { canEdit, loading: permLoading } = useModulePermission("offers_ai");
  const allowed = canEdit || hasRole(["admin", "administrator"]);
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("prospective students");
  const [country, setCountry] = useState("");
  const [serviceLine, setServiceLine] = useState("");
  const [discountHint, setDiscountHint] = useState("10% coaching enrolment");
  const [funding, setFunding] = useState<OfferFundingSource>("future_link");
  const [tone, setTone] = useState("professional");
  const [extra, setExtra] = useState("");
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/performance/offers" replace />;

  async function generate() {
    if (!goal.trim()) {
      toast.error("Describe the campaign goal");
      return;
    }
    setGenerating(true);
    setDraft(null);
    try {
      const { data, error } = await supabase.functions.invoke("offer-ai-studio", {
        body: { goal, audience, country, service_line: serviceLine, discount_hint: discountHint, funding, tone, extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      setDraft((data?.draft ?? null) as AiDraft | null);
      setGenerationId(data?.generation_id ?? null);
      if (!data?.draft) toast.error("No draft returned");
      else toast.success("AI draft ready — review before saving to library");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    if (!draft?.title) return;
    setSaving(true);
    const validTo = draft.valid_days
      ? new Date(Date.now() + draft.valid_days * 86400000).toISOString().slice(0, 10)
      : null;
    const { data, error } = await supabase.from("offers").insert({
      title: draft.title,
      description: draft.description ?? null,
      offer_category: draft.offer_category ?? null,
      discount_type: draft.discount_type ?? "percentage",
      discount_value: draft.discount_value ?? 0,
      promo_code: draft.promo_code ?? null,
      target_countries: draft.target_countries ?? [],
      terms_conditions: draft.terms_conditions ?? null,
      funding_source: funding,
      status: "draft",
      audience: "global",
      valid_to: validTo,
      distribution_channels: ["whatsapp", "email", "counselor_desk"],
    }).select("id").single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (generationId && data?.id) {
      await supabase.from("offer_ai_generations").update({ offer_id: data.id }).eq("id", generationId);
    }
    toast.success("Saved as draft offer — submit for review in Library");
  }

  return (
    <AppLayout>
      <PerformanceHubHeader
        title="AI Offer Studio"
        subtitle="L1 — AI drafts, human review & publish. Counselors use L0 suggestions on client records only."
      />
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <OffersStudioNav />
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-600" />
            <Badge variant="outline">MarCom / Admin · L1</Badge>
          </div>
          <div>
            <Label>Campaign goal</Label>
            <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} placeholder="e.g. Boost June IELTS enrolments at Mumbai branch" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Audience</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} />
            </div>
            <div>
              <Label>Country focus</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Service line</Label>
              <Input value={serviceLine} onChange={(e) => setServiceLine(e.target.value)} placeholder="e.g. IELTS coaching" />
            </div>
            <div>
              <Label>Discount hint</Label>
              <Input value={discountHint} onChange={(e) => setDiscountHint(e.target.value)} />
            </div>
            <div>
              <Label>Funding</Label>
              <Select value={funding} onValueChange={(v) => setFunding(v as OfferFundingSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OFFER_FUNDING_SOURCES.map((f) => (
                    <SelectItem key={f} value={f}>{OFFER_FUNDING_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="urgent">Urgent / limited time</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Extra instructions</Label>
            <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2} placeholder="Optional constraints" />
          </div>
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
            Generate draft
          </Button>
        </Card>

        {draft && (
          <Card className="p-5 space-y-4 border-violet-500/30">
            <h2 className="font-semibold">Review AI draft</h2>
            <div className="text-sm space-y-2">
              <p><strong>{draft.title}</strong></p>
              <p className="text-muted-foreground">{draft.description}</p>
              <p>
                {draft.discount_type === "percentage" ? `${draft.discount_value}% off` : `₹${draft.discount_value} off`}
                {draft.promo_code ? ` · code ${draft.promo_code}` : ""}
              </p>
              {draft.whatsapp_copy && (
                <div className="rounded bg-muted p-3 text-xs whitespace-pre-wrap">
                  <div className="font-semibold mb-1">WhatsApp</div>
                  {draft.whatsapp_copy}
                </div>
              )}
              {draft.counselor_talking_points && (
                <div className="rounded bg-muted p-3 text-xs whitespace-pre-wrap">
                  <div className="font-semibold mb-1">Counselor talking points</div>
                  {draft.counselor_talking_points}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveDraft} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                Save to library as draft
              </Button>
              <Button variant="outline" asChild>
                <Link to="/performance/offers/library">Open library</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
