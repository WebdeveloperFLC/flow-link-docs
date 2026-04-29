import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Save, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { PROFILE_FIELDS } from "@/lib/extractedFields";

interface Props {
  clientId: string;
  canEdit: boolean;
  onReExtract?: () => Promise<void>;
  reExtracting?: boolean;
  onSyncOdoo?: () => Promise<void>;
  syncingOdoo?: boolean;
  refreshKey?: number;
}

const GROUPS: { title: string; fields: { key: typeof PROFILE_FIELDS[number]; label: string; type?: "date" | "number" }[] }[] = [
  {
    title: "Identity",
    fields: [
      { key: "date_of_birth", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender" },
      { key: "nationality", label: "Nationality" },
      { key: "place_of_birth", label: "Place of birth" },
      { key: "marital_status", label: "Marital status" },
      { key: "spouse_name", label: "Spouse name" },
    ],
  },
  {
    title: "Passport",
    fields: [
      { key: "passport_number", label: "Passport number" },
      { key: "passport_country", label: "Passport country" },
      { key: "passport_issue_date", label: "Issue date", type: "date" },
      { key: "passport_expiry", label: "Expiry date", type: "date" },
    ],
  },
  {
    title: "Contact & address",
    fields: [
      { key: "phone_alt", label: "Alt phone" },
      { key: "email_alt", label: "Alt email" },
      { key: "address_line1", label: "Address" },
      { key: "address_city", label: "City" },
      { key: "address_state", label: "State" },
      { key: "address_country", label: "Country" },
      { key: "address_postal", label: "Postal code" },
    ],
  },
  {
    title: "Education & language",
    fields: [
      { key: "highest_qualification", label: "Highest qualification" },
      { key: "institution_name", label: "Institution" },
      { key: "graduation_year", label: "Graduation year", type: "number" },
      { key: "gpa_or_percentage", label: "GPA / %" },
      { key: "ielts_overall", label: "IELTS overall", type: "number" },
      { key: "ielts_listening", label: "IELTS L", type: "number" },
      { key: "ielts_reading", label: "IELTS R", type: "number" },
      { key: "ielts_writing", label: "IELTS W", type: "number" },
      { key: "ielts_speaking", label: "IELTS S", type: "number" },
      { key: "ielts_test_date", label: "IELTS test date", type: "date" },
    ],
  },
  {
    title: "Employment & finance",
    fields: [
      { key: "employer_name", label: "Employer" },
      { key: "job_title", label: "Job title" },
      { key: "annual_income", label: "Annual income", type: "number" },
      { key: "currency", label: "Currency" },
      { key: "bank_name", label: "Bank" },
      { key: "account_balance", label: "Account balance", type: "number" },
      { key: "gic_amount", label: "GIC amount", type: "number" },
      { key: "tuition_paid", label: "Tuition paid", type: "number" },
    ],
  },
  {
    title: "Emergency",
    fields: [
      { key: "emergency_contact_name", label: "Contact name" },
      { key: "emergency_contact_phone", label: "Contact phone" },
    ],
  },
];

export const ClientProfileCard = ({ clientId, canEdit, onReExtract, reExtracting, onSyncOdoo, syncingOdoo, refreshKey }: Props) => {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("client_profile").select("*").eq("client_id", clientId).maybeSingle();
    setProfile(data as Record<string, unknown> | null);
    setEdits({});
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sourceMap = (profile?.source_documents as Record<string, string> | undefined) ?? {};

  const valFor = (k: string): string => {
    if (k in edits) return edits[k];
    const v = profile?.[k];
    if (v === null || v === undefined) return "";
    return String(v);
  };

  const dirty = Object.keys(edits).length > 0;

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(edits)) {
        if (v === "") payload[k] = null;
        else if (["graduation_year", "annual_income", "account_balance", "gic_amount", "tuition_paid",
                  "ielts_overall", "ielts_listening", "ielts_reading", "ielts_writing", "ielts_speaking"].includes(k)) {
          const n = Number(v);
          payload[k] = Number.isFinite(n) ? n : null;
        } else {
          payload[k] = v;
        }
      }
      if (profile) {
        const { error } = await supabase.from("client_profile").update(payload as never).eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_profile").insert({ client_id: clientId, ...payload } as never);
        if (error) throw error;
      }
      toast.success("Profile saved");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-1.5">
            <Sparkles className="size-4 text-secondary" /> Client profile (CRM)
          </div>
          <div className="text-xs text-muted-foreground">
            Auto-extracted from uploaded documents · editable
            {profile?.last_extracted_at && (
              <span> · updated {new Date(String(profile.last_extracted_at)).toLocaleString()}</span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {onReExtract && (
              <Button variant="outline" size="sm" onClick={onReExtract} disabled={reExtracting}>
                {reExtracting ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="size-3.5 mr-1.5" />}
                Re-extract
              </Button>
            )}
            {onSyncOdoo && (
              <Button variant="outline" size="sm" onClick={onSyncOdoo} disabled={syncingOdoo}>
                {syncingOdoo ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Upload className="size-3.5 mr-1.5" />}
                Sync to Odoo
              </Button>
            )}
            {dirty && (
              <Button size="sm" onClick={save} disabled={saving} className="gradient-brand text-primary-foreground">
                {saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Save className="size-3.5 mr-1.5" />}
                Save
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="p-6 space-y-5">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          GROUPS.map((g) => (
            <div key={g.title}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g.title}</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.fields.map((f) => {
                  const src = sourceMap[f.key];
                  return (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
                      <Input
                        value={valFor(f.key)}
                        type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                        step="any"
                        readOnly={!canEdit}
                        onChange={(e) => setEdits((p) => ({ ...p, [f.key]: e.target.value }))}
                        className="h-8 text-sm"
                      />
                      {src && (
                        <div className="text-[10px] text-muted-foreground truncate" title={`Auto-extracted from ${src}`}>
                          ✨ {src}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};