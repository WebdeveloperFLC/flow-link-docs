import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Save, Sparkles, Upload, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PROFILE_FIELDS } from "@/lib/extractedFields";
import { dialCodeFor } from "@/lib/countryCodes";

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
  const [primaryPhone, setPrimaryPhone] = useState<string>("");
  const [primaryPhoneEdit, setPrimaryPhoneEdit] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string>("");
  const [countryCodeEdit, setCountryCodeEdit] = useState<string | null>(null);
  const [education, setEducation] = useState<Array<Record<string, unknown>>>([]);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: clientRow }, { data: edu }] = await Promise.all([
      supabase.from("client_profile").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("clients").select("phone, country_code, country").eq("id", clientId).maybeSingle(),
      supabase.from("client_education").select("*").eq("client_id", clientId).order("end_year", { ascending: false }),
    ]);
    setProfile(data as Record<string, unknown> | null);
    setPrimaryPhone(clientRow?.phone ?? "");
    setPrimaryPhoneEdit(null);
    setCountryCode((clientRow as { country_code?: string } | null)?.country_code ?? "");
    setCountryCodeEdit(null);
    setEducation((edu as Array<Record<string, unknown>>) ?? []);
    setEdits({});
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sourceMapRaw =
    (profile?.source_documents as Record<string, string | { file_name: string; document_type?: string | null }> | undefined) ?? {};
  const sourceMap: Record<string, string> = Object.fromEntries(
    Object.entries(sourceMapRaw).map(([k, v]) => [k, typeof v === "string" ? v : v?.file_name ?? ""]),
  );

  const valFor = (k: string): string => {
    if (k in edits) return edits[k];
    const v = profile?.[k];
    if (v === null || v === undefined) return "";
    return String(v);
  };

  const dirty = Object.keys(edits).length > 0 || primaryPhoneEdit !== null || countryCodeEdit !== null;

  // Auto-suggest country code when address_country / nationality changes and
  // the user hasn't explicitly set one yet.
  useEffect(() => {
    if (countryCode || countryCodeEdit !== null) return;
    const candidate = (edits.address_country as string | undefined)
      ?? (profile?.address_country as string | undefined)
      ?? (edits.nationality as string | undefined)
      ?? (profile?.nationality as string | undefined);
    const cc = dialCodeFor(candidate);
    if (cc) setCountryCodeEdit(cc);
  }, [edits.address_country, edits.nationality, profile, countryCode, countryCodeEdit]);

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
      if (primaryPhoneEdit !== null) {
        const { error: phErr } = await supabase
          .from("clients")
          .update({ phone: primaryPhoneEdit || null } as never)
          .eq("id", clientId);
        if (phErr) throw phErr;
      }
      if (countryCodeEdit !== null) {
        const cleaned = countryCodeEdit.replace(/\D/g, "") || null;
        const { error: ccErr } = await supabase
          .from("clients")
          .update({ country_code: cleaned } as never)
          .eq("id", clientId);
        if (ccErr) throw ccErr;
      }
      toast.success("Profile saved");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const removeEducation = async (id: string) => {
    const { error } = await supabase.from("client_education").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEducation((prev) => prev.filter((e) => e.id !== id));
  };

  const addEducation = async () => {
    const { data, error } = await supabase
      .from("client_education")
      .insert({ client_id: clientId, degree: "", institution: "" } as never)
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setEducation((prev) => [data as Record<string, unknown>, ...prev]);
  };

  const updateEducationField = async (id: string, field: string, value: string) => {
    const v = value === "" ? null : (field === "start_year" || field === "end_year" ? Number(value) : value);
    setEducation((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: v } : e)));
    const { error } = await supabase.from("client_education").update({ [field]: v } as never).eq("id", id);
    if (error) toast.error(error.message);
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
          <>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g.title}</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.title === "Contact & address" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Country code</Label>
                      <div className="flex gap-1.5">
                        <Input
                          value={countryCodeEdit ?? countryCode}
                          readOnly={!canEdit}
                          onChange={(e) => setCountryCodeEdit(e.target.value.replace(/[^\d]/g, ""))}
                          placeholder="e.g. 1, 91, 44"
                          className="h-8 text-sm w-24"
                        />
                        <span className="text-[10px] text-muted-foreground self-center">
                          dialed without “+”
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Phone (primary)</Label>
                      <Input
                        value={primaryPhoneEdit ?? primaryPhone}
                        readOnly={!canEdit}
                        onChange={(e) => setPrimaryPhoneEdit(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </>
                )}
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
          ))}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Education history</div>
              {canEdit && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addEducation}>
                  <Plus className="size-3.5 mr-1" /> Add
                </Button>
              )}
            </div>
            {education.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No qualifications captured yet. Upload a resume or transcript, or add manually.</div>
            ) : (
              <div className="space-y-2">
                {education.map((e) => (
                  <div key={String(e.id)} className="rounded-lg border p-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-2 relative">
                    <Input className="h-8 text-sm" placeholder="Degree" value={String(e.degree ?? "")} readOnly={!canEdit}
                      onChange={(ev) => updateEducationField(String(e.id), "degree", ev.target.value)} />
                    <Input className="h-8 text-sm" placeholder="Field of study" value={String(e.field_of_study ?? "")} readOnly={!canEdit}
                      onChange={(ev) => updateEducationField(String(e.id), "field_of_study", ev.target.value)} />
                    <Input className="h-8 text-sm" placeholder="Institution" value={String(e.institution ?? "")} readOnly={!canEdit}
                      onChange={(ev) => updateEducationField(String(e.id), "institution", ev.target.value)} />
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm" type="number" placeholder="Start" value={e.start_year ? String(e.start_year) : ""} readOnly={!canEdit}
                        onChange={(ev) => updateEducationField(String(e.id), "start_year", ev.target.value)} />
                      <Input className="h-8 text-sm" type="number" placeholder="End" value={e.end_year ? String(e.end_year) : ""} readOnly={!canEdit}
                        onChange={(ev) => updateEducationField(String(e.id), "end_year", ev.target.value)} />
                    </div>
                    <Input className="h-8 text-sm sm:col-span-2" placeholder="GPA / %" value={String(e.gpa_or_percentage ?? "")} readOnly={!canEdit}
                      onChange={(ev) => updateEducationField(String(e.id), "gpa_or_percentage", ev.target.value)} />
                    <Input className="h-8 text-sm" placeholder="Level" value={String(e.level ?? "")} readOnly={!canEdit}
                      onChange={(ev) => updateEducationField(String(e.id), "level", ev.target.value)} />
                    <div className="flex items-center justify-between gap-2">
                      {e.source_file_name && (
                        <div className="text-[10px] text-muted-foreground truncate" title={`From ${e.source_file_name}`}>
                          ✨ {String(e.source_file_name)}
                        </div>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="size-7 ml-auto" onClick={() => removeEducation(String(e.id))}>
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </Card>
  );
};