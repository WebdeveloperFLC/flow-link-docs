import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useModulePermission } from "@/hooks/useModulePermission";
import { useMasterLabels } from "@/lib/masters";
import {
  OFFER_DISTRIBUTION_CHANNELS,
  OFFER_FUNDING_LABELS,
  OFFER_FUNDING_SOURCES,
  type OfferFundingSource,
} from "@/lib/offers/lifecycle";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

const STEPS = ["Basics", "Scope", "Funding & dates", "Channels", "Review"];

interface WizardForm {
  title: string;
  description: string;
  offer_category: string;
  discount_type: string;
  discount_value: number;
  promo_code: string;
  audience: string;
  target_countries: string[];
  applicable_services: string[];
  funding_source: OfferFundingSource;
  fl_contribution_pct: number;
  university_contribution_pct: number;
  valid_from: string;
  valid_to: string;
  per_client_limit: number;
  max_redemptions: number | null;
  distribution_channels: string[];
}

const initialForm: WizardForm = {
  title: "",
  description: "",
  offer_category: "",
  discount_type: "percentage",
  discount_value: 10,
  promo_code: "",
  audience: "global",
  target_countries: [],
  applicable_services: [],
  funding_source: "future_link",
  fl_contribution_pct: 50,
  university_contribution_pct: 50,
  valid_from: "",
  valid_to: "",
  per_client_limit: 1,
  max_redemptions: null,
  distribution_channels: ["counselor_desk", "portal"],
};

export default function PerformanceOfferWizard() {
  const navigate = useNavigate();
  const { loading, hasRole, user } = useAuth();
  const { canEdit, loading: permLoading } = useModulePermission("offers");
  const canEditOffers = canEdit || hasRole(["manager", "administrator"]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<{ id: string; service_name: string }[]>([]);
  const countryOptions = useMasterLabels("countries");

  useEffect(() => {
    import("@/lib/leads")
      .then(({ fetchAllServiceCatalogue }) => fetchAllServiceCatalogue())
      .then((items) =>
        setServiceOptions(items.map((s) => ({ id: s.service_code ?? s.id, service_name: s.service_name }))),
      )
      .catch(() => setServiceOptions([]));
  }, []);

  if (loading || permLoading) return null;
  if (!canEditOffers) return <Navigate to="/performance/offers" replace />;

  const toggleSet = (arr: string[], val: string, on: boolean) => {
    const s = new Set(arr);
    on ? s.add(val) : s.delete(val);
    return Array.from(s);
  };

  const validateStep = (): boolean => {
    if (step === 0 && !form.title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (step === 2 && form.funding_source === "joint") {
      const sum = form.fl_contribution_pct + form.university_contribution_pct;
      if (Math.abs(sum - 100) > 0.01) {
        toast.error("Joint funding shares must total 100%");
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const save = async () => {
    if (!validateStep()) return;
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        offer_category: form.offer_category.trim() || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        promo_code: form.promo_code.trim() || null,
        audience: form.audience,
        target_countries: form.target_countries,
        applicable_services: form.applicable_services,
        funding_source: form.funding_source,
        fl_contribution_pct:
          form.funding_source === "joint" ? form.fl_contribution_pct : form.funding_source === "future_link" ? 100 : null,
        university_contribution_pct:
          form.funding_source === "joint"
            ? form.university_contribution_pct
            : form.funding_source === "university"
              ? 100
              : null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        per_client_limit: form.per_client_limit,
        max_redemptions: form.max_redemptions,
        distribution_channels: form.distribution_channels,
        status: "draft" as const,
        created_by: user?.id ?? null,
      };
      const { error } = await supabase.from("offers").insert(payload).select("id").single();
      if (error) throw error;
      toast.success("Draft offer created — submit for review from the library");
      navigate("/performance/offers/library");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <PerformanceHubHeader title="Create offer" subtitle="5-step wizard — saves as draft for MarCom review" />
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <OffersStudioNav />
        <div className="flex gap-2 text-xs">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`px-2 py-1 rounded ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}
            >
              {i < step ? <Check className="inline size-3 mr-0.5" /> : null}
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <Card className="p-5 space-y-4">
          {step === 0 && (
            <>
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Category (optional)</Label>
                <Input
                  placeholder="e.g. IELTS push, Canada Sep intake"
                  value={form.offer_category}
                  onChange={(e) => setForm({ ...form, offer_category: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Discount type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat ₹</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Promo code</Label>
                  <Input value={form.promo_code} onChange={(e) => setForm({ ...form, promo_code: e.target.value })} />
                </div>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div>
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">All clients</SelectItem>
                    <SelectItem value="individual">Specific clients (set in library after save)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target countries (empty = all)</Label>
                <div className="max-h-36 overflow-y-auto border rounded p-2 space-y-1 mt-1">
                  {countryOptions.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.target_countries.includes(c)}
                        onChange={(e) =>
                          setForm({ ...form, target_countries: toggleSet(form.target_countries, c, e.target.checked) })
                        }
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Applicable services (empty = all)</Label>
                <div className="max-h-36 overflow-y-auto border rounded p-2 space-y-1 mt-1">
                  {serviceOptions.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.applicable_services.includes(s.id)}
                        onChange={(e) =>
                          setForm({ ...form, applicable_services: toggleSet(form.applicable_services, s.id, e.target.checked) })
                        }
                      />
                      {s.service_name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <Label>Funding source</Label>
                <Select
                  value={form.funding_source}
                  onValueChange={(v) => setForm({ ...form, funding_source: v as OfferFundingSource })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OFFER_FUNDING_SOURCES.map((f) => (
                      <SelectItem key={f} value={f}>{OFFER_FUNDING_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.funding_source === "joint" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>FL share %</Label>
                    <Input type="number" value={form.fl_contribution_pct} onChange={(e) => setForm({ ...form, fl_contribution_pct: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>University share %</Label>
                    <Input type="number" value={form.university_contribution_pct} onChange={(e) => setForm({ ...form, university_contribution_pct: Number(e.target.value) })} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Valid from</Label>
                  <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
                </div>
                <div>
                  <Label>Valid to</Label>
                  <Input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Per-client limit</Label>
                  <Input type="number" value={form.per_client_limit} onChange={(e) => setForm({ ...form, per_client_limit: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Max redemptions (optional)</Label>
                  <Input
                    type="number"
                    value={form.max_redemptions ?? ""}
                    onChange={(e) => setForm({ ...form, max_redemptions: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <div className="space-y-2">
              <Label>Distribution channels</Label>
              {OFFER_DISTRIBUTION_CHANNELS.map((ch) => (
                <label key={ch.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.distribution_channels.includes(ch.key)}
                    onChange={(e) =>
                      setForm({ ...form, distribution_channels: toggleSet(form.distribution_channels, ch.key, e.target.checked) })
                    }
                  />
                  {ch.label}
                </label>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="text-sm space-y-2">
              <p><strong>{form.title}</strong></p>
              <p className="text-muted-foreground">{form.description || "No description"}</p>
              <p>
                {form.discount_type === "percentage" ? `${form.discount_value}% off` : `₹${form.discount_value} off`}
                {form.promo_code ? ` · code ${form.promo_code}` : ""}
              </p>
              <p>Funding: {OFFER_FUNDING_LABELS[form.funding_source]}</p>
              <p>Countries: {form.target_countries.length ? form.target_countries.join(", ") : "All"}</p>
              <p>Services: {form.applicable_services.length ? `${form.applicable_services.length} selected` : "All"}</p>
              <p>Channels: {form.distribution_channels.map((c) => OFFER_DISTRIBUTION_CHANNELS.find((x) => x.key === c)?.label ?? c).join(", ")}</p>
              <p className="text-xs text-muted-foreground pt-2">Saved as <strong>draft</strong> — use Library → Submit for review → Approve → Activate.</p>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t">
            <Button variant="outline" onClick={back} disabled={step === 0}>
              <ChevronLeft className="size-4 mr-1" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Create draft offer"}
              </Button>
            )}
          </div>
        </Card>
        <Button variant="link" asChild className="px-0">
          <Link to="/performance/offers/library">Cancel — back to library</Link>
        </Button>
      </div>
    </AppLayout>
  );
}
